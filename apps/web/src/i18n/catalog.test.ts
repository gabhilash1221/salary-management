import { describe, expect, it } from 'vitest';
import { countryLabel, departmentLabel, statusLabel, text } from './catalog';

describe('catalog', () => {
  it('translates interface text and keeps stored values labeled', () => {
    expect(text('pt', 'nav.employees')).toBe('Colaboradores');
    expect(
      text('pt', 'employees.deleteBody', { id: 'EMP-000001', name: 'Ana' }),
    ).toContain('EMP-000001');
    expect(departmentLabel('pt', 'Engineering')).toBe('Engenharia');
    expect(statusLabel('pt', 'On Leave')).toBe('De licença');
    expect(countryLabel('pt', 'PT')).toBe('Portugal');
    expect(countryLabel('en', 'ST')).toBe('São Tomé and Príncipe');
    expect(departmentLabel('en', 'Engineering')).toBe('Engineering');
  });
});
