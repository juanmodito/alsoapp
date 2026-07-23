import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveProductsFromSheets, listResellerSubscriptions } from '@/lib/services/google-reseller';
import { isAuthorizedDomain } from '@/lib/services/domain-auth';
import { getAuthenticatedUserSession } from '@/lib/services/auth-session';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const allProducts = await fetchLiveProductsFromSheets();
  const { email: authEmail, domain: authDomain } = await getAuthenticatedUserSession();

  const domain = url.searchParams.get('domain') || authDomain || '';
  const userEmail = url.searchParams.get('email') || authEmail || '';

  if (domain && userEmail && !isAuthorizedDomain(userEmail, domain)) {
    return NextResponse.json({
      status: "FAIL",
      error: "Forbidden: You are only authorized to query subscriptions for your own domain account.",
      errors: ["Tenant domain authorization mismatch."]
    }, { status: 403 });
  }

  const catalog: any[] = [];

  // 1. Customer's Active Google Workspace Subscriptions from Reseller API
  if (domain) {
    const subscriptions = await listResellerSubscriptions(domain);
    
    subscriptions.forEach((sub, idx) => {
      if (sub.skuName && !sub.skuName.toLowerCase().includes('cloud identity') && sub.status === 'ACTIVE') {
        const shortName = sub.skuName
          .replace('Google Workspace', 'GW')
          .replace(' - Archived User', ' Archived User');

        const currentSeats = sub.seats?.numberOfSeats || 
          (sub.seats?.maximumNumberOfSeats && sub.seats.maximumNumberOfSeats < 50000 ? sub.seats.maximumNumberOfSeats : 0) || 
          sub.seats?.licensedNumberOfSeats || 0;
        const licensedSeats = sub.seats?.licensedNumberOfSeats || 0;
        const isAnnual = sub.plan?.planName === 'ANNUAL' || sub.billingMethod === 'OFFLINE';

        // Match dynamically against live Google Sheets catalog
        const matched = allProducts.find(p => 
          (p.sku_id && p.sku_id === sub.skuId) ||
          (p.code && p.code === sub.skuId) ||
          (p.name && sub.skuName && p.name.toLowerCase().includes(sub.skuName.toLowerCase().replace('google workspace', '').replace('g suite', '').trim()))
        );

        const monthlyCost = matched ? matched.monthly_cost : 0;
        const annualCost = matched ? matched.annual_cost : 0;
        const dailyCost = matched ? matched.daily_cost : 0;

        catalog.push({
          product_key: `SUB_${sub.subscriptionId || idx}`,
          name: shortName,
          code: sub.skuId || `SKU_${idx}`,
          description: `${sub.skuName} (${isAnnual ? 'ANNUAL' : 'FLEXIBLE'})`,
          annual_cost: annualCost,
          monthly_cost: monthlyCost,
          daily_cost: dailyCost,
          annual: isAnnual,
          sku_id: sub.skuId,
          active: true,
          subscriptionId: sub.subscriptionId,
          category: "Active Subscriptions",
          currentSeats: currentSeats,
          licensedSeats: licensedSeats
        });
      }
    });
  }

  // 2. Active Software, ISV & Security Products directly from live Google Sheets catalog
  const isvAndAddonNames = [
    'aodocs', 'chrome edu', 'pandadoc', 'spanning', 'uberconference', 'virtru', 'zixcorp'
  ];

  const sheetAddons = allProducts.filter(p => 
    isvAndAddonNames.some(keyword => p.name.toLowerCase().includes(keyword))
  );

  sheetAddons.forEach((addon, idx) => {
    catalog.push({
      product_key: addon.product_key || `ISV_${idx}`,
      name: addon.name,
      code: addon.code || addon.sku_id,
      description: addon.description || `${addon.name} (${addon.annual ? 'ANNUAL' : 'FLEXIBLE'})`,
      annual_cost: addon.annual_cost,
      monthly_cost: addon.monthly_cost,
      daily_cost: addon.daily_cost,
      annual: addon.annual,
      sku_id: addon.sku_id,
      active: true,
      category: "Software & Services",
      currentSeats: 0,
      licensedSeats: 0
    });
  });

  return NextResponse.json({ status: "SUCCESS", products: catalog, count: catalog.length });
}
