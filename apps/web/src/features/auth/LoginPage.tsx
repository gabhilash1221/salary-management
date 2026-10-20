import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { ThemeToggle } from '../../components/ThemeToggle';
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
    <main className="mx-auto mt-10 flex w-full max-w-md flex-col items-end gap-3 px-4 sm:mt-16">
      <ThemeToggle />
      <Card className="w-full">
        <h1 className="mb-4 text-2xl">Sign in</h1>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              className={controlClass}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              className={controlClass}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? <ErrorState message={error} /> : null}
          <Button type="submit">Sign in</Button>
        </form>
      </Card>
    </main>
  );
}
