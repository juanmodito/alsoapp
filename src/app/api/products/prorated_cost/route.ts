import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveProductsFromSheets, listResellerSubscriptions } from '@/lib/services/google-reseller';
import { isAuthorizedDomain } from '@/lib/services/domain-auth';
import { getAuthenticatedUserSession } from '@/lib/services/auth-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const licenses = parseInt(body.licenses || '1', 10);
    const productCode = body.product || '';
    const { email: authEmail, domain: authDomain } = await getAuthenticatedUserSession();

    const domain = body.domain || authDomain || '';
    const userEmail = body.email || authEmail || '';

    if (domain && userEmail && !isAuthorizedDomain(userEmail, domain)) {
      return NextResponse.json({
        status: "FAIL",
        error: "Forbidden: You are only authorized to compute costs for your own domain account.",
        errors: ["Tenant domain authorization mismatch."]
      }, { status: 403 });
    }

    const allProducts = await fetchLiveProductsFromSheets();
    let isAnnual = false;
    let costEach = 0;

    if (domain) {
      const subscriptions = await listResellerSubscriptions(domain);
      const sub = subscriptions.find(s => s.skuId === productCode || s.subscriptionId === productCode || `SUB_${s.subscriptionId}` === productCode);
      if (sub) {
        isAnnual = sub.plan?.planName === 'ANNUAL' || sub.billingMethod === 'OFFLINE';
        
        // Match dynamically from live Google Sheets API data
        const matched = allProducts.find(p => 
          (p.sku_id && p.sku_id === sub.skuId) ||
          (p.code && p.code === sub.skuId) ||
          (p.name && sub.skuName && p.name.toLowerCase().includes(sub.skuName.toLowerCase().replace('google workspace', '').replace('g suite', '').trim()))
        );

        if (matched) {
          costEach = isAnnual ? matched.annual_cost : matched.monthly_cost;
        }
      }
    }

    if (costEach === 0) {
      const sheetProduct = allProducts.find(p => p.code === productCode || p.sku_id === productCode || p.product_key === productCode);
      if (sheetProduct) {
        isAnnual = sheetProduct.annual || false;
        costEach = isAnnual ? sheetProduct.annual_cost : sheetProduct.monthly_cost;
      }
    }

    if (costEach === 0) {
      return NextResponse.json({ 
        status: "FAIL", 
        errors: [`Product pricing for '${productCode}' is not available in live catalog`] 
      }, { status: 404 });
    }

    const total = Number((licenses * costEach).toFixed(2));

    return NextResponse.json({
      status: "SUCCESS",
      cost: costEach,
      total: total,
      annual: isAnnual,
      prorated_cost: total,
      licenses: licenses
    });
  } catch (error: any) {
    return NextResponse.json({ status: "FAIL", errors: [error.message || 'Error calculating prorated cost'] }, { status: 400 });
  }
}
