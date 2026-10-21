import { useEffect, useState } from 'react';
import { initialsFrom } from '../lib/initials';

export function UserAvatar({
  name,
  email = '',
  token,
  hasAvatar = false,
  revision = 0,
  size = 'sm',
}: {
  name: string;
  email?: string;
  token?: string | null;
  hasAvatar?: boolean;
  revision?: number;
  size?: 'sm' | 'lg';
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const initials = initialsFrom(name, email);
  const frame = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-8 w-8 text-xs';

  useEffect(() => {
    if (!hasAvatar || !token) {
      setPhoto(null);
      return;
    }
    let cancelled = false;
    let objectUrl = '';
    void fetch(`/api/v1/auth/avatar?v=${revision}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPhoto(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPhoto(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasAvatar, revision, token]);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-semibold text-white ${frame}`}
      aria-hidden="true"
    >
      {photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
