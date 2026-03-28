import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ChildrenView from './ChildrenView';

const baseProps = {
  children: [
    {
      id: 'child-1',
      name: 'Ana Clara',
      birthDate: '2018-02-01',
      enrollmentStatus: 'matriculado',
    },
  ],
  setSelectedChild: vi.fn(),
  setView: vi.fn(),
  searchTerm: '',
  setSearchTerm: vi.fn(),
  isTriageDraft: () => false,
  getEnrollmentStatus: child => child.enrollmentStatus,
  calculateAge: () => 7,
};

describe('ChildrenView mobile filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows horizontal scrollable filters and status border card', () => {
    const { container } = render(<ChildrenView {...baseProps} />);

    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).not.toBeNull();

    const card = screen.getByText('Ana Clara').closest('div[class*="border-l-"]');
    expect(card).not.toBeNull();
  });

  it('opens child detail when tapping card', () => {
    render(<ChildrenView {...baseProps} />);

    fireEvent.click(screen.getByText('Ana Clara'));
    expect(baseProps.setSelectedChild).toHaveBeenCalled();
    expect(baseProps.setView).toHaveBeenCalledWith('child-detail');
  });

  it('orders children by name by default and can reorder by status', () => {
    const props = {
      ...baseProps,
      children: [
        { id: 'child-1', name: 'Zeca', birthDate: '2018-02-01', enrollmentStatus: 'matriculado' },
        { id: 'child-2', name: 'Ana', birthDate: '2018-02-01', enrollmentStatus: 'aprovado' },
        { id: 'child-3', name: 'Bruno', birthDate: '2018-02-01', enrollmentStatus: 'em_triagem' },
      ],
    };
    const { container } = render(<ChildrenView {...props} />);

    const getNames = () =>
      Array.from(container.querySelectorAll('h3')).map(element => element.textContent?.trim());

    expect(getNames()).toEqual(['Ana', 'Bruno', 'Zeca']);

    fireEvent.change(screen.getByLabelText(/ordenar por/i), { target: { value: 'status' } });

    expect(getNames()).toEqual(['Bruno', 'Ana', 'Zeca']);
  });
});
