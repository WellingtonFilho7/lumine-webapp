import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export default function OnboardingModal({ open, onOpenChange, onLater, onDone }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6">
          <Dialog.Title className="text-balance text-lg font-semibold text-gray-900">
            Guia rápida (3 passos)
          </Dialog.Title>
          <Dialog.Description className="text-pretty mt-2 text-sm text-gray-600">
            Antes de começar, confira o essencial para registrar crianças e presenças sem perder dados.
          </Dialog.Description>
          <ol className="mt-4 space-y-3 text-pretty text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold tabular-nums text-cyan-800">
                1
              </span>
              <span className="text-pretty">Cadastre a criança na triagem e finalize a matrícula quando estiver aprovada.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold tabular-nums text-cyan-800">
                2
              </span>
              <span className="text-pretty">No registro diário, escolha presença e detalhe apenas quando necessário.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold tabular-nums text-cyan-800">
                3
              </span>
              <span className="text-pretty">Ao sincronizar, sempre baixe antes se houver dados novos no servidor.</span>
            </li>
          </ol>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={onLater} className="flex-1 rounded-lg bg-teal-50 py-3 text-sm font-semibold text-gray-700">
              Ver depois
            </button>
            <button type="button" onClick={onDone} className="flex-1 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-gray-900 hover:bg-orange-400">
              Entendi
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
