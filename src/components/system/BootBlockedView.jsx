import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function BootBlockedView({ message, onRetry, loading = false }) {
  return (
    <div className="min-h-dvh bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-rose-100 p-2">
            <AlertTriangle className="h-5 w-5 text-rose-700" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900">Falha ao carregar dados</h1>
            <p className="text-sm text-slate-600">
              {message || 'Não foi possível iniciar o app com os dados do servidor.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Tentando novamente...' : 'Tentar novamente'}
        </button>
      </div>
    </div>
  );
}
