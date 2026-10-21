import ExcelJS from 'exceljs';
import { IMPORT_HEADERS, SAMPLE_ROWS } from './employee-import.columns';

export function buildCsvTemplate(): string {
  const lines = [IMPORT_HEADERS.join(','), ...SAMPLE_ROWS.map(csvLine)];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export async function buildXlsxTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ACME Salary Management';
  const sheet = workbook.addWorksheet('Employees');
  const header = sheet.addRow([...IMPORT_HEADERS]);
  header.font = { bold: true };
  for (const sample of SAMPLE_ROWS) sheet.addRow(sample);
  sheet.columns.forEach((column) => {
    column.width = 22;
  });
  const contents = await workbook.xlsx.writeBuffer();
  return Buffer.from(contents);
}

function csvLine(cells: readonly string[]): string {
  return cells.map(csvCell).join(',');
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
