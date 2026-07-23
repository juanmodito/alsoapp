import { NextRequest, NextResponse } from 'next/server';
import { updateResellerSeats, fetchLiveProductsFromSheets, appendOrderToProratedSheet } from '@/lib/services/google-reseller';
import { sendOrderConfirmationEmail } from '@/lib/services/mailer';
import { isAuthorizedDomain } from '@/lib/services/domain-auth';
import { getAuthenticatedUserSession } from '@/lib/services/auth-session';

const ordersDatabase: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: authEmail, domain: authDomain } = await getAuthenticatedUserSession();

    const userEmail = body.email || authEmail || '';
    const domain = body.domain || body.customerDomain || authDomain || (userEmail.includes('@') ? userEmail.split('@')[1] : '');

    if (!userEmail || !domain || !isAuthorizedDomain(userEmail, domain)) {
      console.warn(`[SECURITY BLOCKED] Unauthorized cross-tenant order submission attempt for domain '${domain}' by '${userEmail}'`);
      return NextResponse.json({
        status: "FAIL",
        error: "Forbidden: You can only submit license requests for your own domain account.",
        errors: ["Tenant domain authorization mismatch."]
      }, { status: 403 });
    }

    const licenses = parseInt(body.licenses || '1', 10);
    const subscriptionId = body.subscription_id;
    const productCode = body.product || '';
    const comments = body.comments || '';

    const products = await fetchLiveProductsFromSheets();
    const product = products.find(p => p.code === productCode || p.product_key === productCode);
    const productName = product ? product.name : productCode || 'Google Workspace License';
    const costEach = product ? product.monthly_cost : 12.0;
    const total = Number((licenses * costEach).toFixed(2));

    console.log(`[ORDER SUBMISSION] Processing order for domain: ${domain}, product: ${productName}, seats: +${licenses}`);

    let executionResult = null;
    if (subscriptionId) {
      const result = await updateResellerSeats(domain, subscriptionId, licenses);
      if (!result.success) {
        return NextResponse.json({ status: "FAIL", errors: [result.error || 'Failed to update reseller seats'] }, { status: 400 });
      }
      executionResult = result.result;
    }

    const orderRecord = {
      order_key: `order_${Date.now()}`,
      date: new Date().toISOString(),
      customer: domain,
      requested_seats: licenses,
      new_seats: licenses + 25,
      attribute: productName,
      comments: comments,
      error: null
    };

    ordersDatabase.push(orderRecord);

    // 1. Append order audit log entry to Google Sheets Prorated Licenses Spreadsheet
    await appendOrderToProratedSheet({
      domain: domain,
      productCode: productCode,
      productName: productName,
      qty: licenses,
      monthlyCost: costEach,
      totalPrice: total
    });

    // 2. Trigger automated email notification
    await sendOrderConfirmationEmail({
      customerEmail: userEmail,
      customerDomain: domain,
      productName: productName,
      licenses: licenses,
      totalPrice: total,
      comments: comments
    });

    return NextResponse.json({
      status: "SUCCESS",
      message: `Successfully placed order for ${domain} (+${licenses} seats)`,
      order: orderRecord,
      result: executionResult
    });
  } catch (error: any) {
    return NextResponse.json({ status: "FAIL", errors: [error.message || 'Server error submitting order'] }, { status: 500 });
  }
}
