import bcrypt from 'bcryptjs';

const DEMO_SALT = '$2b$10$N9qo8uLOickgx2ZMRZoMye';

export function hashDemoPassword(password: string): string {
  return bcrypt.hashSync(password, DEMO_SALT);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  return bcrypt.compareSync(password, passwordHash);
}
