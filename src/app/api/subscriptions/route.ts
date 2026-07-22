import { NextRequest, NextResponse } from 'next/server';
import { listResellerSubscriptions } from '@/lib/services/google-reseller';
import { isAuthorizedDomain } from '@/lib/services/domain-auth';
import { getAuthenticatedUserSession } from '@/lib/services/auth-session';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const { email: authEmail, domain: authDomain } = await getAuthenticatedUserSession();

  const domain = url.searchParams.get('domain') || authDomain;
  const userEmail = url.searchParams.get('email') || authEmail;

  if (!domain || !userEmail || !isAuthorizedDomain(userEmail, domain)) {
    return NextResponse.json({
      status: "FAIL",
      error: "Forbidden: Unauthorized access to customer subscriptions.",
      errors: ["Tenant domain mismatch."]
    }, { status: 403 });
  }

  const subscriptions = await listResellerSubscriptions(domain);
  return NextResponse.json({
    status: "SUCCESS",
    subscriptions: subscriptions,
    count: subscriptions.length
  });
}
