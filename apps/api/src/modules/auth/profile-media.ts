import type { ThemeName } from './theme-sync';

export function readThemeMessage(raw: string): ThemeName | null {
  try {
    const parsed = JSON.parse(raw) as {
      event?: unknown;
      data?: { theme?: unknown };
    };
    if (parsed.event !== 'theme') return null;
    if (parsed.data?.theme === 'day' || parsed.data?.theme === 'night') {
      return parsed.data.theme;
    }
  } catch {
    return null;
  }
  return null;
}

export function imageType(bytes: Buffer): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
