import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ChildrenTable from './ChildrenTable';

const baseProps = {
  children: [],
  setSelectedChild: vi.fn(),
  setView: vi.fn(),
  searchTerm: '',
  setSearchTerm: vi.fn(),
  isTriageDraft: () => false,
  getEnrollmentStatus: child => child.enrollmentStatus,
  calculateAge: () => 7,
};

describe('ChildrenTable sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orders rows by name by default and can reorder by status', () => {
    const props = {
      ...baseProps,
      children: [
        { id: 'child-1', name: 'Zeca', birthDate: '2018-02-01', enrollmentStatus: 'matriculado' },
        { id: 'child-2', name: 'Ana', birthDate: '2018-02-01', enrollmentStatus: 'aprovado' },
        { id: 'child-3', name: 'Bruno', birthDate: '2018-02-01', enrollmentStatus: 'em_triagem' },
      ],
    };
    const { container } = render(<ChildrenTable {...props} />);

    const getNames = () =>
      Array.from(container.querySelectorAll('tbody tr td:first-child p.font-semibold')).map(element =>
        element.textContent?.trim()
      );

    expect(getNames()).toEqual(['Ana', 'Bruno', 'Zeca']);

    fireEvent.change(screen.getByLabelText(/ordenar por/i), { target: { value: 'status' } });

    expect(getNames()).toEqual(['Bruno', 'Ana', 'Zeca']);
  });

  it('shows only operational status filters', () => {
    render(<ChildrenTable {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Triagem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Matriculado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desistente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inativo' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Rascunhos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lista de espera' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Não atendida' })).not.toBeInTheDocument();
  });
});
