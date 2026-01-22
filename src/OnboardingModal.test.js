import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('./utils/onboarding', () => ({
  getOnboardingFlag: () => false,
  setOnboardingFlag: jest.fn(),
  clearOnboardingFlag: jest.fn(),
}));

test('shows onboarding modal on first use and closes on Entendi', () => {
  render(<App />);
  expect(screen.getByText('Guia rápida (3 passos)')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Entendi'));
  expect(screen.queryByText('Guia rápida (3 passos)')).not.toBeInTheDocument();
});
