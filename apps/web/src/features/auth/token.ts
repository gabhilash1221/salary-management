export const TOKEN_EXPIRED_MESSAGE = 'The token is expired';

export function tokenExpiresAt(token: string): number | null {
  const segment = token.split('.')[1];
  if (!segment) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(segment)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== null && expiresAt <= now;
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  return atob(padded);
}
