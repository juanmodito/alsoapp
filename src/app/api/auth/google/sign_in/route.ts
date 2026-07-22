import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const continueUrl = encodeURIComponent(`${url.origin}/request_license`);
  return NextResponse.redirect(`${url.origin}/api/auth/login?continue=${continueUrl}`);
}
