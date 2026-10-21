import type { PrismaClient } from '@prisma/client';
import { generateEmployees } from '../../prisma/seed/generators';
import { DEMO_USERS } from '../../prisma/seed/reference-data';
import {
  EMPLOYEE_COUNT,
  SEED_TIMESTAMP,
} from '../../src/common/reference-data';
import { hashDemoPassword } from '../../src/modules/auth/password';

export async function seedEmployees(
  prisma: PrismaClient,
  count = EMPLOYEE_COUNT,
) {
  const employees = generateEmployees(count, 42);
  const passwordHash = hashDemoPassword('Password123!');
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

  return prisma.employee.count();
}

function chunks<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
