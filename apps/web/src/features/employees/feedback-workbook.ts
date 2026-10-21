import type { ImportRow } from '../../api/types';

const HEADERS = [
  'Row',
  'Employee ID',
  'First name',
  'Last name',
  'Email',
  'Department',
  'Import result',
  'Feedback',
] as const;

export function feedbackWorkbook(rows: ImportRow[]): Blob {
  const files = new Map<string, Uint8Array>([
    ['[Content_Types].xml', text(contentTypes)],
    ['_rels/.rels', text(packageRels)],
    ['xl/workbook.xml', text(workbookXml)],
    ['xl/_rels/workbook.xml.rels', text(workbookRels)],
    ['xl/worksheets/sheet1.xml', text(sheetXml(rows))],
  ]);
  return new Blob([zipStore(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function feedbackFor(row: ImportRow): {
  result: string;
  message: string;
} {
  if (row.status === 'imported') {
    return { result: 'Imported', message: 'Imported successfully' };
  }
  return {
    result: 'Not imported',
    message: row.messages.join('; ') || 'Not imported',
  };
}

function sheetXml(rows: ImportRow[]): string {
  const table = [
    HEADERS,
    ...rows.map((row) => {
      const feedback = feedbackFor(row);
      return [
        String(row.row),
        row.employeeId,
        row.firstName,
        row.lastName,
        row.email,
        row.department,
        feedback.result,
        feedback.message,
      ];
    }),
  ];
  const body = table
    .map((cells, index) => {
      const rowNumber = index + 1;
      const columns = cells
        .map((value, column) => cellXml(column, rowNumber, value))
        .join('');
      return `<row r="${rowNumber}">${columns}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${body}</sheetData>
</worksheet>`;
}

function cellXml(column: number, row: number, value: string): string {
  const ref = `${columnName(column)}${row}`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function columnName(index: number): string {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const packageRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Import feedback" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

function text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function zipStore(files: Map<string, Uint8Array>): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBytes = text(name);
    const checksum = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0x21),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0x21),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const directory = concat(centrals);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.size),
    u16(files.size),
    u32(directory.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, directory, end]);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
