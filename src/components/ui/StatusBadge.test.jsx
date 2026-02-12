import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders known status label', () => {
    render(<StatusBadge status="matriculado" />);
    expect(screen.getByText('Matriculado')).not.toBeNull();
  });

  it('falls back to pre-inscrito for unknown status', () => {
    render(<StatusBadge status="desconhecido" />);
    expect(screen.getByText('Pré-inscrito')).not.toBeNull();
  });
});
