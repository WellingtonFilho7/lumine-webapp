import React from 'react';
import { cn } from '../../utils/cn';

const COLOR_CLASS_MAP = {
  green: 'bg-green-50 text-green-700 border-green-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  indigo: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  amber: 'bg-orange-50 text-orange-700 border-orange-100',
};

const SIZE_CLASS_MAP = {
  sm: {
    wrapper: 'p-3',
    value: 'text-lg font-bold',
    label: 'text-[11px]',
    icon: 'size-5',
  },
  md: {
    wrapper: 'p-4',
    value: 'text-2xl font-extrabold',
    label: 'text-xs',
    icon: 'size-6',
  },
  lg: {
    wrapper: 'p-5',
    value: 'text-3xl font-extrabold',
    label: 'text-sm',
    icon: 'size-7',
  },
};

export default function StatCard({ value, label, color, icon: Icon, size = 'md', className }) {
  const sizeConfig = SIZE_CLASS_MAP[size] || SIZE_CLASS_MAP.md;

  return (
    <div
      className={cn(
        'rounded-lg border shadow-sm',
        COLOR_CLASS_MAP[color] || COLOR_CLASS_MAP.indigo,
        sizeConfig.wrapper,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('tabular-nums leading-none', sizeConfig.value)}>{value}</p>
          <p className={cn('mt-1 opacity-90', sizeConfig.label)}>{label}</p>
        </div>
        <Icon className={cn('shrink-0 opacity-60', sizeConfig.icon)} />
      </div>
    </div>
  );
}
