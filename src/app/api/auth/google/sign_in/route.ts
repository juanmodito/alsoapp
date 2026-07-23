import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequestOrigin } from '@/lib/services/origin';
import { generateGoogleAuthUrl } from '@/lib/services/google-oauth';

export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const authUrl = generateGoogleAuthUrl(redirectUri, state);

  const cookieStore = await cookies();
  cookieStore.set('dito_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes in seconds
    path: '/'
  });

  return NextResponse.redirect(authUrl);
}
