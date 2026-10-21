import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_SEED,
  EMPLOYEE_COUNT,
  SEED_TIMESTAMP,
} from '../../src/common/reference-data';
import { hashDemoPassword } from '../../src/modules/auth/password';
import { generateEmployees } from './generators';
import { DEMO_USERS } from './reference-data';

loadEnv(resolve(__dirname, '../../.env'));
loadEnv(resolve(__dirname, '../../../../.env'));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required. Copy .env.example to .env at the repository root.',
  );
}

const seed = Number(process.env.SEED ?? DEFAULT_SEED);
const password = process.env.SEED_DEMO_PASSWORD ?? 'Password123!';
const prisma = new PrismaClient();

async function main() {
  const employees = generateEmployees(EMPLOYEE_COUNT, seed);
  if (employees.length !== EMPLOYEE_COUNT) {
    throw new Error(`Generator produced ${employees.length} employees`);
  }

  const passwordHash = hashDemoPassword(password);
  const salaries = employees.flatMap((employee) => employee.salaryRecords);

  await prisma.$transaction([
    prisma.salaryRecord.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await prisma.user.createMany({
    data: DEMO_USERS.map((user) => ({
      id: user.id,
      email: user.email,
      passwordHash,
      role: user.role,
      displayName: user.displayName,
      isActive: true,
      createdAt: SEED_TIMESTAMP,
    })),
  });

  for (const batch of chunks(employees, 500)) {
    await prisma.employee.createMany({
      data: batch.map(
        ({ salaryRecords: _salaryRecords, ...employee }) => employee,
      ),
    });
  }

  for (const batch of chunks(salaries, 500)) {
    await prisma.salaryRecord.createMany({ data: batch });
  }

  const count = await prisma.employee.count();
  if (count !== EMPLOYEE_COUNT) {
    throw new Error(
      `Seed verification failed: expected ${EMPLOYEE_COUNT} employees and found ${count}`,
    );
  }

  console.log(
    `Seeded ${count} employees and ${salaries.length} salary records.`,
  );
}

function chunks<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function loadEnv(path: string) {
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
