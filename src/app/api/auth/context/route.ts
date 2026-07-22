import { NextResponse } from 'next/server';
import { getAuthenticatedUserSession } from '@/lib/services/auth-session';
import { getResellerCustomer } from '@/lib/services/google-reseller';

export async function GET() {
  const { email, domain, authenticated } = await getAuthenticatedUserSession();

  if (!authenticated || !email || !domain) {
    return NextResponse.json({
      status: "SUCCESS",
      authenticated: false,
      sign_in_url: "/api/auth/google/sign_in",
      sign_out_url: "/api/auth/google/sign_out",
      user: null
    });
  }

  let orgName = domain ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : 'Organization';

  if (domain) {
    const result = await getResellerCustomer(domain);
    if (result.success && (result.customer as any)?.postalAddress?.organizationName) {
      orgName = (result.customer as any).postalAddress.organizationName;
    }
  }

  return NextResponse.json({
    status: "SUCCESS",
    authenticated: true,
    sign_in_url: "/api/auth/google/sign_in",
    sign_out_url: "/api/auth/google/sign_out",
    user: {
      email: email,
      customerDomain: domain,
      postalAddress: {
        organizationName: orgName
      },
      roles: ['DITOWEB CUSTOMER']
    }
  });
}
