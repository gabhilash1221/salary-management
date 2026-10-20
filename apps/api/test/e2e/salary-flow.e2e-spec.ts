import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMPLOYEE_COUNT } from '../../src/common/reference-data';
import { roundHalfUp } from '../../src/common/utils/money';
import { configureApp } from '../../src/configure-app';
import { seedEmployees } from '../helpers/seed-employees';
import { pushTestSchema } from '../helpers/test-db';

type SalaryRow = {
  id: string;
  amountMinor: number;
  currency: string;
  effectiveDate: string;
};

type SummaryRow = {
  currency: string;
  department?: string;
  count: number;
  suppressed: boolean;
  median?: number;
};

jest.setTimeout(180_000);

describe('Seeded salary API', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    pushTestSchema();
    const count = await seedEmployees(prisma);
    if (count !== EMPLOYEE_COUNT) {
      throw new Error(
        `Expected ${EMPLOYEE_COUNT} employees and found ${count}`,
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    for (const [role, email] of [
      ['manager', 'hr.manager@acme.test'],
      ['viewer', 'hr.viewer@acme.test'],
      ['directory', 'directory.user@acme.test'],
      ['auditor', 'auditor@acme.test'],
    ] as const) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      expect(response.status).toBe(201);
      tokens[role] = response.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('pages through all 10,000 employees without gaps or duplicates', async () => {
    const ids = new Set<string>();
    let total = 0;
    for (let page = 1; page <= 100; page += 1) {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employees')
        .query({ page, pageSize: 100, sort: 'employeeId', order: 'asc' })
        .set('Authorization', `Bearer ${tokens.manager}`);
      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(100);
      total = response.body.total;
      for (const item of response.body.items) {
        ids.add(item.employeeId);
      }
    }
    expect(total).toBe(EMPLOYEE_COUNT);
    expect(ids.size).toBe(EMPLOYEE_COUNT);

    const pastEnd = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .query({ page: 101, pageSize: 100 })
      .set('Authorization', `Bearer ${tokens.manager}`);
    expect(pastEnd.status).toBe(200);
    expect(pastEnd.body.items).toEqual([]);
    expect(pastEnd.body.total).toBe(EMPLOYEE_COUNT);
  });

  it('searches by name and exact id and filters the small executive group', async () => {
    const byName = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .query({ search: 'josé' })
      .set('Authorization', `Bearer ${tokens.manager}`);
    expect(byName.status).toBe(200);
    expect(
      byName.body.items.map((item: { employeeId: string }) => item.employeeId),
    ).toContain('EMP-000001');

    const byId = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .query({ search: 'EMP-000123' })
      .set('Authorization', `Bearer ${tokens.manager}`);
    expect(byId.body.items).toHaveLength(1);
    expect(byId.body.items[0].employeeId).toBe('EMP-000123');

    const executives = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .query({ department: 'Executive', country: 'CA' })
      .set('Authorization', `Bearer ${tokens.manager}`);
    expect(executives.body.total).toBe(3);
  });

  it('hides salary fields from directory users and blocks the other roles', async () => {
    const directory = await request(app.getHttpServer())
      .get('/api/v1/employees/EMP-000001')
      .set('Authorization', `Bearer ${tokens.directory}`);
    expect(directory.status).toBe(200);
    expect(directory.body).not.toHaveProperty('currentSalary');

    const manager = await request(app.getHttpServer())
      .get('/api/v1/employees/EMP-000001')
      .set('Authorization', `Bearer ${tokens.manager}`);
    expect(manager.body).toHaveProperty('currentSalary');

    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/employees/EMP-000001/salary')
          .set('Authorization', `Bearer ${tokens.directory}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .put('/api/v1/employees/EMP-000001/salary')
          .set('Authorization', `Bearer ${tokens.viewer}`)
          .send({
            amountMinor: 100,
            currency: 'USD',
            effectiveDate: '2028-01-01',
            version: 1,
          })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/analytics/summary')
          .set('Authorization', `Bearer ${tokens.auditor}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/employees/EMP-000001/salary/history')
          .set('Authorization', `Bearer ${tokens.auditor}`)
      ).status,
    ).toBe(200);
  });

  it('appends salary history and an audit row, then rejects a stale version', async () => {
    const before = await request(app.getHttpServer())
      .get('/api/v1/employees/EMP-000002/salary/history')
      .set('Authorization', `Bearer ${tokens.manager}`);
    const previousIds = before.body.records.map(
      (record: SalaryRow) => record.id,
    );
    const latest = before.body.records[0].effectiveDate as string;
    const employee = await request(app.getHttpServer())
      .get('/api/v1/employees/EMP-000002')
      .set('Authorization', `Bearer ${tokens.manager}`);

    const updated = await request(app.getHttpServer())
      .put('/api/v1/employees/EMP-000002/salary')
      .set('Authorization', `Bearer ${tokens.manager}`)
      .send({
        amountMinor: 9_000_000,
        currency: 'USD',
        effectiveDate: nextIsoDate(latest),
        version: employee.body.version,
        reason: 'Annual review',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.version).toBe(employee.body.version + 1);

    const after = await request(app.getHttpServer())
      .get('/api/v1/employees/EMP-000002/salary/history')
      .set('Authorization', `Bearer ${tokens.manager}`);
    const afterIds = after.body.records.map((record: SalaryRow) => record.id);
    expect(afterIds).toEqual(expect.arrayContaining(previousIds));
    expect(after.body.records).toHaveLength(previousIds.length + 1);

    const audit = await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ employeeId: 'EMP-000002' })
      .set('Authorization', `Bearer ${tokens.manager}`);
    expect(audit.body.items[0]).toMatchObject({
      action: 'SALARY_UPDATE',
      entityId: 'EMP-000002',
    });

    const stale = await request(app.getHttpServer())
      .put('/api/v1/employees/EMP-000002/salary')
      .set('Authorization', `Bearer ${tokens.manager}`)
      .send({
        amountMinor: 9_100_000,
        currency: 'USD',
        effectiveDate: nextIsoDate(nextIsoDate(latest)),
        version: employee.body.version,
        reason: 'Stale',
      });
    expect(stale.status).toBe(409);
    const unchanged = await request(app.getHttpServer())
      .get('/api/v1/employees/EMP-000002/salary/history')
      .set('Authorization', `Bearer ${tokens.manager}`);
    expect(unchanged.body.records).toHaveLength(after.body.records.length);
  });

  it('rejects an invalid amount and answers a supported question from stored rows', async () => {
    const invalid = await request(app.getHttpServer())
      .put('/api/v1/employees/EMP-000003/salary')
      .set('Authorization', `Bearer ${tokens.manager}`)
      .send({
        amountMinor: 0,
        currency: 'USD',
        effectiveDate: '2028-01-01',
        version: 1,
      });
    expect(invalid.status).toBe(400);

    const analytics = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .query({ country: 'IN', groupBy: 'department' })
      .set('Authorization', `Bearer ${tokens.manager}`);
    const question = await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${tokens.manager}`)
      .send({ question: 'What is the median salary in India by department?' });
    expect(question.status).toBe(201);
    expect(question.body.supported).toBe(true);
    expect(question.body.filters).toMatchObject({ country: 'IN' });
    expect(question.body.results).toEqual(analytics.body.results);

    const visible = (analytics.body.results as SummaryRow[]).find(
      (row) => !row.suppressed,
    );
    expect(visible).toBeDefined();
    expect(
      await medianFromDatabase(
        prisma,
        'IN',
        visible?.department ?? '',
        visible?.currency ?? '',
      ),
    ).toBe(visible?.median);

    const engineering = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .query({ groupBy: 'department', department: 'Engineering' })
      .set('Authorization', `Bearer ${tokens.manager}`);
    const currencies = new Set(
      (engineering.body.results as SummaryRow[]).map((row) => row.currency),
    );
    expect(currencies.size).toBeGreaterThan(1);

    const rejected = await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${tokens.manager}`)
      .send({ question: 'Delete all salaries' });
    expect(rejected.body.supported).toBe(false);
    expect(JSON.stringify(rejected.body)).not.toMatch(/\d{5,}/);
  });
});

function nextIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function medianFromDatabase(
  prisma: PrismaClient,
  country: string,
  department: string,
  currency: string,
) {
  const today = new Date();
  const todayTime = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const employees = await prisma.employee.findMany({
    where: { country, department, status: { in: ['Active', 'On Leave'] } },
    include: { salaryRecords: true },
  });
  const amounts = employees.flatMap((employee) => {
    const current = [...employee.salaryRecords]
      .filter((record) => record.effectiveDate.getTime() <= todayTime)
      .sort(
        (left, right) =>
          right.effectiveDate.getTime() - left.effectiveDate.getTime(),
      )[0];
    return current && current.currency === currency
      ? [current.amountMinor]
      : [];
  });
  const sorted = amounts.sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return roundHalfUp(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}
