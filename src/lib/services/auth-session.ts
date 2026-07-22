import { cookies } from 'next/headers';

export async function getAuthenticatedUserSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('dito_session');

  if (!sessionCookie || !sessionCookie.value) {
    return { email: '', domain: '', authenticated: false };
  }

  try {
    const rawValue = decodeURIComponent(sessionCookie.value);
    const session = JSON.parse(rawValue);
    const email = session.email || '';
    const domain = session.domain || (email.includes('@') ? email.split('@')[1] : '');
    const authenticated = Boolean(session.authenticated && email && domain);

    return { email, domain, authenticated };
  } catch (e) {
    return { email: '', domain: '', authenticated: false };
  }
}
