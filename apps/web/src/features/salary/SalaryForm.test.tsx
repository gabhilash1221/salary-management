import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SalaryForm } from './SalaryForm';

describe('SalaryForm', () => {
  it('exposes labelled inputs', () => {
    render(
      <SalaryForm pending={false} error={null} onSubmit={() => undefined} />,
    );
    expect(screen.getByLabelText('Annual amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Currency')).toBeInTheDocument();
    expect(screen.getByLabelText('Effective date')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });
});
