import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSessionExpiredHandler } from '../features/auth/session-expiry';
import { TOKEN_EXPIRED_MESSAGE } from '../features/auth/token';
import { apiFetch } from './client';

function rejected(message: string, status = 401) {
  return {
    ok: false,
    status,
    statusText: 'Unauthorized',
    json: async () => ({ message }),
  };
}

describe('apiFetch session expiry', () => {
  afterEach(() => {
    setSessionExpiredHandler(null);
    vi.unstubAllGlobals();
  });

  it('requests a new login when the API reports an expired token', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(rejected(TOKEN_EXPIRED_MESSAGE)),
    );

    await expect(
      apiFetch('/api/v1/employees', {}, 'stored-token'),
    ).rejects.toThrow(TOKEN_EXPIRED_MESSAGE);
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it('leaves a failed sign-in on the form', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(rejected('Invalid email or password')),
    );

    await expect(
      apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.c', password: 'nope' }),
      }),
    ).rejects.toThrow('Invalid email or password');
    expect(onExpired).not.toHaveBeenCalled();
  });
});
