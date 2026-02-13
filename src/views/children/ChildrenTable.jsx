import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import ChildAvatar from '../../components/ui/ChildAvatar';
import StatusBadge from '../../components/ui/StatusBadge';
import { cn } from '../../utils/cn';

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

  const filtered = children.filter(child => {
    const matchesName = child.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesName) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'draft') return isTriageDraft(child);
    return getEnrollmentStatus(child) === statusFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-orange-400"
        >
          <Plus size={16} />
          Nova criança
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'em_triagem', label: 'Triagem' },
          { value: 'draft', label: 'Rascunhos' },
          { value: 'aprovado', label: 'Aprovado' },
          { value: 'lista_espera', label: 'Lista de espera' },
          { value: 'matriculado', label: 'Matriculado' },
          { value: 'recusado', label: 'Não atendida' },
          { value: 'desistente', label: 'Desistente' },
          { value: 'inativo', label: 'Inativo' },
        ].map(option => (
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-md">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-balance">Nome</th>
              <th className="px-4 py-3 text-balance">Idade</th>
              <th className="px-4 py-3 text-balance">Responsável</th>
              <th className="px-4 py-3 text-balance">Telefone</th>
              <th className="px-4 py-3 text-balance">Escola</th>
              <th className="px-4 py-3 text-balance">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(child => {
              const childStatus = getEnrollmentStatus(child);
              const isDraft = isTriageDraft(child);

              return (
                <tr
                  key={child.id}
                  onClick={() => {
                    setSelectedChild(child);
                    setView('child-detail');
                  }}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ChildAvatar name={child.name} status={childStatus} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{child.name}</p>
                        <p className="text-xs text-gray-500">{child.childId || 'Sem ID público'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums">
                    {child.birthDate ? `${calculateAge(child.birthDate)} anos` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{child.guardianName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{child.guardianPhone || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {child.school ? `${child.school}${child.grade ? ` - ${child.grade}` : ''}` : '-'}
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
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
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
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
