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

/**
 * Known SKU ID mapping dictionary for Google Workspace, Chrome, & Cloud Search products
 */
const KNOWN_SKU_MAP: Record<string, string> = {
  '1010020020': 'Google Workspace Business Starter',
  '1010020025': 'Google Workspace Business Standard',
  '1010020028': 'Google Workspace Business Plus',
  '1010020030': 'Google Workspace Enterprise Starter',
  '1010020031': 'Google Workspace Enterprise Standard',
  '1010020032': 'Google Workspace Enterprise Plus',
  '1010060001': 'Google Workspace Enterprise Plus - Archived User',
  '1010060002': 'Google Workspace Business Standard - Archived User',
  '1010060003': 'Google Workspace Business Plus - Archived User',
  '1010310001': 'ChromeOS Enterprise Upgrade',
  '1010310002': 'ChromeOS Upgrade',
  '1010330001': 'Cloud Search Platform',
  '1010010001': 'Cloud Identity Free',
  '1010010002': 'Cloud Identity Premium'
};

/**
 * Resolves a human-readable SKU name from skuName, catalog matching, or known SKU dictionary
 */
export function resolveSkuName(skuId?: string, skuName?: string, catalogProducts: Product[] = []): string {
  if (skuName && skuName.trim().length > 0 && !skuName.startsWith('SKU_')) {
    return skuName;
  }

  if (skuId && KNOWN_SKU_MAP[skuId]) {
    return KNOWN_SKU_MAP[skuId];
  }

  const matched = catalogProducts.find(p => (p.sku_id && p.sku_id === skuId) || (p.code && p.code === skuId));
  if (matched && matched.name) {
    return matched.name;
  }

  return skuId ? `Google Product (${skuId})` : 'Google Workspace License';
}

export function getGoogleAuth(scopes: string[], subjectEmail?: string) {
  const targetSubject = subjectEmail || process.env.GOOGLE_ADMIN_SUBJECT_EMAIL || 'michelle@reseller.ditoweb.com';
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
    const res = await reseller.subscriptions.list({ customerId: domain, maxResults: 100 });
    const items = res.data.subscriptions || [];

    return items.map((sub: any) => {
      const resolvedName = resolveSkuName(sub.skuId, sub.skuName, cachedSheetsProducts);
      return {
        subscriptionId: sub.subscriptionId || '',
        customerDomain: domain,
        skuId: sub.skuId || '',
        skuName: resolvedName,
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
      };
    });
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

/**
 * Appends an order transaction record to the Prorated Licenses Google Sheet
 */
export async function appendOrderToProratedSheet(payload: {
  domain: string;
  productCode: string;
  productName: string;
  qty: number;
  monthlyCost: number;
  totalPrice: number;
}) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_PRORATED_LICENSES_ID || '1GhqvuG-ySIY-aDETk0gDGWxOF9GZqFPQTi2E6IUClRQ';
  if (!spreadsheetId) {
    return { success: false, error: 'No GOOGLE_SHEETS_PRORATED_LICENSES_ID configured.' };
  }

  try {
    const auth = getGoogleAuth(SPREADSHEET_SCOPES);
    const sheets = google.sheets({ version: 'v4', auth });

    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear();
    const rangeName = `Q${quarter} ${year}!A1:M1`;
    const startDate = now.toISOString().split('T')[0];

    const rowValues = [
      payload.productCode,                          // A - Product Code / SKU
      payload.monthlyCost,                          // B - Monthly Cost
      12,                                           // C - Months Remaining
      payload.monthlyCost,                          // D - Sales Price
      payload.domain,                               // E - Customer Domain
      startDate,                                    // F - Renewal Date
      payload.qty,                                  // G - Qty
      payload.productName,                          // H - Product Name
      startDate,                                    // I - Start Date
      payload.totalPrice,                           // J - Invoice Total
      30,                                           // K - Days Remaining
      Number((payload.totalPrice / 30).toFixed(2)), // L - Daily Charge
      Number((payload.totalPrice * 0.8).toFixed(2)) // M - Rev to Google
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: rangeName,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues]
      }
    });

    console.log(`[SHEETS API] Appended order transaction to Prorated Licenses Sheet (${spreadsheetId})`);
    return { success: true };
  } catch (error: any) {
    console.error('[SHEETS API ERROR] Failed to append order to Prorated Licenses Sheet:', error.message);
    return { success: false, error: error.message };
  }
}
