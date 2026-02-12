import React from 'react';
import { render, screen } from '@testing-library/react';
import ChildAvatar from './ChildAvatar';

describe('ChildAvatar', () => {
  it('renders initials for a full name', () => {
    render(<ChildAvatar name="Maria Silva" status="matriculado" />);
    expect(screen.getByText('MS')).not.toBeNull();
  });

  it('renders fallback character when name is empty', () => {
    render(<ChildAvatar name="" status="matriculado" />);
    expect(screen.getByText('?')).not.toBeNull();
  });
});
