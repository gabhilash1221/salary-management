import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { apiFetch, apiUpload } from '../../api/client';
import type { Profile } from '../../api/types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { UserAvatar } from '../../components/UserAvatar';
import { roleLabel } from '../../i18n/catalog';
import { useI18n } from '../../i18n/locale-context';
import { useAuth } from '../auth/auth-context';

export function ProfilePage() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const token = session?.token;
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<Profile>('/api/v1/auth/me', {}, token),
  });
  const [name, setName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const displayName = name ?? profile.data?.displayName ?? '';

  const saveName = useMutation({
    mutationFn: (displayName: string) =>
      apiFetch<Profile>(
        '/api/v1/auth/profile',
        { method: 'PATCH', body: JSON.stringify({ displayName }) },
        token,
      ),
    onSuccess: async (next) => {
      queryClient.setQueryData(['profile'], next);
      setName(null);
    },
  });
  const upload = useMutation({
    mutationFn: (file: File) =>
      apiUpload<Profile>('/api/v1/auth/avatar', file, token),
    onSuccess: (next) => queryClient.setQueryData(['profile'], next),
  });
  const removePhoto = useMutation({
    mutationFn: () =>
      apiFetch<Profile>('/api/v1/auth/avatar', { method: 'DELETE' }, token),
    onSuccess: (next) => queryClient.setQueryData(['profile'], next),
  });
  const changePassword = useMutation({
    mutationFn: () =>
      apiFetch<{ updated: boolean }>(
        '/api/v1/auth/password',
        {
          method: 'PATCH',
          body: JSON.stringify({ currentPassword, newPassword }),
        },
        token,
      ),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setPasswordSaved(true);
    },
  });

  function onPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.mismatch'));
      return;
    }
    setPasswordError(null);
    changePassword.mutate();
  }

  const shown = profile.data;

  return (
    <section className="grid max-w-xl gap-4">
      <h1 className="text-2xl">{t('profile.title')}</h1>
      {profile.isError ? (
        <ErrorState
          message={
            profile.error instanceof Error
              ? profile.error.message
              : t('profile.loadError')
          }
        />
      ) : null}
      <Card className="grid gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={displayName || session?.email || ''}
            email={session?.email}
            token={token}
            hasAvatar={shown?.hasAvatar}
            revision={profile.dataUpdatedAt}
            size="lg"
          />
          <div>
            <p className="text-lg">{displayName || t('profile.fallback')}</p>
            <p className="text-sm text-muted">{shown?.email}</p>
            <p className="text-sm text-muted">
              {shown ? roleLabel(locale, shown.role) : ''}
            </p>
          </div>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveName.mutate(displayName);
          }}
        >
          <Field label={t('profile.displayName')} htmlFor="display-name">
            <input
              id="display-name"
              className={controlClass}
              value={displayName}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={saveName.isPending} className="w-fit">
            {t('profile.saveName')}
          </Button>
          {saveName.isError ? (
            <ErrorState
              message={
                saveName.error instanceof Error
                  ? saveName.error.message
                  : t('profile.saveNameError')
              }
            />
          ) : null}
        </form>
        <Field label={t('profile.photo')} htmlFor="profile-photo">
          <input
            id="profile-photo"
            className={controlClass}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = '';
            }}
          />
        </Field>
        <p className="text-sm text-muted">{t('profile.photoHelp')}</p>
        {shown?.hasAvatar ? (
          <button
            type="button"
            className="w-fit cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-ink"
            disabled={removePhoto.isPending}
            onClick={() => removePhoto.mutate()}
          >
            {t('profile.removePhoto')}
          </button>
        ) : null}
        {upload.isError ? (
          <ErrorState
            message={
              upload.error instanceof Error
                ? upload.error.message
                : t('profile.uploadError')
            }
          />
        ) : null}
      </Card>
      <Card>
        <h2 className="mb-3 text-lg">{t('profile.passwordTitle')}</h2>
        <form className="grid gap-3" onSubmit={onPassword}>
          <Field
            label={t('profile.currentPassword')}
            htmlFor="current-password"
          >
            <input
              id="current-password"
              className={controlClass}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </Field>
          <Field label={t('profile.newPassword')} htmlFor="new-password">
            <input
              id="new-password"
              className={controlClass}
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </Field>
          <Field
            label={t('profile.confirmPassword')}
            htmlFor="confirm-password"
          >
            <input
              id="confirm-password"
              className={controlClass}
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </Field>
          {passwordError ? <ErrorState message={passwordError} /> : null}
          {changePassword.isError ? (
            <ErrorState
              message={
                changePassword.error instanceof Error
                  ? changePassword.error.message
                  : t('profile.passwordError')
              }
            />
          ) : null}
          {passwordSaved ? (
            <p className="text-sm text-brand" role="status">
              {t('profile.passwordSaved')}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={changePassword.isPending}
            className="w-fit"
          >
            {t('profile.updatePassword')}
          </Button>
        </form>
      </Card>
    </section>
  );
}
