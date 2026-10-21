import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SalaryForm } from './SalaryForm';

describe('SalaryForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes labelled inputs', () => {
    render(
      <SalaryForm pending={false} error={null} onSubmit={() => undefined} />,
    );
    expect(screen.getByLabelText('Annual amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Currency')).toBeInTheDocument();
    expect(screen.getByLabelText('Effective date')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('starts on the day after the latest salary record', () => {
    render(
      <SalaryForm
        pending={false}
        error={null}
        earliestDate="2026-10-21"
        latestSalaryDate="2026-10-20"
        defaultCurrency="INR"
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Effective date')).toHaveValue('2026-10-21');
    expect(
      screen.getByText(/Use 2026-10-21 or a later date/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Currency')).toHaveValue('INR');
  });

  it('reports an amount that is not a positive number', () => {
    const onSubmit = vi.fn();
    render(<SalaryForm pending={false} error={null} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Annual amount'), {
      target: { value: 'abc' },
    });
    const button = screen.getByRole('button', { name: 'Update salary' });
    fireEvent.submit(button.closest('form') as HTMLFormElement);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter an annual amount greater than zero.',
    );
  });
});
