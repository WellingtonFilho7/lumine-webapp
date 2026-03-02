import React, { useState } from 'react';

export default function LoginView({ onLogin, loading = false, error = '', authError = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <div className="min-h-dvh bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Instituto Lumine</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Acesso interno</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entre com seu usuário para acessar os cadastros e registros.
        </p>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-600"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Senha</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-600"
              autoComplete="current-password"
            />
          </label>

          {(error || authError) && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error || authError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
