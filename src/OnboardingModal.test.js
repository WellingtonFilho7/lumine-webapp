import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('./utils/onboarding', () => ({
  getOnboardingFlag: () => false,
  setOnboardingFlag: jest.fn(),
  clearOnboardingFlag: jest.fn(),
}));

test('shows onboarding modal on first use and closes on Entendi', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { children: [], records: [] }, dataRev: 1 }),
  });

  render(<App />);
  await waitFor(() => {
    expect(screen.getByText('Guia rápida (3 passos)')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText('Entendi'));
  expect(screen.queryByText('Guia rápida (3 passos)')).not.toBeInTheDocument();
});
