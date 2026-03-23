import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ConfigView from './ConfigView';

const noop = () => {};

function buildResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function renderConfig(extraProps = {}) {
  return render(
    <ConfigView
      children={[]}
      dailyRecords={[]}
      apiBaseUrl="https://lumine-api.vercel.app/api"
      jsonHeaders={{ 'X-User-Jwt': 'jwt' }}
      syncWithServer={noop}
      downloadFromServer={noop}
      lastSync={null}
      isOnline={true}
      overwriteBlocked={false}
      clearLocalData={noop}
      reviewMode={false}
      setReviewMode={noop}
      onOpenOnboarding={noop}
      {...extraProps}
    />
  );
}

describe('ConfigView admin approvals', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'blob:backup');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows admin section when pending endpoint returns 200', async () => {
    global.fetch.mockResolvedValueOnce(
      buildResponse(200, {
        success: true,
        data: {
          items: [
            {
              id: 'u1',
              email: 'prof@lumine.org',
              nome: 'Prof Teste',
              papel: 'triagem',
              ativo: false,
              criado_em: '2026-03-04T10:00:00Z',
            },
          ],
          total: 1,
        },
      })
    );

    renderConfig();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getAllByText('Aprovação de usuários').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('prof@lumine.org').length).toBeGreaterThan(0);
  });

  it('hides admin section when user is forbidden', async () => {
    global.fetch.mockResolvedValueOnce(
      buildResponse(403, {
        success: false,
        error: 'FORBIDDEN_ROLE',
      })
    );

    renderConfig();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Aprovação de usuários')).not.toBeInTheDocument();
  });

  it('approves a pending user and removes it from list without refresh', async () => {
    global.fetch
      .mockResolvedValueOnce(
        buildResponse(200, {
          success: true,
          data: {
            items: [
              {
                id: 'u2',
                email: 'nova.prof@lumine.org',
                nome: 'Nova Prof',
                papel: 'triagem',
                ativo: false,
                criado_em: '2026-03-04T10:00:00Z',
              },
            ],
            total: 1,
          },
        })
      )
      .mockResolvedValueOnce(
        buildResponse(200, {
          success: true,
          data: {
            id: 'u2',
            email: 'nova.prof@lumine.org',
            nome: 'Nova Prof',
            papel: 'triagem',
            ativo: true,
            updated_at: '2026-03-04T10:10:00Z',
          },
        })
      );

    renderConfig();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getAllByText('nova.prof@lumine.org').length).toBeGreaterThan(0);
    });

    const approveButtons = screen.getAllByRole('button', { name: 'Aprovar' });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const [, secondCallOptions] = global.fetch.mock.calls[1];
    expect(secondCallOptions.method).toBe('POST');
    expect(JSON.parse(secondCallOptions.body)).toEqual({
      email: 'nova.prof@lumine.org',
      papel: 'triagem',
    });

    await waitFor(() => {
      expect(screen.queryByText('nova.prof@lumine.org')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText(/aprovado como triagem/i).length).toBeGreaterThan(0);
  });

  it('shows actionable error when pending request fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network fail'));

    renderConfig();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(
        screen.getAllByText('Falha de rede ao carregar pendências de acesso.').length
      ).toBeGreaterThan(0);
    });
  });

  it('downloads operational backup from admin card', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    global.fetch
      .mockResolvedValueOnce(
        buildResponse(200, {
          success: true,
          data: {
            items: [],
            total: 0,
          },
        })
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get(name) {
            if (name.toLowerCase() === 'content-disposition') {
              return 'attachment; filename="operational-backup-20260323_220000.json"';
            }
            return null;
          },
        },
        blob: async () => new Blob(['{}'], { type: 'application/json' }),
        json: async () => ({}),
      });

    renderConfig();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getAllByRole('button', { name: /gerar backup json/i })[0]);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(global.fetch.mock.calls[1][0]).toBe(
      'https://lumine-api.vercel.app/api/admin/operational-backup/download'
    );
    expect(clickSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getAllByText(/backup operacional baixado/i).length).toBeGreaterThan(0);
    });
  });
});
