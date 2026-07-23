import { NextRequest, NextResponse } from 'next/server';
import { getRequestOrigin } from '@/lib/services/origin';

export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  return NextResponse.redirect(`${origin}/api/auth/google/sign_in`);
}

export async function POST(req: NextRequest) {
  const origin = getRequestOrigin(req);
  return NextResponse.redirect(`${origin}/api/auth/google/sign_in`);
}
