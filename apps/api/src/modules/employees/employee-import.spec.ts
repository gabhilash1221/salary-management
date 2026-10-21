import ExcelJS from 'exceljs';
import { IMPORT_HEADERS, SAMPLE_ROWS } from './employee-import.columns';
import { parseCsv, parseImportFile } from './employee-import.parse';
import {
  buildCsvTemplate,
  buildXlsxTemplate,
} from './employee-import.template';
import { classifyRows, formatEmployeeId } from './employee-import.validate';

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
  annualAmount: '',
  currency: '',
  salaryEffectiveDate: '',
  reason: '',
};

function csvOf(rows: Array<Partial<typeof base>>): string {
  const lines = [
    IMPORT_HEADERS.join(','),
    ...rows.map((row) => {
      const values = { ...base, ...row };
      return IMPORT_HEADERS.map((header) => csvCell(values[header])).join(',');
    }),
  ];
  return lines.join('\n');
}

function upload(text: string, name = 'employees.csv') {
  return { originalname: name, buffer: Buffer.from(text, 'utf8') };
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

const emptyExisting = { ids: new Set<string>(), emails: new Set<string>() };

describe('employee import files', () => {
  it('parses the CSV template into two ready employees', async () => {
    const rows = await parseImportFile(
      upload(buildCsvTemplate(), 'employees.csv'),
    );
    const classified = classifyRows(rows, emptyExisting, 2_147_483_647);
    expect(classified.map((row) => row.view.status)).toEqual([
      'ready',
      'ready',
    ]);
    expect(classified[0]?.draft?.salary?.amountMinor).toBe(12_000_000);
    expect(classified[0]?.draft?.country).toBe('GB');
    expect(classified[1]?.draft?.salary).toBeNull();
  });

  it('parses the Excel template into the same employees', async () => {
    const buffer = await buildXlsxTemplate();
    const rows = await parseImportFile({
      originalname: 'employees.xlsx',
      buffer,
    });
    const classified = classifyRows(rows, emptyExisting, 2_147_483_647);
    expect(classified.map((row) => row.view.email)).toEqual([
      'ada.lovelace@example.test',
      'grace.hopper@example.test',
    ]);
    expect(classified.every((row) => row.view.status === 'ready')).toBe(true);
  });

  it('reads quoted CSV fields and Excel numbers', async () => {
    const parsed = parseCsv(
      'employeeId,firstName\n"EMP-900010","Hopper, Grace"\n',
    );
    expect(parsed[1]).toEqual(['EMP-900010', 'Hopper, Grace']);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');
    sheet.addRow([...IMPORT_HEADERS]);
    const data = sheet.addRow(SAMPLE_ROWS[0]);
    data.getCell(11).value = 120000;
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const rows = await parseImportFile({
      originalname: 'numbers.xlsx',
      buffer,
    });
    expect(rows[0]?.values.annualAmount).toBe('120000');
  });

  it('rejects invalid files, missing columns, and too many rows', async () => {
    await expect(
      parseImportFile(upload('employeeId,firstName\nEMP-900010,Ada\n')),
    ).rejects.toThrow(/Missing required columns: lastName/);
    await expect(
      parseImportFile(upload(`${IMPORT_HEADERS.join(',')},nickname\n`)),
    ).rejects.toThrow(/Unknown columns: nickname/);
    await expect(
      parseImportFile(upload(`${IMPORT_HEADERS.join(',')}\n`)),
    ).rejects.toThrow(/no employee rows/);
    await expect(
      parseImportFile({
        originalname: 'notes.txt',
        buffer: Buffer.from('hello'),
      }),
    ).rejects.toThrow(/Upload a \.csv or \.xlsx file/);
    await expect(
      parseImportFile({
        originalname: 'bad.xlsx',
        buffer: Buffer.from('not-a-workbook'),
      }),
    ).rejects.toThrow(/not a valid Excel workbook/);
    await expect(
      parseImportFile({
        originalname: 'bad.csv',
        buffer: Buffer.from([0x61, 0x00]),
      }),
    ).rejects.toThrow(/not a valid CSV/);

    const extra = Array.from({ length: 2001 }, (_, index) => ({
      employeeId: formatEmployeeId(index + 1),
      email: `person${index}@example.test`,
    }));
    await expect(parseImportFile(upload(csvOf(extra)))).rejects.toThrow(
      /limited to 2000/,
    );
  });
});

describe('employee import validation', () => {
  it('skips duplicates and keeps the other rows', async () => {
    const rows = await parseImportFile(
      upload(
        csvOf([
          { employeeId: 'EMP-900010', email: 'ada.import@example.test' },
          { employeeId: 'EMP-900011', email: 'ada.import@example.test' },
          {
            employeeId: 'EMP-000001',
            email: 'existing.person@example.test',
          },
          {
            employeeId: 'EMP-900012',
            email: 'valid.person@example.test',
            department: 'Nope',
          },
        ]),
      ),
    );
    const classified = classifyRows(
      rows,
      {
        ids: new Set(['EMP-000001']),
        emails: new Set(['existing.person@example.test']),
      },
      2_147_483_647,
    );
    expect(classified.map((row) => row.view.status)).toEqual([
      'ready',
      'skipped',
      'skipped',
      'failed',
    ]);
    expect(classified[1]?.view.messages.join(' ')).toMatch(
      /duplicated in this file/,
    );
    expect(classified[2]?.view.messages.join(' ')).toMatch(/already exists/);
    expect(classified[3]?.view.messages.join(' ')).toMatch(
      /Department must be one of/,
    );
  });

  it('assigns the next employee id and canonical values', async () => {
    const rows = await parseImportFile(
      upload(
        csvOf([
          {
            employeeId: '',
            email: 'first.blank@example.test',
            country: 'United Kingdom',
            status: 'active',
            annualAmount: '1,200.50',
            currency: 'gbp',
          },
          { employeeId: '', email: 'second.blank@example.test' },
        ]),
      ),
    );
    const classified = classifyRows(
      rows,
      { ids: new Set(['EMP-000010']), emails: new Set() },
      2_147_483_647,
    );
    expect(classified[0]?.view).toMatchObject({
      status: 'ready',
      employeeId: 'EMP-000011',
      department: 'Engineering',
    });
    expect(classified[0]?.draft).toMatchObject({
      country: 'GB',
      status: 'Active',
      salary: { amountMinor: 120_050, currency: 'GBP' },
    });
    expect(classified[1]?.view.employeeId).toBe('EMP-000012');
  });

  it('rejects formula text, bad dates, and amounts above the cap', async () => {
    const rows = await parseImportFile(
      upload(
        csvOf([
          { firstName: '=Ada', email: 'formula.person@example.test' },
          {
            employeeId: 'EMP-900021',
            email: 'terminated.person@example.test',
            status: 'Terminated',
          },
          {
            employeeId: 'EMP-900022',
            email: 'rich.person@example.test',
            annualAmount: '999999',
            currency: 'USD',
          },
        ]),
      ),
    );
    const classified = classifyRows(rows, emptyExisting, 1_000_000);
    expect(classified[0]?.view.messages.join(' ')).toMatch(/cannot start with/);
    expect(classified[1]?.view.messages.join(' ')).toMatch(
      /require a termination date/,
    );
    expect(classified[2]?.view.messages.join(' ')).toMatch(
      /exceeds the configured maximum/,
    );
    expect(classified.every((row) => row.draft === null)).toBe(true);
  });
});
