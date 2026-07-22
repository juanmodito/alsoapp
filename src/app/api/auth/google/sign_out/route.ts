import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookieStore = await cookies();
  cookieStore.delete('dito_session');

  return NextResponse.redirect(`${url.origin}/request_license`);
}
