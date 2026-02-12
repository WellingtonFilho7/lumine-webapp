import React from 'react';
import { Calendar, Home, Settings, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm font-medium transition',
        active ? 'bg-cyan-700 text-white' : 'text-cyan-100 hover:bg-white/10'
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

export default function Sidebar({ view, setView, lastSyncLabel, isOnline }) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:bg-gray-900 lg:text-white">
      <div className="px-6 py-6">
        <p className="text-xs uppercase text-cyan-300">Instituto</p>
        <h2 className="text-balance mt-2 text-2xl font-semibold text-white">Lumine</h2>
        <p className="mt-1 text-xs text-cyan-200">Sistema de Acompanhamento</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        <SidebarItem
          icon={Home}
          label="Dashboard"
          active={view === 'dashboard'}
          onClick={() => setView('dashboard')}
        />
        <SidebarItem
          icon={Users}
          label="Crianças"
          active={view === 'children' || view === 'add-child' || view === 'child-detail'}
          onClick={() => setView('children')}
        />
        <SidebarItem
          icon={Calendar}
          label="Registro"
          active={view === 'daily'}
          onClick={() => setView('daily')}
        />
        <SidebarItem
          icon={Settings}
          label="Configurações"
          active={view === 'config'}
          onClick={() => setView('config')}
        />
      </nav>
      <div className="border-t border-white/10 px-6 py-4 text-xs text-cyan-200">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-rose-400')} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <p className="mt-2">Última sync: {lastSyncLabel || 'Nenhuma'}</p>
      </div>
    </aside>
  );
}
