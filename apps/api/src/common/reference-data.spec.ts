import {
  resolveCountryCode,
  resolveDepartmentName,
  resolveStatusName,
} from './reference-data';

describe('reference data aliases', () => {
  it('accepts Portuguese names for countries, departments, and statuses', () => {
    expect(resolveCountryCode('Portugal')).toBe('PT');
    expect(resolveCountryCode('Brasil')).toBe('BR');
    expect(resolveCountryCode('Moçambique')).toBe('MZ');
    expect(resolveCountryCode('Guiné-Bissau')).toBe('GW');
    expect(resolveCountryCode('Cabo Verde')).toBe('CV');
    expect(resolveCountryCode('Timor-Leste')).toBe('TL');
    expect(resolveDepartmentName('Engenharia')).toBe('Engineering');
    expect(resolveDepartmentName('Finanças')).toBe('Finance');
    expect(resolveStatusName('Ativo')).toBe('Active');
    expect(resolveStatusName('De licença')).toBe('On Leave');
    expect(resolveStatusName('Desligado')).toBe('Terminated');
  });
});
