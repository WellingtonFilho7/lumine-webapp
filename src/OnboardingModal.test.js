import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./hooks/useAuthSession', () => jest.fn());
jest.mock('./utils/onboarding', () => ({
  getOnboardingFlag: () => false,
  setOnboardingFlag: jest.fn(),
  clearOnboardingFlag: jest.fn(),
}));

import useAuthSession from './hooks/useAuthSession';
import App from './App';

test('shows onboarding modal on first use and closes on Entendi', async () => {
  useAuthSession.mockReturnValue({
    authReady: true,
    authError: '',
    session: { access_token: 'test-jwt' },
    supabase: { auth: { signOut: jest.fn() } },
  });

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
