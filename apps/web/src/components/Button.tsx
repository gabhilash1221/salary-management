import type { ButtonHTMLAttributes } from 'react';

export function Button({
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`cursor-pointer rounded-md bg-brand px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
