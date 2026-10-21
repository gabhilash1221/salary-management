export function initialsFrom(name: string, email = ''): string {
  const source = name.trim() || email.split('@')[0] || '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${firstChar(parts[0])}${firstChar(parts[1])}`.toLocaleUpperCase();
  }
  const letters = Array.from(source).filter((char) =>
    /\p{L}|\p{N}/u.test(char),
  );
  const text = letters.slice(0, 2).join('');
  return text ? text.toLocaleUpperCase() : '?';
}

function firstChar(value: string): string {
  return Array.from(value)[0] ?? '';
}
