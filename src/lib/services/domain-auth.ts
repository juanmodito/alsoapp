/**
 * Security middleware helper for Tenant Domain Authorization.
 * Verifies that user email matches the customer domain query.
 */
export function isAuthorizedDomain(userEmail: string, queriedDomain: string): boolean {
  if (!userEmail || !queriedDomain) {
    return false;
  }

  const sanitizedEmail = userEmail.trim().toLowerCase();
  const sanitizedDomain = queriedDomain.trim().toLowerCase();

  if (!sanitizedEmail.includes('@')) {
    return false;
  }

  const emailDomain = sanitizedEmail.split('@')[1];
  return emailDomain === sanitizedDomain;
}
