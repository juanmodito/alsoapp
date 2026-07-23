import { NextRequest } from 'next/server';

/**
 * Resolves the true public origin (e.g., https://my-app-uc.a.run.app)
 * taking into account GCP Cloud Run reverse proxies, X-Forwarded-Host/Proto headers,
 * and optional APP_URL environment variable.
 */
export function getRequestOrigin(req: Request | NextRequest): string {
  // 1. Explicit environment variable check (if set in Cloud Run environment)
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. Parse headers forwarded by GCP Cloud Run / Load Balancers
  const headers = req.headers;
  const forwardedHost = headers.get('x-forwarded-host');
  const forwardedProto = headers.get('x-forwarded-proto') || 'https';
  const host = headers.get('host');

  if (forwardedHost && !forwardedHost.includes('0.0.0.0')) {
    const hostValue = forwardedHost.split(',')[0].trim();
    return `${forwardedProto}://${hostValue}`;
  }

  if (host && !host.includes('0.0.0.0')) {
    const proto = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  // 3. Fallback to req.nextUrl or req.url if not 0.0.0.0
  try {
    const url = 'nextUrl' in req && (req as NextRequest).nextUrl ? (req as NextRequest).nextUrl : new URL(req.url);
    if (url.origin && !url.origin.includes('0.0.0.0')) {
      return url.origin;
    }
  } catch (e) {
    // Ignore URL parse error
  }

  // 4. Default fallback
  return 'http://localhost:3000';
}

/**
 * Sanitizes a continueUrl so that any 0.0.0.0 host references are rewritten
 * to use the proper public origin.
 */
export function sanitizeContinueUrl(continueUrl: string | null | undefined, origin: string): string {
  const fallback = `${origin}/request_license`;
  if (!continueUrl) return fallback;

  try {
    // Handle full URLs
    if (continueUrl.startsWith('http://') || continueUrl.startsWith('https://')) {
      const parsed = new URL(continueUrl);
      if (parsed.hostname.includes('0.0.0.0')) {
        return `${origin}${parsed.pathname}${parsed.search}`;
      }
      return continueUrl;
    }

    // Handle relative URLs like /request_license
    if (continueUrl.startsWith('/')) {
      return `${origin}${continueUrl}`;
    }
  } catch (e) {
    // Ignore error
  }

  return fallback;
}
