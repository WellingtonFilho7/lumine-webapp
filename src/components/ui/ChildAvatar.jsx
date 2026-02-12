import React from 'react';
import { cn } from '../../utils/cn';
import { getStatusVisual } from './StatusBadge';

const SIZE_CLASS_MAP = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-20 text-2xl',
};

function getInitials(name) {
  if (typeof name !== 'string') return '?';
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!tokens.length) return '?';
  return tokens.map(token => token[0].toUpperCase()).join('');
}

export default function ChildAvatar({ name, status, size = 'md', className }) {
  const { avatarClassName } = getStatusVisual(status);
  const sizeClassName = SIZE_CLASS_MAP[size] || SIZE_CLASS_MAP.md;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums',
        sizeClassName,
        avatarClassName,
        className
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
