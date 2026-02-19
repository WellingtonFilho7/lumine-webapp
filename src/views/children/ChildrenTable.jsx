import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, LayoutGrid, List, Plus, Search, Users } from 'lucide-react';
import ChildAvatar from '../../components/ui/ChildAvatar';
import StatusBadge from '../../components/ui/StatusBadge';
import { cn } from '../../utils/cn';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'em_triagem', label: 'Triagem' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'lista_espera', label: 'Lista de espera' },
  { value: 'matriculado', label: 'Matriculado' },
  { value: 'recusado', label: 'Não atendida' },
  { value: 'desistente', label: 'Desistente' },
  { value: 'inativo', label: 'Inativo' },
];

function formatTableDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function getLastUpdate(child) {
  return (
    child.matriculationDate ||
    child.enrollmentDate ||
    child.triageDate ||
    child.updatedAt ||
    child.createdAt
  );
}

function getDocumentStatus(child) {
  const total = Array.isArray(child.documentsReceived) ? child.documentsReceived.length : 0;
  if (total >= 3) return { label: 'Completo', className: 'bg-green-50 text-green-700' };
  if (total > 0) return { label: 'Parcial', className: 'bg-amber-50 text-amber-700' };
  return { label: 'Pendente', className: 'bg-gray-100 text-gray-600' };
}

export default function ChildrenTable({
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
  const [viewMode, setViewMode] = useState('table');

  const filtered = children.filter(child => {
    const matchesName = child.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesName) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'draft') return isTriageDraft(child);
    return getEnrollmentStatus(child) === statusFilter;
  });

  const summary = useMemo(() => {
    const matriculados = filtered.filter(child => getEnrollmentStatus(child) === 'matriculado').length;
    const triagem = filtered.filter(child => getEnrollmentStatus(child) === 'em_triagem').length;
    const completos = filtered.filter(child => getDocumentStatus(child).label === 'Completo').length;

    return { total: filtered.length, matriculados, triagem, completos };
  }, [filtered, getEnrollmentStatus]);

  const openChild = child => {
    setSelectedChild(child);
    setView('child-detail');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar criança..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Buscar crianca pelo nome"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm shadow-md focus:border-transparent focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setView('add-child')}
          className="flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
        >
          <Plus size={16} />
          Nova criança
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-gray-500">Total filtrado</p>
          <p className="mt-1 text-xl font-extrabold text-gray-900 tabular-nums">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={14} />
            Matriculados
          </div>
          <p className="mt-1 text-xl font-extrabold text-cyan-700 tabular-nums">{summary.matriculados}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock3 size={14} />
            Em triagem
          </div>
          <p className="mt-1 text-xl font-extrabold text-amber-700 tabular-nums">{summary.triagem}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <CheckCircle2 size={14} />
            Docs completos
          </div>
          <p className="mt-1 text-xl font-extrabold text-green-700 tabular-nums">{summary.completos}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(option => (
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

      <div className="flex items-center justify-between">
        <p role="status" aria-live="polite" className="text-sm text-gray-500 tabular-nums">
          {filtered.length} criança{filtered.length !== 1 ? 's' : ''} encontrada
          {filtered.length !== 1 ? 's' : ''}
        </p>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold',
              viewMode === 'table' ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            )}
          >
            <List size={14} />
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold',
              viewMode === 'cards' ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            )}
          >
            <LayoutGrid size={14} />
            Cards
          </button>
        </div>
      </div>

      {viewMode === 'table' && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-balance font-semibold">Criança</th>
                  <th className="px-4 py-3 text-balance font-semibold">Contato</th>
                  <th className="px-4 py-3 text-balance font-semibold">Escola</th>
                  <th className="px-4 py-3 text-balance font-semibold">Status</th>
                  <th className="px-4 py-3 text-balance font-semibold">Documentos</th>
                  <th className="px-4 py-3 text-balance font-semibold">Atualização</th>
                  <th className="px-4 py-3 text-balance font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(child => {
                  const childStatus = getEnrollmentStatus(child);
                  const isDraft = isTriageDraft(child);
                  const docsStatus = getDocumentStatus(child);
                  const lastUpdate = getLastUpdate(child);

                  return (
                    <tr
                      key={child.id}
                      onClick={() => openChild(child)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openChild(child);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer border-t border-gray-100 outline-none hover:bg-gray-50 focus-visible:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ChildAvatar name={child.name} status={childStatus} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{child.name}</p>
                            <p className="text-xs text-gray-500">{child.childId || 'Sem ID público'}</p>
                            <p className="text-xs text-gray-500 tabular-nums">
                              {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p className="truncate text-sm text-gray-700">{child.guardianName || '-'}</p>
                        <p className="text-xs text-gray-500 tabular-nums">{child.guardianPhone || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p className="text-sm text-gray-700">
                          {child.school ? `${child.school}${child.grade ? ` - ${child.grade}` : ''}` : '-'}
                        </p>
                        <p className="text-xs text-gray-500">{child.schoolShift || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={childStatus} />
                          {isDraft && (
                            <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">
                              Rascunho
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                            docsStatus.className
                          )}
                        >
                          {docsStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">{formatTableDate(lastUpdate)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            openChild(child);
                          }}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Abrir ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'cards' && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtered.map(child => {
            const childStatus = getEnrollmentStatus(child);
            const isDraft = isTriageDraft(child);
            const docsStatus = getDocumentStatus(child);

            return (
              <article
                key={child.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-cyan-200"
              >
                <div className="flex items-start gap-3">
                  <ChildAvatar name={child.name} status={childStatus} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{child.name}</p>
                    <p className="text-xs text-gray-500">{child.childId || 'Sem ID público'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={childStatus} />
                      {isDraft && (
                        <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">
                          Rascunho
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Responsável</p>
                    <p className="truncate text-gray-700">{child.guardianName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Telefone</p>
                    <p className="text-gray-700 tabular-nums">{child.guardianPhone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Escola</p>
                    <p className="truncate text-gray-700">
                      {child.school ? `${child.school}${child.grade ? ` - ${child.grade}` : ''}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Documentos</p>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                        docsStatus.className
                      )}
                    >
                      {docsStatus.label}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-500 tabular-nums">
                    Atualizado em {formatTableDate(getLastUpdate(child))}
                  </p>
                  <button
                    type="button"
                    onClick={() => openChild(child)}
                    className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600"
                  >
                    Abrir ficha
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          <table className="w-full text-left text-sm">
            <tbody>
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                  <p className="text-pretty">
                    {searchTerm ? 'Nenhuma criança encontrada' : 'Nenhuma criança cadastrada'}
                  </p>
                  {searchTerm || statusFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
