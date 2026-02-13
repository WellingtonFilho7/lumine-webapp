import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Users,
  XCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import StatCard from '../../components/ui/StatCard';

export default function DashboardDesktop({
  stats,
  alerts,
  children,
  dailyRecords,
  setSelectedChild,
  setView,
  isMatriculated,
  formatDate,
}) {
  const childrenById = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = dailyRecords.filter(r => r.date?.split('T')[0] === today);
  const activeChildren = children.filter(isMatriculated);
  const pendingToday = activeChildren.filter(c => !todayRecords.find(r => r.childInternalId === c.id));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <StatCard
          value={stats.present}
          label="Presentes hoje"
          color="green"
          icon={CheckCircle}
          size="lg"
        />
        <div className="grid grid-cols-3 gap-4">
          <StatCard value={stats.absent} label="Ausentes" color="red" icon={XCircle} size="sm" />
          <StatCard value={stats.total} label="Total" color="indigo" icon={Users} size="sm" />
          <StatCard
            value={stats.meals ?? 0}
            label="Refeições/mês"
            color="amber"
            icon={Calendar}
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {alerts.length > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-600" />
                <span className="text-balance text-sm font-semibold text-orange-800">Alertas recentes</span>
              </div>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <button
                    key={`${alert.childId}-${index}`}
                    onClick={() => {
                      const child = children.find(c => c.id === alert.childId);
                      if (child) {
                        setSelectedChild(child);
                        setView('child-detail');
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-left text-sm text-orange-900 hover:bg-white"
                  >
                    <span>
                      <strong>{alert.childName}:</strong> {alert.msg}
                    </span>
                    <ChevronRight size={16} className="text-orange-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-balance font-semibold text-gray-900">Pendências de hoje</h3>
              <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-gray-500 tabular-nums">
                {pendingToday.length} pendentes
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {pendingToday.length === 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="size-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900">Dia em dia</p>
                    <p className="text-xs text-green-700">Tudo registrado por hoje.</p>
                  </div>
                </div>
              )}
              {pendingToday.slice(0, 6).map(child => (
                <div key={child.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span className="truncate text-sm font-semibold text-gray-900">{child.name}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              ))}
            </div>
            {pendingToday.length > 0 && (
              <button
                onClick={() => setView('daily')}
                className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Ir para registros
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-balance font-semibold text-gray-900">Registros de hoje</h3>
            <span className="text-xs text-gray-500 tabular-nums">{todayRecords.length} registros</span>
          </div>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
            {todayRecords.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                <p className="text-pretty">Nenhum registro feito hoje.</p>
                <button
                  onClick={() => setView('daily')}
                  className="mt-3 w-full rounded-lg border border-cyan-200 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                >
                  Ir para registro
                </button>
              </div>
            )}
            {todayRecords.map(record => {
              const child = childrenById.get(record.childInternalId);
              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{child?.name || 'Criança'}</p>
                    <p className="text-xs text-gray-500">{formatDate(record.date)}</p>
                  </div>
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
        </div>
      </div>
    </div>
  );
}
