import { google } from 'googleapis';

/**
 * Returns an instance of google.auth.OAuth2 initialized with environment credentials.
 */
export function getOAuth2Client(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the official Google OAuth 2.0 authorization URL.
 */
export function generateGoogleAuthUrl(redirectUri: string, state?: string): string {
  const oauth2Client = getOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid'
    ],
    prompt: 'select_account',
    state: state || ''
  });
}

/**
 * Exchanges the OAuth authorization code for authentic user profile tokens from Google.
 */
export async function getGoogleUserProfile(code: string, redirectUri: string) {
  const oauth2Client = getOAuth2Client(redirectUri);

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfoResponse = await oauth2.userinfo.get();

  const user = userInfoResponse.data;
  if (!user.email) {
    throw new Error('Google OAuth failed to return a valid user email address.');
  }

  const email = user.email.toLowerCase().trim();
  const hd = user.hd || (email.includes('@') ? email.split('@')[1] : '');

  return {
    email,
    domain: hd,
    name: user.name || '',
    picture: user.picture || '',
    id: user.id || ''
  };
}
