import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { Product, Subscription } from '../types';

const CLIENT_SECRET_PATH = path.join(process.cwd(), 'config', 'client_secret.json');
const RESELLER_SCOPES = ['https://www.googleapis.com/auth/apps.order'];
const SPREADSHEET_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let cachedSheetsProducts: Product[] = [];
let lastSheetsFetchTime: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

export function getGoogleAuth(scopes: string[], subjectEmail?: string) {
  const targetSubject = subjectEmail || process.env.GOOGLE_ADMIN_SUBJECT_EMAIL;
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    if (fs.existsSync(CLIENT_SECRET_PATH)) {
      try {
        const keyFile = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
        clientEmail = keyFile.client_email;
        privateKey = keyFile.private_key;
      } catch (e) {
        // ignore
      }
    }
  }

  if (!clientEmail || !privateKey) {
    throw new Error('Google API credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.');
  }

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: scopes,
    subject: targetSubject
  });
}

/**
 * Fetches Google Workspace Customer details from Reseller API v1
 */
export async function getResellerCustomer(domain: string) {
  try {
    const auth = getGoogleAuth(RESELLER_SCOPES);
    const reseller = google.reseller({ version: 'v1', auth });
    const res = await reseller.customers.get({ customerId: domain });
    return { success: true, customer: res.data };
  } catch (error: any) {
    console.error(`[RESELLER API ERROR] Failed to fetch customer '${domain}':`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Lists active subscriptions for a customer domain from Reseller API v1
 */
export async function listResellerSubscriptions(domain: string): Promise<Subscription[]> {
  try {
    const auth = getGoogleAuth(RESELLER_SCOPES);
    const reseller = google.reseller({ version: 'v1', auth });
    const res = await reseller.subscriptions.list({ customerId: domain });
    const items = res.data.subscriptions || [];

    return items.map((sub: any) => ({
      subscriptionId: sub.subscriptionId || '',
      customerDomain: domain,
      skuId: sub.skuId || '',
      skuName: sub.skuName || sub.skuId || 'Google Workspace License',
      status: sub.status || 'ACTIVE',
      plan: {
        planName: sub.plan?.planName || 'FLEXIBLE'
      },
      seats: {
        numberOfSeats: sub.seats?.numberOfSeats,
        maximumNumberOfSeats: sub.seats?.maximumNumberOfSeats,
        licensedNumberOfSeats: sub.seats?.licensedNumberOfSeats
      },
      billingMethod: sub.billingMethod || '',
      creationTime: sub.creationTime
    }));
  } catch (error: any) {
    console.error(`[RESELLER SUBSCRIPTIONS ERROR] Failed to list subscriptions for domain '${domain}':`, error.message);
    return [];
  }
}

/**
 * Updates seat count for a customer subscription via Reseller API v1
 */
export async function updateResellerSeats(domain: string, subscriptionId: string, additionalSeats: number) {
  try {
    const auth = getGoogleAuth(RESELLER_SCOPES);
    const reseller = google.reseller({ version: 'v1', auth });

    const currentSub = await reseller.subscriptions.get({
      customerId: domain,
      subscriptionId: subscriptionId
    });

    const planName = currentSub.data.plan?.planName || 'FLEXIBLE';
    const attr = planName === 'ANNUAL' ? 'numberOfSeats' : 'maximumNumberOfSeats';
    const currentSeats = (currentSub.data.seats as any)?.[attr] || 0;
    const newTotal = currentSeats + additionalSeats;

    const res = await reseller.subscriptions.changeSeats({
      customerId: domain,
      subscriptionId: subscriptionId,
      requestBody: {
        [attr]: newTotal
      }
    });

    return { success: true, result: res.data, newTotal };
  } catch (error: any) {
    console.error(`[RESELLER SEAT UPDATE ERROR] Failed to update seats for ${domain}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches authentic product catalog and pricing from Google Sheets API v4
 */
export async function fetchLiveProductsFromSheets(): Promise<Product[]> {
  const now = Date.now();
  if (cachedSheetsProducts.length > 0 && (now - lastSheetsFetchTime) < CACHE_TTL_MS) {
    return cachedSheetsProducts;
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_CATALOG_ID || '';
  if (!spreadsheetId) {
    console.warn('[SHEETS API WARNING] No GOOGLE_SHEETS_SPREADSHEET_ID set in environment variables.');
    return cachedSheetsProducts;
  }

  try {
    const auth = getGoogleAuth(SPREADSHEET_SCOPES);
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'PRODUCTS!A1:Z500'
    });

    const rows = res.data.values || [];
    if (rows.length < 2) {
      console.warn('[SHEETS API] No rows found in PRODUCTS sheet.');
      return cachedSheetsProducts;
    }

    const products: Product[] = [];
    for (let idx = 1; idx < rows.length; idx++) {
      const row = rows[idx];
      if (row.length > 5) {
        const rawCode = row[10] || '';
        const code = (rawCode && rawCode !== 'TBD') ? rawCode : `PROD_${idx}`;
        const name = row[5] || `Product ${idx}`;
        const priceStr = (row[3] || '0').replace(/[^0-9.]/g, '');
        const price = parseFloat(priceStr) || 0;
        const isMonthly = row[4] === '1';
        const description = row[11] || name;

        products.push({
          product_key: `${code}_${idx}`,
          name: name,
          code: code,
          description: description,
          annual_cost: isMonthly ? price * 12 : price,
          monthly_cost: isMonthly ? price : Number((price / 12).toFixed(2)),
          daily_cost: isMonthly ? Number((price / 30).toFixed(2)) : Number((price / 365).toFixed(2)),
          annual: !isMonthly,
          sku_id: row[12] || '',
          active: true,
          category: 'Master Catalog'
        });
      }
    }

    cachedSheetsProducts = products;
    lastSheetsFetchTime = now;
    console.log(`[SHEETS API] Successfully synced ${products.length} live products from Google Sheets.`);
    return products;
  } catch (error: any) {
    console.error('[SHEETS API ERROR] Failed to fetch catalog from Google Sheets:', error.message);
    return cachedSheetsProducts;
  }
}
