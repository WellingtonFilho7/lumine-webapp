import React from 'react';
import {
  ArrowUp,
  CheckCircle,
  Circle,
  Clock,
  Minus,
  UserX,
  XCircle,
} from 'lucide-react';
import { ENROLLMENT_STATUS_META } from '../../constants/enrollment';
import { cn } from '../../utils/cn';

const STATUS_ICON_MAP = {
  matriculado: CheckCircle,
  em_triagem: Clock,
  aprovado: CheckCircle,
  lista_espera: ArrowUp,
  pre_inscrito: Circle,
  recusado: XCircle,
  desistente: UserX,
  inativo: Minus,
};

const STATUS_AVATAR_CLASS_MAP = {
  matriculado: 'bg-green-100 text-green-800',
  em_triagem: 'bg-amber-100 text-amber-800',
  aprovado: 'bg-cyan-100 text-cyan-800',
  lista_espera: 'bg-blue-100 text-blue-800',
  pre_inscrito: 'bg-gray-100 text-gray-700',
  recusado: 'bg-red-100 text-red-800',
  desistente: 'bg-gray-100 text-gray-600',
  inativo: 'bg-gray-100 text-gray-500',
};

export function getStatusVisual(status) {
  const normalizedStatus = status || 'pre_inscrito';
  const fallbackMeta = ENROLLMENT_STATUS_META.pre_inscrito;
  const meta = ENROLLMENT_STATUS_META[normalizedStatus] || fallbackMeta;
  return {
    label: meta.label || fallbackMeta.label,
    badgeClassName: meta.className || fallbackMeta.className,
    avatarClassName:
      STATUS_AVATAR_CLASS_MAP[normalizedStatus] || STATUS_AVATAR_CLASS_MAP.pre_inscrito,
    Icon: STATUS_ICON_MAP[normalizedStatus] || Circle,
  };
}

export default function StatusBadge({ status, size = 'sm', className }) {
  const { label, badgeClassName, Icon } = getStatusVisual(status);
  const iconSizeClass = size === 'sm' ? 'size-3' : 'size-4';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
        size === 'sm' ? 'text-xs' : 'text-sm',
        badgeClassName,
        className
      )}
    >
      <Icon className={iconSizeClass} />
      {label}
    </span>
  );
}
