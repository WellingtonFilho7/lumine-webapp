import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

export default function ClearLocalDataDialog({ onConfirm, triggerClassName }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button className={triggerClassName}>Sair e limpar dados deste dispositivo</button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6">
          <AlertDialog.Title className="text-lg font-bold">Confirmar</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600">
            Isso vai apagar todos os dados locais. Os dados no servidor não serão afetados.
          </AlertDialog.Description>
          <div className="mt-6 flex gap-3">
            <AlertDialog.Cancel asChild>
              <button className="flex-1 rounded-lg bg-teal-50 py-3 font-medium">Cancelar</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button onClick={onConfirm} className="flex-1 rounded-lg bg-rose-600 py-3 font-medium text-white">
                Confirmar e limpar
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
