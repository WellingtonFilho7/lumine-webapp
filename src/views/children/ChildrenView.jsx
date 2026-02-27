import React, { useMemo, useState } from 'react';
import { ChevronRight, Search, Users } from 'lucide-react';
import StatusBadge, { getStatusVisual } from '../../components/ui/StatusBadge';
import ChildAvatar from '../../components/ui/ChildAvatar';
import { cn } from '../../utils/cn';
import { filterChildrenForMainList } from '../../utils/childData';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'matriculado', label: 'Matriculado' },
  { value: 'em_triagem', label: 'Em triagem' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'lista_espera', label: 'Lista de espera' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'recusado', label: 'Não atendida' },
  { value: 'desistente', label: 'Desistente' },
  { value: 'inativo', label: 'Inativo' },
];

const ARCHIVED_FILTERS = new Set(['desistente', 'inativo']);

const statusBorderClass = status => {
  const visual = getStatusVisual(status);
  if (visual.badgeClassName.includes('green')) return 'border-l-green-500';
  if (visual.badgeClassName.includes('amber')) return 'border-l-amber-500';
  if (visual.badgeClassName.includes('blue')) return 'border-l-blue-500';
  if (visual.badgeClassName.includes('red')) return 'border-l-red-500';
  if (visual.badgeClassName.includes('cyan')) return 'border-l-cyan-500';
  return 'border-l-gray-400';
};

export default function ChildrenView({
  children,
  setSelectedChild,
  setView,
  searchTerm,
  setSearchTerm,
  isTriageDraft,
  getEnrollmentStatus,
  calculateAge,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const statusOptions = useMemo(() => {
    if (showArchived) return STATUS_OPTIONS;
    return STATUS_OPTIONS.filter(option => !ARCHIVED_FILTERS.has(option.value));
  }, [showArchived]);

  const listBase = useMemo(
    () => filterChildrenForMainList(children, { includeArchived: showArchived }),
    [children, showArchived]
  );

  const filtered = listBase.filter(child => {
    const matchesName = child.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesName) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'draft') return isTriageDraft(child);
    return getEnrollmentStatus(child) === statusFilter;
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar criança..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          aria-label="Buscar crianca pelo nome"
          className="w-full rounded-lg border-0 bg-white py-3 pl-10 pr-4 shadow-md focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      <div className="space-y-2">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex w-max items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              aria-pressed={showArchived}
              onClick={() => {
                const next = !showArchived;
                setShowArchived(next);
                if (!next && ARCHIVED_FILTERS.has(statusFilter)) {
                  setStatusFilter('all');
                }
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                showArchived ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
              )}
            >
              {showArchived ? 'Ocultar arquivados' : 'Mostrar arquivados'}
            </button>
            {statusOptions.map(option => (
              <button
                key={option.value}
                type="button"
                aria-pressed={statusFilter === option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  statusFilter === option.value ? 'bg-cyan-700 text-white' : 'bg-teal-50 text-gray-600'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p role="status" aria-live="polite" className="text-sm text-gray-500 tabular-nums">
          {filtered.length} criança{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-2">
        {filtered.map(child => {
          const childStatus = getEnrollmentStatus(child);
          const isDraft = isTriageDraft(child);

          return (
            <div
              key={child.id}
              onClick={() => {
                setSelectedChild(child);
                setView('child-detail');
              }}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-lg border-l-4 bg-white p-4 shadow-md active:bg-gray-50',
                statusBorderClass(childStatus)
              )}
            >
              <ChildAvatar name={child.name} status={childStatus} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-gray-900">{child.name}</h3>
                <p className="text-xs font-normal text-gray-500 tabular-nums">
                  {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={childStatus} />
                  {isDraft && (
                    <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-800">
                      Rascunho
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-pretty text-gray-500">
            {searchTerm ? 'Nenhuma criança encontrada' : 'Nenhuma criança cadastrada'}
          </p>
          {searchTerm || statusFilter !== 'all' || showArchived ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setShowArchived(false);
              }}
              className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Limpar filtros
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView('add-child')}
              className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cadastrar criança
            </button>
          )}
        </div>
      )}
    </div>
  );
}
