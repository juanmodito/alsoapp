import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequestOrigin } from '@/lib/services/origin';
import { getGoogleUserProfile } from '@/lib/services/google-oauth';
import { getResellerCustomer } from '@/lib/services/google-reseller';

export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('[GOOGLE OAUTH ERROR]', error);
    return NextResponse.redirect(`${origin}/sign_in_error?reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/sign_in_error?reason=no_code`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('dito_oauth_state')?.value;
  cookieStore.delete('dito_oauth_state');

  if (savedState && state && savedState !== state) {
    console.warn('[GOOGLE OAUTH WARN] OAuth state mismatch detected.');
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const googleUser = await getGoogleUserProfile(code, redirectUri);

    const email = googleUser.email;
    const domain = googleUser.domain || (email.includes('@') ? email.split('@')[1] : '');

    // Verify tenant domain account in Google Reseller API
    const customerResult = await getResellerCustomer(domain);
    if (!customerResult.success && customerResult.error?.includes('404')) {
      console.warn(`[AUTH DENIED] Domain '${domain}' is not registered in Google Reseller API.`);
      return NextResponse.redirect(`${origin}/sign_in_error`);
    }

    const sessionPayload = {
      email: email,
      domain: domain,
      name: googleUser.name,
      picture: googleUser.picture,
      authenticated: true,
      issuedAt: new Date().toISOString()
    };

    cookieStore.set('dito_session', JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/'
    });

    return NextResponse.redirect(`${origin}/request_license`);
  } catch (err: any) {
    console.error('[GOOGLE OAUTH CALLBACK ERROR]', err);
    return NextResponse.redirect(`${origin}/sign_in_error?reason=oauth_failed`);
  }
}
