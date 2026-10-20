import { notifySessionExpired } from '../features/auth/session-expiry';
import { isTokenExpired, TOKEN_EXPIRED_MESSAGE } from '../features/auth/token';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    const message = body?.message ?? response.statusText;
    if (
      token &&
      response.status === 401 &&
      (message === TOKEN_EXPIRED_MESSAGE || isTokenExpired(token))
    ) {
      notifySessionExpired();
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}
