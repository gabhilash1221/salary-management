import { describe, expect, it } from 'vitest';
import { isTokenExpired, tokenExpiresAt } from './token';

function jwt(exp: number) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  return `${encode({ alg: 'HS256' })}.${encode({ exp })}.sig`;
}

describe('token expiry', () => {
  it('reads the exp claim as milliseconds', () => {
    expect(tokenExpiresAt(jwt(1_700_000_000))).toBe(1_700_000_000_000);
  });

  it('treats a past exp as expired and a future exp as active', () => {
    const now = 1_700_000_000_000;
    expect(isTokenExpired(jwt(1_699_999_999), now)).toBe(true);
    expect(isTokenExpired(jwt(1_700_000_001), now)).toBe(false);
  });
});
