import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from './auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const result = await apiFetch<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      });
      login({
        token: result.accessToken,
        role: result.role,
        email: result.email,
      });
      navigate('/employees');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    }
  }

  return (
    <main className="login card">
      <h1>Sign in</h1>
      <form className="stack" onSubmit={onSubmit}>
        <label htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </label>
        <label htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <ErrorState message={error} /> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
