import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Users,
  XCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import StatCard from '../../components/ui/StatCard';

export default function DashboardView({
  stats,
  alerts,
  children,
  dailyRecords,
  setSelectedChild,
  setView,
  isMatriculated,
}) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = dailyRecords.filter(r => r.date?.split('T')[0] === today);
  const activeChildren = children.filter(isMatriculated);
  const pendingToday = activeChildren.filter(c => !todayRecords.find(r => r.childInternalId === c.id));
  const completedToday = Math.max(0, activeChildren.length - pendingToday.length);
  const progressPercent =
    activeChildren.length === 0 ? 0 : Math.round((completedToday / activeChildren.length) * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-balance font-semibold text-gray-900">Registrar hoje</h3>
          <span
            role="status"
            aria-live="polite"
            className="rounded-full bg-teal-50 px-2 py-1 text-xs text-gray-500 tabular-nums"
          >
            {pendingToday.length} pendentes
          </span>
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Progresso do dia</span>
            <span className="tabular-nums">
              {completedToday}/{activeChildren.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-teal-100">
            <div className="h-full rounded-full bg-cyan-600" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {pendingToday.length > 0 ? (
          <div className="space-y-2">
            {pendingToday.slice(0, 4).map(child => (
              <div key={child.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                <span className="flex-1 truncate text-sm font-semibold text-gray-900">{child.name}</span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setView('daily')}
              className="w-full rounded-lg bg-orange-500 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-orange-400"
            >
              Registrar agora
            </button>
          </div>
        ) : (
          <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-900">Dia em dia</p>
              <p className="text-xs text-green-700">Todas as crianças já foram registradas.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard value={stats.present} label="Presentes" color="green" icon={CheckCircle} size="sm" />
        <StatCard value={stats.absent} label="Ausentes" color="red" icon={XCircle} size="sm" />
        <StatCard value={stats.total} label="Total" color="indigo" icon={Users} size="sm" />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2 rounded-lg bg-white p-4 shadow-md">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-600" />
            <span className="text-balance text-sm font-semibold text-orange-800">Alertas</span>
          </div>
          {alerts.map((alert, index) => (
            <button
              key={`${alert.childId}-${index}`}
              type="button"
              onClick={() => {
                const child = children.find(c => c.id === alert.childId);
                if (child) {
                  setSelectedChild(child);
                  setView('child-detail');
                }
              }}
              className="block w-full border-l-4 border-orange-500 bg-orange-50 px-3 py-2 text-left text-sm text-orange-800"
              aria-label={`Ver alerta de ${alert.childName}`}
            >
              <strong>{alert.childName}:</strong> {alert.msg}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow-md">
        <h3 className="text-balance mb-3 font-semibold text-gray-900">Registros de hoje</h3>
        {todayRecords.length > 0 ? (
          <div className="space-y-2">
            {todayRecords.slice(0, 5).map(record => {
              const child = children.find(c => c.id === record.childInternalId);
              return (
                <div key={record.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                  <div
                    className={cn(
                      'size-2 rounded-full',
                      record.attendance === 'present'
                        ? 'bg-green-500'
                        : record.attendance === 'late'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                  />
                  <span className="flex-1 truncate text-sm font-semibold text-gray-900">
                    {child?.name || 'Criança'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      record.attendance === 'present'
                        ? 'bg-green-100 text-green-800'
                        : record.attendance === 'late'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    )}
                  >
                    {record.attendance === 'present'
                      ? 'Presente ✔'
                      : record.attendance === 'late'
                      ? 'Atrasado'
                      : 'Ausente'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
            <p className="text-pretty">Nenhum registro feito hoje.</p>
            <button
              type="button"
              onClick={() => setView('daily')}
              className="mt-3 w-full rounded-lg border border-cyan-200 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
            >
              Ir para registro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
