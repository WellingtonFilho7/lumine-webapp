import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SyncConflictDialog from './SyncConflictDialog';

describe('SyncConflictDialog', () => {
  test('clicking "Baixar agora" downloads also for server-new conflict', async () => {
    const downloadFromServer = jest.fn().mockResolvedValue(true);
    const setSyncModal = jest.fn();

    render(
      <SyncConflictDialog
        syncModal={{
          type: 'server-new',
          message: 'Há dados novos no servidor. Baixe os dados atuais antes de sincronizar.',
        }}
        setSyncModal={setSyncModal}
        downloadFromServer={downloadFromServer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /baixar agora/i }));

    await waitFor(() => {
      expect(downloadFromServer).toHaveBeenCalledTimes(1);
      expect(setSyncModal).toHaveBeenCalledWith(null);
    });
  });
});
