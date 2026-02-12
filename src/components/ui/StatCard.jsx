import React from 'react';
import { cn } from '../../utils/cn';

export default function StatCard({ value, label, color, icon: Icon }) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    indigo: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    amber: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={cn('rounded-lg border p-4', colors[color])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs opacity-80">{label}</p>
        </div>
        <Icon size={24} className="opacity-50" />
      </div>
    </div>
  );
}
