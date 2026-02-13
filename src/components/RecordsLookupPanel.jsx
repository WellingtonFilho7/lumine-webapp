import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../utils/cn';

function getAttendanceMeta(attendance) {
  if (attendance === 'present') return { label: 'Presente', className: 'bg-green-100 text-green-700' };
  if (attendance === 'late') return { label: 'Atrasado', className: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Ausente', className: 'bg-red-100 text-red-700' };
}

function formatScaleValue(value) {
  if (value === 'high') return 'Alta';
  if (value === 'medium') return 'Media';
  if (value === 'low') return 'Baixa';
  return '-';
}

function formatMoodValue(value) {
  if (!value) return '-';
  const moodMap = {
    happy: 'Feliz',
    neutral: 'Neutro',
    calm: 'Calma',
    quiet: 'Quieta',
    sad: 'Triste',
    agitated: 'Agitada',
    irritated: 'Irritada',
  };
  return moodMap[value] || value;
}

function buildRecordShareSummary(record, childName, formatDate) {
  const attendance = getAttendanceMeta(record.attendance).label;
  return [
    'Resumo de acompanhamento - Instituto Lumine',
    'Crianca: ' + (childName || 'Crianca'),
    'Data: ' + formatDate(record.date),
    'Presenca: ' + attendance,
    'Atividade: ' + (record.activity || '-'),
    'Humor: ' + formatMoodValue(record.mood),
    'Participacao: ' + formatScaleValue(record.participation),
    'Interacao: ' + formatScaleValue(record.interaction),
    'Observacoes: ' + (record.notes || 'Sem observacoes'),
  ].join('\n');
}

export default function RecordsLookupPanel({ children, activeChildren, dailyRecords, formatDate }) {
  const [lookupChildId, setLookupChildId] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupWindowDays, setLookupWindowDays] = useState('30');
  const [copiedRecordId, setCopiedRecordId] = useState('');
  const [copyError, setCopyError] = useState('');

  const copiedTimerRef = useRef(null);
  const copyErrorTimerRef = useRef(null);

  const childrenById = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (copyErrorTimerRef.current) clearTimeout(copyErrorTimerRef.current);
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const windowDays = Number(lookupWindowDays) || 0;
    const minDate = windowDays > 0
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - windowDays)
      : null;

    return dailyRecords
      .filter(record => {
        if (lookupChildId && record.childInternalId !== lookupChildId) return false;

        const recordDate = record.date ? new Date(record.date) : null;
        if (minDate && recordDate && recordDate < minDate) return false;

        if (!lookupQuery.trim()) return true;
        const child = childrenById.get(record.childInternalId);
        const haystack = [
          child?.name || '',
          record.notes || '',
          record.activity || '',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(lookupQuery.trim().toLowerCase());
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [childrenById, dailyRecords, lookupChildId, lookupQuery, lookupWindowDays]);

  const quickStats = useMemo(() => {
    const total = filteredRecords.length;
    const presentes = filteredRecords.filter(r => r.attendance === 'present' || r.attendance === 'late').length;
    const ausentes = filteredRecords.filter(r => r.attendance === 'absent').length;
    return { total, presentes, ausentes };
  }, [filteredRecords]);

  const copyRecordSummary = async (record, childName) => {
    const summaryText = buildRecordShareSummary(record, childName, formatDate);

    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }

    if (copyErrorTimerRef.current) {
      clearTimeout(copyErrorTimerRef.current);
      copyErrorTimerRef.current = null;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const fallbackInput = document.createElement('textarea');
        fallbackInput.value = summaryText;
        fallbackInput.setAttribute('readonly', '');
        fallbackInput.style.position = 'fixed';
        fallbackInput.style.left = '-9999px';
        document.body.appendChild(fallbackInput);
        fallbackInput.select();
        document.execCommand('copy');
        document.body.removeChild(fallbackInput);
      }
      setCopyError('');
      setCopiedRecordId(record.id);
      copiedTimerRef.current = setTimeout(() => {
        setCopiedRecordId(current => (current === record.id ? '' : current));
        copiedTimerRef.current = null;
      }, 1500);
    } catch {
      setCopyError('Nao foi possivel copiar. Tente novamente.');
      copyErrorTimerRef.current = setTimeout(() => {
        setCopyError('');
        copyErrorTimerRef.current = null;
      }, 2000);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-balance font-semibold text-gray-800">Consulta rapida de registros</h3>
          <p className="text-pretty text-xs text-gray-500">Busque informacoes sem precisar abrir o Supabase.</p>
        </div>
        <div role="status" aria-live="polite" className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 tabular-nums">
          {quickStats.total} encontrados
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <select
          aria-label="Filtrar por crianca"
          value={lookupChildId}
          onChange={e => setLookupChildId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Todas as criancas</option>
          {activeChildren.map(child => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            aria-label="Buscar em notas e atividade"
            value={lookupQuery}
            onChange={e => setLookupQuery(e.target.value)}
            placeholder="Buscar em notas/atividade"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <select
          aria-label="Filtrar por periodo"
          value={lookupWindowDays}
          onChange={e => setLookupWindowDays(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="7">Ultimos 7 dias</option>
          <option value="30">Ultimos 30 dias</option>
          <option value="90">Ultimos 90 dias</option>
          <option value="0">Todo periodo</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs text-cyan-700 tabular-nums">
          Registros: {quickStats.total}
        </span>
        <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-700 tabular-nums">
          Presentes/Atrasados: {quickStats.presentes}
        </span>
        <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700 tabular-nums">
          Ausentes: {quickStats.ausentes}
        </span>
      </div>

      {copyError && (
        <p role="status" aria-live="polite" className="mt-2 text-xs font-semibold text-red-600">{copyError}</p>
      )}

      <div className="mt-4 max-h-72 space-y-2 overflow-auto">
        {filteredRecords.slice(0, 20).map(record => {
          const child = childrenById.get(record.childInternalId);
          const attendance = getAttendanceMeta(record.attendance);
          return (
            <div key={record.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{child?.name || 'Crianca'}</p>
                  <p className="text-xs text-gray-500">Data do registro: {formatDate(record.date)}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', attendance.className)}>
                  {attendance.label}
                </span>
              </div>

              <div className="grid gap-1 text-xs text-gray-700">
                <p>
                  <span className="font-semibold text-gray-500">Atividade principal:</span> {record.activity || '-'}
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Humor observado:</span> {formatMoodValue(record.mood)}
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Participação:</span> {formatScaleValue(record.participation)}
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Interação:</span> {formatScaleValue(record.interaction)}
                </p>
              </div>

              <div className="mt-2 rounded-md bg-white px-2 py-1 text-xs text-gray-700">
                <span className="font-semibold text-gray-500">Observações:</span> {record.notes || 'Sem observações'}
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => copyRecordSummary(record, child?.name)}
                  aria-label="Copiar resumo do registro"
                  className={cn(
                    'rounded-lg border px-3 py-1 text-xs font-semibold transition-colors',
                    copiedRecordId === record.id
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                  )}
                >
                  {copiedRecordId === record.id ? 'Resumo copiado' : 'Copiar resumo'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredRecords.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 px-3 py-5 text-center text-sm text-gray-500">
            Nenhum registro encontrado com os filtros atuais.
          </div>
        )}
      </div>
    </div>
  );
}
