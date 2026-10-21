import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SEED_TIMESTAMP } from '../../src/common/reference-data';
import { configureApp } from '../../src/configure-app';
import { hashDemoPassword } from '../../src/modules/auth/password';
import {
  IMPORT_HEADERS,
  MAX_IMPORT_BYTES,
} from '../../src/modules/employees/employee-import.columns';
import { buildXlsxTemplate } from '../../src/modules/employees/employee-import.template';
import { pushTestSchema } from '../helpers/test-db';

const base = {
  employeeId: 'EMP-900010',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada.import@example.test',
  department: 'Engineering',
  country: 'GB',
  jobTitle: 'Engineer',
  status: 'Active',
  hireDate: '2024-01-15',
  terminationDate: '',
  annualAmount: '120000',
  currency: 'GBP',
  salaryEffectiveDate: '2024-01-15',
  reason: 'Hire',
};

function csvOf(rows: Array<Partial<typeof base>>): Buffer {
  const lines = [
    IMPORT_HEADERS.join(','),
    ...rows.map((row) => {
      const values = { ...base, ...row };
      return IMPORT_HEADERS.map((header) => values[header]).join(',');
    }),
  ];
  return Buffer.from(lines.join('\n'), 'utf8');
}

async function xlsxOf(rows: Array<Partial<typeof base>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Employees');
  sheet.addRow([...IMPORT_HEADERS]);
  for (const row of rows) {
    const values = { ...base, ...row };
    sheet.addRow(IMPORT_HEADERS.map((header) => values[header]));
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('employee bulk import', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let manager = '';
  let viewer = '';
  let directory = '';

  beforeAll(async () => {
    pushTestSchema();
    const passwordHash = hashDemoPassword('Password123!');
    await prisma.salaryRecord.deleteMany({
      where: { employeeId: 'EMP-000001' },
    });
    await prisma.employee.deleteMany({
      where: {
        OR: [
          { employeeId: 'EMP-000001' },
          { email: 'existing.person@example.test' },
        ],
      },
    });
    await prisma.employee.create({
      data: {
        id: 'emp_existing_import',
        employeeId: 'EMP-000001',
        firstName: 'Existing',
        lastName: 'Person',
        firstNameKey: 'existing',
        lastNameKey: 'person',
        email: 'existing.person@example.test',
        department: 'Engineering',
        country: 'IN',
        jobTitle: 'Engineer',
        status: 'Active',
        hireDate: new Date('2020-01-01T00:00:00.000Z'),
        version: 1,
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    });
    for (const user of [
      {
        id: 'user_hr_manager',
        email: 'hr.manager@acme.test',
        role: 'HR_MANAGER',
      },
      {
        id: 'user_hr_viewer',
        email: 'hr.viewer@acme.test',
        role: 'HR_VIEWER',
      },
      {
        id: 'user_directory',
        email: 'directory.user@acme.test',
        role: 'DIRECTORY_USER',
      },
    ]) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: { passwordHash, role: user.role, isActive: true },
        create: {
          ...user,
          passwordHash,
          isActive: true,
          createdAt: SEED_TIMESTAMP,
        },
      });
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    manager = await login('hr.manager@acme.test');
    viewer = await login('hr.viewer@acme.test');
    directory = await login('directory.user@acme.test');
  });

  beforeEach(async () => {
    await prisma.salaryRecord.deleteMany({
      where: { employeeId: { startsWith: 'EMP-900' } },
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: { startsWith: 'EMP-900' } },
    });
    await prisma.employee.deleteMany({
      where: { employeeId: { startsWith: 'EMP-900' } },
    });
  });

  afterAll(async () => {
    await prisma.salaryRecord.deleteMany({
      where: { employeeId: { startsWith: 'EMP-900' } },
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: { startsWith: 'EMP-900' } },
    });
    await prisma.employee.deleteMany({
      where: {
        OR: [
          { employeeId: { startsWith: 'EMP-900' } },
          { employeeId: 'EMP-000001' },
        ],
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects anonymous callers and non-managers', async () => {
    const anonymous = await request(app.getHttpServer()).get(
      '/api/v1/employees/import/templates/employees.csv',
    );
    expect(anonymous.status).toBe(401);

    for (const token of [viewer, directory]) {
      const preview = await request(app.getHttpServer())
        .post('/api/v1/employees/import/preview')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', csvOf([{}]), 'employees.csv');
      expect(preview.status).toBe(403);
    }
  });

  it('downloads templates and imports the Excel sample', async () => {
    const csv = await request(app.getHttpServer())
      .get('/api/v1/employees/import/templates/employees.csv')
      .set('Authorization', `Bearer ${manager}`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('ada.lovelace@example.test');

    const workbook = await buildXlsxTemplate();
    const preview = await request(app.getHttpServer())
      .post('/api/v1/employees/import/preview')
      .set('Authorization', `Bearer ${manager}`)
      .attach('file', workbook, 'employees.xlsx');
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({
      total: 2,
      valid: 2,
      failed: 0,
      skipped: 0,
      imported: 0,
    });

    const imported = await request(app.getHttpServer())
      .post('/api/v1/employees/import')
      .set('Authorization', `Bearer ${manager}`)
      .attach('file', workbook, 'employees.xlsx');
    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({
      imported: 2,
      failed: 0,
      skipped: 0,
    });

    const ada = await request(app.getHttpServer())
      .get('/api/v1/employees/EMP-900001')
      .set('Authorization', `Bearer ${manager}`);
    expect(ada.status).toBe(200);
    expect(ada.body.currentSalary.amountMinor).toBe(12_000_000);
    expect(ada.body.country).toBe('GB');

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: 'EMP-900001', action: 'EMPLOYEE_IMPORT' },
    });
    const salaryAudit = await prisma.auditLog.findFirst({
      where: { entityId: 'EMP-900001', action: 'SALARY_UPDATE' },
    });
    expect(audit).not.toBeNull();
    expect(salaryAudit).not.toBeNull();

    const again = await request(app.getHttpServer())
      .post('/api/v1/employees/import')
      .set('Authorization', `Bearer ${manager}`)
      .attach('file', workbook, 'employees.xlsx');
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ imported: 0, skipped: 2, failed: 0 });
  });

  it('imports valid CSV rows and reports invalid, duplicate, and missing data', async () => {
    const missing = await request(app.getHttpServer())
      .post('/api/v1/employees/import/preview')
      .set('Authorization', `Bearer ${manager}`)
      .attach('file', Buffer.from('employeeId,firstName\n'), 'employees.csv');
    expect(missing.status).toBe(400);
    expect(missing.body.message).toMatch(/Missing required columns/);

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/employees/import/preview')
      .set('Authorization', `Bearer ${manager}`)
      .attach('file', Buffer.from('not-a-workbook'), 'employees.xlsx');
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toMatch(/not a valid Excel workbook/);

    const oversized = await request(app.getHttpServer())
      .post('/api/v1/employees/import/preview')
      .set('Authorization', `Bearer ${manager}`)
      .attach(
        'file',
        Buffer.alloc(MAX_IMPORT_BYTES + 1, 0x61),
        'employees.csv',
      );
    expect(oversized.status).toBe(400);
    expect(oversized.body.message).toMatch(/2 MB/);

    const partial = await request(app.getHttpServer())
      .post('/api/v1/employees/import')
      .set('Authorization', `Bearer ${manager}`)
      .attach(
        'file',
        csvOf([
          {
            employeeId: 'EMP-900101',
            email: 'partial.ok@example.test',
          },
          {
            employeeId: 'EMP-900102',
            email: 'partial.bad@example.test',
            department: 'Nope',
          },
          {
            employeeId: 'EMP-900103',
            email: 'existing.person@example.test',
          },
          {
            employeeId: 'EMP-900104',
            email: 'partial.ok@example.test',
          },
        ]),
        'employees.csv',
      );
    expect(partial.status).toBe(200);
    expect(partial.body).toMatchObject({
      total: 4,
      imported: 1,
      failed: 1,
      skipped: 2,
    });
    expect(partial.body.rows[1].messages.join(' ')).toMatch(/Department/);
    expect(partial.body.rows[2].status).toBe('skipped');

    const saved = await prisma.employee.findUnique({
      where: { employeeId: 'EMP-900101' },
    });
    const rejected = await prisma.employee.findUnique({
      where: { employeeId: 'EMP-900102' },
    });
    expect(saved?.email).toBe('partial.ok@example.test');
    expect(rejected).toBeNull();
  });

  it('imports a partial Excel file and assigns a blank employee id', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/employees/import')
      .set('Authorization', `Bearer ${manager}`)
      .attach(
        'file',
        await xlsxOf([
          {
            employeeId: '',
            email: 'blank.id@example.test',
            annualAmount: '',
            currency: '',
            salaryEffectiveDate: '',
            reason: '',
          },
          {
            employeeId: 'EMP-900201',
            email: 'excel.bad@example.test',
            status: 'Terminated',
          },
        ]),
        'employees.xlsx',
      );
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ imported: 1, failed: 1, skipped: 0 });
    const employeeId = created.body.rows[0].employeeId as string;
    expect(employeeId).toMatch(/^EMP-\d{6}$/);

    const loaded = await request(app.getHttpServer())
      .get(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${manager}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body.email).toBe('blank.id@example.test');
    expect(loaded.body.currentSalary).toBeNull();

    await prisma.employee.deleteMany({ where: { employeeId } });
  });

  it('creates, sorts, updates, and deletes an employee', async () => {
    const viewerDenied = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${viewer}`)
      .send(profile('EMP-900501', 'alpha.sortkey@example.test', 'Alpha'));
    expect(viewerDenied.status).toBe(403);

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${manager}`)
      .send({
        ...profile('EMP-900509', 'bad.sortkey@example.test', 'Bad'),
        department: 'Nope',
      });
    expect(invalid.status).toBe(400);

    const first = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${manager}`)
      .send(profile('EMP-900501', 'alpha.sortkey@example.test', 'Alpha'));
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      employeeId: 'EMP-900501',
      department: 'Engineering',
      version: 1,
      currentSalary: null,
    });

    const second = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${manager}`)
      .send(profile('EMP-900502', 'zulu.sortkey@example.test', 'Zulu'));
    expect(second.status).toBe(201);

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${manager}`)
      .send(profile('EMP-900503', 'alpha.sortkey@example.test', 'Copy'));
    expect(duplicate.status).toBe(409);

    const byName = await request(app.getHttpServer())
      .get('/api/v1/employees?search=sortkey&sort=name&order=asc')
      .set('Authorization', `Bearer ${manager}`);
    expect(byName.status).toBe(200);
    expect(
      byName.body.items.map((item: { firstName: string }) => item.firstName),
    ).toEqual(['Alpha', 'Zulu']);

    const higher = await request(app.getHttpServer())
      .put('/api/v1/employees/EMP-900501/salary')
      .set('Authorization', `Bearer ${manager}`)
      .send({
        amountMinor: 200_000,
        currency: 'GBP',
        effectiveDate: '2024-01-15',
        version: 1,
        reason: 'Hire',
      });
    expect(higher.status).toBe(200);
    const lower = await request(app.getHttpServer())
      .put('/api/v1/employees/EMP-900502/salary')
      .set('Authorization', `Bearer ${manager}`)
      .send({
        amountMinor: 100_000,
        currency: 'GBP',
        effectiveDate: '2024-01-15',
        version: 1,
        reason: 'Hire',
      });
    expect(lower.status).toBe(200);

    const bySalary = await request(app.getHttpServer())
      .get('/api/v1/employees?search=sortkey&sort=salary&order=asc')
      .set('Authorization', `Bearer ${manager}`);
    expect(
      bySalary.body.items.map(
        (item: { employeeId: string }) => item.employeeId,
      ),
    ).toEqual(['EMP-900502', 'EMP-900501']);

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/employees/EMP-900501')
      .set('Authorization', `Bearer ${manager}`)
      .send({
        ...profile('EMP-900501', 'alpha.sortkey@example.test', 'Alpha'),
        department: 'Sales',
        version: 2,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.department).toBe('Sales');
    expect(updated.body.version).toBe(3);

    const removed = await request(app.getHttpServer())
      .delete('/api/v1/employees/EMP-900501')
      .set('Authorization', `Bearer ${manager}`)
      .send({ version: 3 });
    expect(removed.status).toBe(200);
    expect(
      await prisma.employee.findUnique({ where: { employeeId: 'EMP-900501' } }),
    ).toBeNull();
    expect(
      await prisma.salaryRecord.count({ where: { employeeId: 'EMP-900501' } }),
    ).toBe(0);
    expect(
      await prisma.auditLog.findFirst({
        where: { entityId: 'EMP-900501', action: 'EMPLOYEE_DELETE' },
      }),
    ).not.toBeNull();
  });

  function profile(employeeId: string, email: string, firstName: string) {
    return {
      employeeId,
      firstName,
      lastName: 'Sortkey',
      email,
      department: 'Engineering',
      country: 'GB',
      jobTitle: 'Engineer',
      status: 'Active',
      hireDate: '2024-01-15',
      terminationDate: null,
    };
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  }
});
