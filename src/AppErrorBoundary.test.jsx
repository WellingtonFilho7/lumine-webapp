import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./components/layout/Sidebar', () => () => null);
jest.mock('./components/layout/MobileNav', () => () => null);
jest.mock('./components/layout/FloatingActions', () => () => null);
jest.mock('./components/dialogs/OnboardingModal', () => () => null);
jest.mock('./components/dialogs/SyncConflictDialog', () => () => null);
jest.mock('./components/ui/SyncErrorNotice', () => () => null);
jest.mock('./components/ui/SyncActionButton', () => () => null);
jest.mock('./views/dashboard/DashboardDesktop', () => () => null);
jest.mock('./views/dashboard/DashboardView', () => () => {
  throw new Error('dashboard crash');
});
jest.mock('./hooks/useAuthSession', () => jest.fn());

import useAuthSession from './hooks/useAuthSession';
import LumineTracker from './App';

describe('App error boundary wiring', () => {
  test('renders fallback when a dashboard view throws', async () => {
    useAuthSession.mockReturnValue({
      authReady: true,
      authError: '',
      session: { access_token: 'test-jwt' },
      supabase: { auth: { signOut: jest.fn() } },
    });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { children: [], records: [] }, dataRev: 1 }),
    });

    render(<LumineTracker />);

    await waitFor(() => {
      expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
      expect(screen.getByText('O aplicativo encontrou um erro inesperado. Recarregue para continuar.')).toBeInTheDocument();
    });

    errorSpy.mockRestore();
  });
});
