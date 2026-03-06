/**
 * Admin authorization helpers.
 * Admin status is determined by email domain matching ADMIN_EMAIL_DOMAINS env var.
 */

const ADMIN_DOMAINS = (process.env.ADMIN_EMAIL_DOMAINS || 'altshift.com.au')
  .split(',')
  .map((d) => d.trim().toLowerCase());

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? ADMIN_DOMAINS.includes(domain) : false;
}
