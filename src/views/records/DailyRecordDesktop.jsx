import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { buildRecordForm, getRecordFormDefaults } from '../../utils/records';
import RecordsLookupPanel from '../../components/RecordsLookupPanel';

const defaultIsMatriculated = child => {
  if (!child) return false;
  if (child.enrollmentStatus) return child.enrollmentStatus === 'matriculado';
  if (child.status) return child.status !== 'inactive';
  return true;
};

const defaultFormatDate = value => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR');
};

function DailyRecordDesktop({
  children,
  dailyRecords,
  addDailyRecord,
  isMatriculated = defaultIsMatriculated,
  formatDate = defaultFormatDate,
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const childrenById = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [editingRecordId, setEditingRecordId] = useState('');
  const [form, setForm] = useState(getRecordFormDefaults());
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const resetTimerRef = useRef(null);

  const activeChildren = children.filter(isMatriculated);
  const dateRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = dateRecords.map(r => r.childInternalId);
  const pending = activeChildren.filter(c => !recordedIds.includes(c.id));
  const selectedChild =
    children.find(c => c.id === selectedChildId) ||
    activeChildren.find(c => c.id === selectedChildId);

  const clearTimers = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(message => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
      toastTimerRef.current = null;
    }, 1200);
  }, []);

  const clearEditing = () => {
    setEditingRecordId('');
    setSelectedChildId('');
    setForm(getRecordFormDefaults());
  };

  useEffect(() => {
    clearEditing();
  }, [date]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleEditRecord = record => {
    setEditingRecordId(record.id);
    setSelectedChildId(record.childInternalId);
    setForm(buildRecordForm(record));
  };

  const quickRecord = (childId, attendance) => {
    addDailyRecord({
      childInternalId: childId,
      date,
      attendance,
      participation: 'medium',
      mood: 'neutral',
      interaction: 'medium',
      activity: '',
      performance: 'medium',
      notes: '',
      familyContact: 'no',
      contactReason: '',
    });
    showToast('Registro salvo!');
  };

  const handleDetailedRecord = () => {
    if (!selectedChildId) return;
    const isEditing = Boolean(editingRecordId);
    addDailyRecord({ childInternalId: selectedChildId, date, ...form });
    showToast(isEditing ? 'Registro atualizado!' : 'Registro salvo!');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      clearEditing();
      resetTimerRef.current = null;
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div
          className="fixed right-10 z-50 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 6rem)' }}
        >
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-md">
        <div>
          <p className="text-balance text-xs uppercase text-gray-400">Registro diário</p>
          <p className="text-sm text-gray-600 tabular-nums">
            {dateRecords.length}/{activeChildren.length} registrados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500">Data</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <RecordsLookupPanel
        children={children}
        activeChildren={activeChildren}
        dailyRecords={dailyRecords}
        formatDate={formatDate}
      />

      <div className="grid grid-cols-[minmax(0,360px)_1fr] gap-6">
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-balance font-semibold text-gray-800">Pendentes</h3>
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-gray-500 tabular-nums">
              {pending.length} pendentes
            </span>
          </div>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-auto">
            {pending.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                <p className="text-pretty">Nenhuma pendência para esta data.</p>
                <button
                  onClick={() => setSelectedChildId('')}
                  className="mt-3 w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Registrar agora
                </button>
              </div>
            )}
            {pending.map(child => (
              <div
                key={child.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2',
                  selectedChildId === child.id ? 'border-cyan-200 bg-cyan-50' : 'border-gray-100'
                )}
              >
                <button
                  onClick={() => setSelectedChildId(child.id)}
                  className="flex-1 text-left text-sm font-medium text-gray-800"
                >
                  {child.name}
                </button>
                <button
                  onClick={() => quickRecord(child.id, 'present')}
                  className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                >
                  Presente
                </button>
                <button
                  onClick={() => quickRecord(child.id, 'absent')}
                  className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                >
                  Ausente
                </button>
              </div>
            ))}
          </div>

          {dateRecords.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-balance text-sm font-semibold text-gray-800">Registros do dia</h4>
                <span className="text-xs text-gray-500 tabular-nums">{dateRecords.length} registros</span>
              </div>
              <div className="max-h-[260px] space-y-2 overflow-auto">
                {dateRecords.map(record => {
                  const child = childrenById.get(record.childInternalId);
                  const label = child?.name || 'Criança';
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleEditRecord(record)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left"
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          record.attendance === 'present'
                            ? 'bg-green-500'
                            : record.attendance === 'late'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        )}
                      />
                      <span className="flex-1 truncate text-sm font-medium text-gray-800">{label}</span>
                      <span className="text-xs text-gray-500">
                        {record.attendance === 'present'
                          ? 'Presente'
                          : record.attendance === 'late'
                          ? 'Atrasado'
                          : 'Ausente'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-balance text-xs uppercase text-gray-400">Detalhes</p>
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedChild ? selectedChild.name : 'Selecione uma criança'}
              </h3>
              {editingRecordId && (
                <span className="mt-1 inline-flex rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                  Editando registro
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {editingRecordId && (
                <button
                  type="button"
                  onClick={clearEditing}
                  className="text-xs font-semibold text-cyan-700"
                >
                  Cancelar edição
                </button>
              )}
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Selecionar</option>
                {activeChildren.map(child => (
                  <option key={child.id} value={child.id} disabled={recordedIds.includes(child.id)}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="text-balance text-xs font-semibold text-gray-500">Presença</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { value: 'present', label: 'Presente', color: 'green' },
                  { value: 'late', label: 'Atrasado', color: 'yellow' },
                  { value: 'absent', label: 'Ausente', color: 'red' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setForm({ ...form, attendance: option.value })}
                    className={cn(
                      'rounded-lg py-2 text-xs font-semibold',
                      form.attendance === option.value
                        ? option.color === 'green'
                          ? 'bg-green-500 text-white'
                          : option.color === 'yellow'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-teal-50 text-gray-600'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {form.attendance !== 'absent' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Humor</label>
                  <select
                    value={form.mood}
                    onChange={e => setForm({ ...form, mood: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="happy">Feliz</option>
                    <option value="neutral">Ok</option>
                    <option value="sad">Triste</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Participação</label>
                  <select
                    value={form.participation}
                    onChange={e => setForm({ ...form, participation: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Interação</label>
                  <select
                    value={form.interaction}
                    onChange={e => setForm({ ...form, interaction: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Desempenho</label>
                  <select
                    value={form.performance}
                    onChange={e => setForm({ ...form, performance: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500">Atividade</label>
                  <input
                    value={form.activity}
                    onChange={e => setForm({ ...form, activity: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Ex: Leitura, Arte, Jogo..."
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Algo importante..."
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.familyContact === 'yes'}
                  onChange={e =>
                    setForm({ ...form, familyContact: e.target.checked ? 'yes' : 'no' })
                  }
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-gray-700">Houve contato com a família</span>
              </div>
              {form.familyContact === 'yes' && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500">Motivo do contato</label>
                  <select
                    value={form.contactReason}
                    onChange={e => setForm({ ...form, contactReason: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Selecione</option>
                    <option value="routine">Rotina</option>
                    <option value="praise">Elogio</option>
                    <option value="behavior">Comportamento</option>
                    <option value="absence">Ausência</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleDetailedRecord}
              disabled={!selectedChildId}
              className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-gray-900 hover:bg-orange-400 disabled:bg-gray-300 disabled:text-gray-500"
            >
              {editingRecordId ? 'Atualizar registro' : 'Salvar registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONFIGURAÇÕES
// ============================================

export default DailyRecordDesktop;
