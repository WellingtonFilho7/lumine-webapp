import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  setSelectedChild: jest.fn(),
  setView: jest.fn(),
  searchTerm: '',
  setSearchTerm: jest.fn(),
  isTriageDraft: () => false,
  getEnrollmentStatus: child => child.enrollmentStatus,
  calculateAge: () => 7,
};

describe('ChildrenView mobile filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
