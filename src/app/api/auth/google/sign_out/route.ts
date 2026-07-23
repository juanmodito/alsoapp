import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequestOrigin } from '@/lib/services/origin';

export async function GET(req: Request) {
  const origin = getRequestOrigin(req);
  const cookieStore = await cookies();
  cookieStore.delete('dito_session');

  return NextResponse.redirect(`${origin}/request_license`);
}
