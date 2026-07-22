import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getResellerCustomer } from '@/lib/services/google-reseller';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const continueUrl = url.searchParams.get('continue') || `${url.origin}/request_license`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Google Sign In - Dito Orders Portal</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d274c; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); width: 380px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; color: #133b72; margin-bottom: 0.5rem; }
            .subtitle { font-size: 13px; color: #64748b; margin-bottom: 1.5rem; }
            input[type="email"] { width: 100%; padding: 12px 14px; margin: 12px 0 20px 0; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; font-size: 14px; }
            button { width: 100%; padding: 12px; background: #1d7ce7; color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
            button:hover { background: #133b72; }
            .hint { font-size: 12px; color: #94a3b8; margin-top: 1.5rem; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">dito</div>
            <div class="subtitle">Orders Portal — Additional Licenses & Services</div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Sign in with Google Workspace</h3>
            <p style="font-size:13px; color:#475569; margin-bottom: 16px;">Enter your organization Google email address to verify your domain account:</p>
            <form action="/api/auth/login" method="POST">
                <input type="hidden" name="continue" value="${continueUrl}">
                <input type="email" name="email" placeholder="you@yourdomain.com" required autofocus>
                <button type="submit">Sign In with Google</button>
            </form>
            <div class="hint">Dito Reseller OAuth Account Verification</div>
        </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const continueUrl = (formData.get('continue') as string) || `${req.nextUrl.origin}/request_license`;

  if (!email || !email.includes('@')) {
    return NextResponse.redirect(`${req.nextUrl.origin}/api/auth/login`);
  }

  const domain = email.split('@')[1];

  // Verify domain customer account in Google Reseller API
  const customerResult = await getResellerCustomer(domain);
  if (!customerResult.success && customerResult.error?.includes('404')) {
    console.warn(`[AUTH DENIED] Domain '${domain}' is not registered in Google Reseller API.`);
    return NextResponse.redirect(`${req.nextUrl.origin}/sign_in_error`);
  }

  const sessionPayload = {
    email: email,
    domain: domain,
    authenticated: true,
    issuedAt: new Date().toISOString()
  };

  const cookieStore = await cookies();
  cookieStore.set('dito_session', JSON.stringify(sessionPayload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });

  return NextResponse.redirect(continueUrl);
}
