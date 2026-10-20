import type { ReactNode } from 'react';

export const controlClass =
  'w-full rounded-md border border-line bg-surface px-2 py-1.5 text-inherit';

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}
