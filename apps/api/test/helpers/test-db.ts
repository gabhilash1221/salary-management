import { execSync } from 'node:child_process';
import { join } from 'node:path';

export function pushTestSchema() {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: join(__dirname, '../..'),
    env: process.env,
    stdio: 'pipe',
  });
}
