import { describe, expect, it } from 'vitest';
import type { ImportRow } from '../../api/types';
import { feedbackWorkbook } from './feedback-workbook';

const rows: ImportRow[] = [
  {
    row: 2,
    status: 'imported',
    employeeId: 'EMP-900011',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace.import@example.test',
    department: 'People',
    messages: [],
  },
  {
    row: 3,
    status: 'failed',
    employeeId: 'EMP-900010',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'not-an-email',
    department: 'Engineering',
    messages: ['Email must be a valid address'],
  },
];

describe('feedback workbook', () => {
  it('lists every employee with an import result and feedback column', async () => {
    const buffer = await readBuffer(feedbackWorkbook(rows));
    const bytes = new Uint8Array(buffer);
    const xml = new TextDecoder().decode(bytes);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(xml).toContain('Import result');
    expect(xml).toContain('Feedback');
    expect(xml).toContain('Imported successfully');
    expect(xml).toContain('Not imported');
    expect(xml).toContain('Email must be a valid address');
  });
});

function readBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}
