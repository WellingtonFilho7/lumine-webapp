import React from 'react';
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

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <StatCard
          value={stats.present}
          label="Presentes"
          color="green"
          icon={CheckCircle}
          size="lg"
        />
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={stats.absent} label="Ausentes" color="red" icon={XCircle} size="sm" />
          <StatCard value={stats.total} label="Total" color="indigo" icon={Users} size="sm" />
          <StatCard
            value={stats.meals ?? 0}
            label="Refeições"
            color="amber"
            icon={Calendar}
            size="sm"
          />
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-600" />
            <span className="text-balance text-sm font-semibold text-orange-800">Alertas</span>
          </div>
          {alerts.map((a, i) => (
            <div
              key={i}
              onClick={() => {
                const child = children.find(c => c.id === a.childId);
                if (child) {
                  setSelectedChild(child);
                  setView('child-detail');
                }
              }}
              className="cursor-pointer py-1 text-sm text-orange-700 hover:underline"
            >
              <strong>{a.childName}:</strong> {a.msg}
            </div>
          ))}
        </div>
      )}

      {pendingToday.length > 0 && (
        <div className="rounded-lg bg-white p-4 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-balance font-semibold text-gray-900">Registrar hoje</h3>
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-gray-500 tabular-nums">
              {pendingToday.length} pendentes
            </span>
          </div>
          <div className="space-y-2">
            {pendingToday.slice(0, 5).map(child => (
              <div key={child.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                <span className="flex-1 truncate text-sm font-semibold text-gray-900">{child.name}</span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            ))}
            {pendingToday.length > 5 && (
              <button
                onClick={() => setView('daily')}
                className="w-full py-2 text-center text-sm font-semibold text-cyan-700"
              >
                Ver todos ({pendingToday.length})
              </button>
            )}
          </div>
        </div>
      )}

      {todayRecords.length > 0 && (
        <div className="rounded-lg bg-white p-4 shadow-md">
          <h3 className="text-balance mb-3 font-semibold text-gray-900">Registros de hoje</h3>
          <div className="space-y-2">
            {todayRecords.slice(0, 5).map(rec => {
              const child = children.find(c => c.id === rec.childInternalId);
              return (
                <div key={rec.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                  <div
                    className={cn(
                      'size-2 rounded-full',
                      rec.attendance === 'present'
                        ? 'bg-green-500'
                        : rec.attendance === 'late'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                  />
                  <span className="flex-1 truncate text-sm font-semibold text-gray-900">
                    {child?.name || 'Criança'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {rec.attendance === 'present'
                      ? 'Presente'
                      : rec.attendance === 'late'
                      ? 'Atrasado'
                      : 'Ausente'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
