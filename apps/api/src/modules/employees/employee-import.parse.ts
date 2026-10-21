import ExcelJS from 'exceljs';
import {
  IMPORT_HEADERS,
  ImportFileError,
  type ImportHeader,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  type ParsedRow,
} from './employee-import.columns';

const HEADER_SET = new Set<string>(IMPORT_HEADERS);

export type ImportUpload = {
  originalname: string;
  buffer: Buffer;
};

export async function parseImportFile(
  file: ImportUpload,
): Promise<ParsedRow[]> {
  const name = file.originalname.toLowerCase();
  const isCsv = name.endsWith('.csv');
  const isXlsx = name.endsWith('.xlsx');
  if (!isCsv && !isXlsx) {
    throw new ImportFileError('Upload a .csv or .xlsx file');
  }
  if (file.buffer.length === 0) {
    throw new ImportFileError('The file is empty');
  }
  if (file.buffer.length > MAX_IMPORT_BYTES) {
    throw new ImportFileError('File exceeds the 2 MB limit');
  }
  if (isCsv) {
    if (file.buffer.includes(0)) {
      throw new ImportFileError('File is not a valid CSV');
    }
    return rowsFromGrid(parseCsv(file.buffer.toString('utf8')));
  }
  if (
    file.buffer.length < 4 ||
    file.buffer[0] !== 0x50 ||
    file.buffer[1] !== 0x4b
  ) {
    throw new ImportFileError('File is not a valid Excel workbook');
  }
  return rowsFromGrid(await readXlsx(file.buffer));
}

export function parseCsv(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? '';
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  if (quoted) {
    throw new ImportFileError('CSV has an unterminated quoted value');
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function rowsFromGrid(grid: string[][]): ParsedRow[] {
  const headerRow = grid[0];
  if (!headerRow || headerRow.every((cell) => cell.trim() === '')) {
    throw new ImportFileError('The file is empty');
  }
  const header = headerRow.map((cell) => cell.trim());
  while (header.length > 0 && header[header.length - 1] === '') {
    header.pop();
  }

  const missing = IMPORT_HEADERS.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    throw new ImportFileError(
      `Missing required columns: ${missing.join(', ')}`,
    );
  }
  const unknown = header.filter((name) => name !== '' && !HEADER_SET.has(name));
  if (unknown.length > 0) {
    throw new ImportFileError(`Unknown columns: ${unknown.join(', ')}`);
  }
  const seen = new Set<string>();
  for (const name of header) {
    if (name === '') continue;
    if (seen.has(name)) {
      throw new ImportFileError(`Duplicate column: ${name}`);
    }
    seen.add(name);
  }

  const indexOf = new Map(header.map((name, index) => [name, index]));
  const parsed: ParsedRow[] = [];
  for (let index = 1; index < grid.length; index += 1) {
    const cells = grid[index] ?? [];
    const values = {} as Record<ImportHeader, string>;
    let blank = true;
    for (const name of IMPORT_HEADERS) {
      const column = indexOf.get(name) ?? -1;
      const value = (cells[column] ?? '').trim();
      values[name] = value;
      if (value !== '') blank = false;
    }
    if (blank) continue;
    parsed.push({ row: index + 1, values });
    if (parsed.length > MAX_IMPORT_ROWS) {
      throw new ImportFileError(
        `Import is limited to ${MAX_IMPORT_ROWS} employees`,
      );
    }
  }
  if (parsed.length === 0) {
    throw new ImportFileError('The file has no employee rows');
  }
  return parsed;
}

async function readXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<ExcelJS.Xlsx['load']>[0],
    );
  } catch {
    throw new ImportFileError('File is not a valid Excel workbook');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ImportFileError('The workbook has no worksheets');
  }

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > MAX_IMPORT_ROWS + 1) return;
    const width = Math.max(row.cellCount, IMPORT_HEADERS.length);
    const cells: string[] = [];
    for (let column = 1; column <= width; column += 1) {
      cells.push(cellText(row.getCell(column).value));
    }
    grid[rowNumber - 1] = cells;
  });

  const dense: string[][] = [];
  for (let index = 0; index < grid.length; index += 1) {
    dense.push(grid[index] ?? []);
  }
  return dense;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return formatExcelDate(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') {
    if ('formula' in value && value.formula) {
      const formula = String(value.formula);
      return formula.startsWith('=') ? formula : `=${formula}`;
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result != null) {
      return cellText(value.result);
    }
  }
  return '';
}

function formatExcelDate(value: Date): string {
  const midnightUtc =
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0;
  const year = midnightUtc ? value.getUTCFullYear() : value.getFullYear();
  const month = (midnightUtc ? value.getUTCMonth() : value.getMonth()) + 1;
  const day = midnightUtc ? value.getUTCDate() : value.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
