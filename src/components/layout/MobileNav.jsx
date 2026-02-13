import React from 'react';
import { Calendar, Home, Settings, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button type="button"
      onClick={onClick}
      className={cn(
        'flex h-full w-16 flex-col items-center justify-center transition-colors',
        active ? 'text-cyan-700' : 'text-gray-400'
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className={cn('mt-1 text-xs', active && 'font-semibold')}>{label}</span>
    </button>
  );
}

export default function MobileNav({ view, setView }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white shadow-lg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        <NavItem icon={Home} label="Início" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        <NavItem
          icon={Users}
          label="Crianças"
          active={view === 'children' || view === 'add-child' || view === 'child-detail'}
          onClick={() => setView('children')}
        />
        <NavItem icon={Calendar} label="Registro" active={view === 'daily'} onClick={() => setView('daily')} />
        <NavItem icon={Settings} label="Config" active={view === 'config'} onClick={() => setView('config')} />
      </div>
    </nav>
  );
}
