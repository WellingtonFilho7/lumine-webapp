import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('./components/layout/Sidebar', () => ({ default: () => null }));
vi.mock('./components/layout/MobileNav', () => ({ default: () => null }));
vi.mock('./components/layout/FloatingActions', () => ({ default: () => null }));
vi.mock('./components/dialogs/OnboardingModal', () => ({ default: () => null }));
vi.mock('./components/dialogs/SyncConflictDialog', () => ({ default: () => null }));
vi.mock('./components/ui/SyncErrorNotice', () => ({ default: () => null }));
vi.mock('./components/ui/SyncActionButton', () => ({ default: () => null }));
vi.mock('./views/dashboard/DashboardDesktop', () => ({ default: () => null }));
vi.mock('./views/dashboard/DashboardView', () => ({
  default: () => {
    throw new Error('dashboard crash');
  },
}));
vi.mock('./hooks/useAuthSession', () => ({ default: vi.fn() }));

import useAuthSession from './hooks/useAuthSession';
import LumineTracker from './App';

describe('App error boundary wiring', () => {
  test('renders fallback when a dashboard view throws', async () => {
    useAuthSession.mockReturnValue({
      authReady: true,
      authError: '',
      session: { access_token: 'test-jwt' },
      supabase: { auth: { signOut: vi.fn() } },
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
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
