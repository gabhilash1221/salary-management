import { imageType, readThemeMessage } from './profile-media';

describe('profile media', () => {
  it('reads a theme event', () => {
    expect(readThemeMessage('{"event":"theme","data":{"theme":"night"}}')).toBe(
      'night',
    );
    expect(readThemeMessage('{"event":"theme","data":{"theme":"blue"}}')).toBe(
      null,
    );
  });

  it('recognizes png, jpeg, and webp signatures', () => {
    expect(
      imageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('image/png');
    expect(imageType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    expect(imageType(webp)).toBe('image/webp');
    expect(imageType(Buffer.from('hello'))).toBeNull();
  });
});
