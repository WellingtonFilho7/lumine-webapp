import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export default function SyncConflictDialog({ syncModal, setSyncModal, downloadFromServer }) {
  return (
    <Dialog.Root
      open={Boolean(syncModal)}
      onOpenChange={open => {
        if (!open) setSyncModal(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6">
          <Dialog.Title className="text-lg font-bold">Atenção</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-600">{syncModal?.message}</Dialog.Description>
          <div className="mt-6 flex gap-3">
            <Dialog.Close asChild>
              <button className="flex-1 rounded-lg bg-teal-50 py-3 font-medium">Cancelar</button>
            </Dialog.Close>
            <button
              onClick={async () => {
                try {
                  if (syncModal?.type === 'revision-mismatch') {
                    await downloadFromServer();
                  }
                } finally {
                  setSyncModal(null);
                }
              }}
              className="flex-1 rounded-lg bg-orange-500 py-3 font-medium text-gray-900 hover:bg-orange-400"
            >
              Baixar agora
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
