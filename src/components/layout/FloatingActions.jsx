import React from 'react';
import { Calendar, Plus, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function FloatingActions({ view, setView, showFABMenu, setShowFABMenu }) {
  if (!(view === 'children' || view === 'daily' || view === 'dashboard')) {
    return null;
  }

  const isDashboard = view === 'dashboard';

  const handlePrimaryAction = () => {
    if (view === 'children') {
      setView('add-child');
      return;
    }
    if (view === 'daily') {
      window.dispatchEvent(new Event('lumine:daily-new-record'));
      return;
    }
    setShowFABMenu(prev => !prev);
  };

  const fabLabel =
    view === 'children'
      ? 'Nova criança'
      : view === 'daily'
      ? 'Novo registro'
      : showFABMenu
      ? 'Fechar ações'
      : 'Abrir ações';

  return (
    <>
      <div
        className="fixed right-4 z-40 lg:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}
      >
        {isDashboard && showFABMenu && (
          <div className="absolute bottom-16 right-0 mb-2 w-48 overflow-hidden rounded-lg border bg-white shadow-xl">
            <button
              type="button"
              onClick={() => {
                setView('add-child');
                setShowFABMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              <Users size={18} className="text-cyan-700" />
              <span className="text-sm font-medium">Nova Criança</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setView('daily');
                setShowFABMenu(false);
              }}
              className="flex w-full items-center gap-3 border-t px-4 py-3 text-left hover:bg-gray-50"
            >
              <Calendar size={18} className="text-green-600" />
              <span className="text-sm font-medium">Novo Registro</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handlePrimaryAction}
          className={cn(
            'flex size-14 items-center justify-center rounded-full shadow-lg transition-all',
            isDashboard && showFABMenu ? 'rotate-45 bg-gray-600' : 'bg-orange-500 hover:bg-orange-400'
          )}
          aria-label={fabLabel}
        >
          {view === 'children' ? (
            <Users size={24} className="text-white" />
          ) : view === 'daily' ? (
            <Calendar size={24} className="text-white" />
          ) : (
            <Plus size={28} className="text-white" />
          )}
        </button>
      </div>

      {isDashboard && showFABMenu && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => setShowFABMenu(false)}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        />
      )}
    </>
  );
}
