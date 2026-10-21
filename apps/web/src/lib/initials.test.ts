import { describe, expect, it } from 'vitest';
import { initialsFrom } from './initials';

describe('initialsFrom', () => {
  it('uses the first letter of the first two name parts', () => {
    expect(initialsFrom('HR Manager')).toBe('HM');
    expect(initialsFrom('directory.user@acme.test')).toBe('DU');
  });

  it('uses the first two letters of a single name', () => {
    expect(initialsFrom('Auditor')).toBe('AU');
  });
});
