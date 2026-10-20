import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows the empty message', () => {
    render(<EmptyState message="No employees found" />);
    expect(screen.getByText('No employees found')).toBeInTheDocument();
  });
});
