import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { buildRecordForm, getRecordFormDefaults } from '../../utils/records';
import RecordsLookupPanel from '../../components/RecordsLookupPanel';
import { WEEKDAY_KEYS } from '../../constants/enrollment';
import { RECORD_TOAST_DURATION_MS } from '../../constants';

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

function DailyRecordView({
  children,
  dailyRecords,
  addDailyRecord,
  isOnline = true,
  onlineOnly = false,
  isMatriculated = defaultIsMatriculated,
  formatDate = defaultFormatDate,
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const childrenById = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [step, setStep] = useState('select');
  const [editingRecordId, setEditingRecordId] = useState('');
  const [form, setForm] = useState(getRecordFormDefaults());
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const writeBlocked = onlineOnly && !isOnline;
  const offlineWriteMessage =
    'Sem internet no momento. No modo online-only, conecte-se para salvar.';

  const activeChildren = children.filter(isMatriculated);
  const dateRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = dateRecords.map(r => r.childInternalId);
  const selectedChild =
    children.find(c => c.id === selectedChildId) ||
    activeChildren.find(c => c.id === selectedChildId);

  const today = new Date().toISOString().split('T')[0];
  const isTodaySelected = date === today;
  const selectedWeekdayKey = WEEKDAY_KEYS[new Date(`${date}T12:00:00`).getDay()];
  const expectedChildren = activeChildren.filter(child => {
    const days = Array.isArray(child.participationDays) ? child.participationDays : [];
    return days.length === 0 || days.includes(selectedWeekdayKey);
  });
  const expectedChildIds = new Set(expectedChildren.map(child => child.id));
  const completedExpectedCount = dateRecords.filter(record => expectedChildIds.has(record.childInternalId)).length;
  const pendingExpectedCount = Math.max(0, expectedChildren.length - completedExpectedCount);
  const allDoneToday = isTodaySelected && expectedChildren.length > 0 && pendingExpectedCount === 0;

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
    }, RECORD_TOAST_DURATION_MS);
  }, []);

  const clearEditing = () => {
    setEditingRecordId('');
    setSelectedChildId('');
    setStep('select');
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
    setStep('details');
  };

  const quickRecord = async (childId, attendance) => {
    if (writeBlocked) {
      showToast(offlineWriteMessage);
      return;
    }

    const ok = await addDailyRecord({
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
    if (!ok) {
      showToast('Não foi possível salvar agora. Tente novamente.');
      return;
    }
    showToast('Registro salvo!');
  };

  const handleDetailedRecord = async () => {
    if (writeBlocked) {
      showToast(offlineWriteMessage);
      return;
    }
    if (!selectedChildId) return;
    const isEditing = Boolean(editingRecordId);
    const ok = await addDailyRecord({ childInternalId: selectedChildId, date, ...form });
    if (!ok) {
      showToast('Não foi possível salvar agora. Tente novamente.');
      return;
    }
    showToast(isEditing ? 'Registro atualizado!' : 'Registro salvo!');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      clearEditing();
      resetTimerRef.current = null;
    }, RECORD_TOAST_DURATION_MS);
  };

  return (
    <div className="space-y-4">
      {/* Toast de sucesso */}
      {toastMessage && (
        <div
          role="status" aria-live="polite" className="fixed left-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 5rem)' }}
        >
          <CheckCircle size={20} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Seletor de data */}
      <div className="rounded-lg bg-white p-4 shadow-md">
        <label className="mb-2 block text-sm font-medium text-gray-700">Data do registro</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {writeBlocked && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
          {offlineWriteMessage}
        </div>
      )}

      {/* Status do dia */}
      <div className="flex items-center justify-between rounded-lg bg-cyan-50 p-4">
        <div>
          <p className="text-sm font-medium text-cyan-900">Registros hoje</p>
          <p className="text-2xl font-extrabold text-cyan-700 tabular-nums">
            {dateRecords.length}/{activeChildren.length}
          </p>
        </div>
        <div className="text-right">
          <p role="status" aria-live="polite" className="text-sm text-cyan-700 tabular-nums">{pendingExpectedCount} pendentes</p>
        </div>
      </div>

      {allDoneToday && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="size-5 text-green-700" />
          </div>
          <div>
            <p className="font-semibold text-green-900">Registros do dia concluídos</p>
            <p className="text-sm text-green-700 tabular-nums">
              {expectedChildren.length} crianças registradas
            </p>
          </div>
        </div>
      )}

      <RecordsLookupPanel
        children={children}
        activeChildren={activeChildren}
        dailyRecords={dailyRecords}
        formatDate={formatDate}
      />

      {step === 'select' && (
        <>
          {dateRecords.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-balance font-semibold text-gray-900">Registros do dia</h3>
                <span className="text-xs text-gray-500 tabular-nums">{dateRecords.length} registros</span>
              </div>
              <div className="space-y-2">
                {dateRecords.map(record => {
                  const child = childrenById.get(record.childInternalId);
                  const label = child?.name || 'Criança';
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleEditRecord(record)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left"
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
                      <span className="flex-1 truncate text-sm font-semibold text-gray-900">{label}</span>
                      <span className="text-xs text-gray-500">
                        {record.attendance === 'present'
                          ? 'Presente ✔'
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

          {/* Registro rápido */}
          {pendingExpectedCount > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <h3 className="text-balance mb-3 font-semibold text-gray-900">Registro rápido</h3>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {expectedChildren.filter(c => !recordedIds.includes(c.id)).map(child => (
                  <div key={child.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <span className="flex-1 truncate text-sm font-semibold text-gray-900">{child.name}</span>
                    <button type="button"
                      onClick={() => quickRecord(child.id, 'present')}
                      disabled={writeBlocked}
                      aria-label={`Marcar ${child.name} como presente`}
                      className={cn(
                        'rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-800',
                        writeBlocked && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      Presente
                    </button>
                    <button type="button"
                      onClick={() => quickRecord(child.id, 'absent')}
                      disabled={writeBlocked}
                      aria-label={`Marcar ${child.name} como ausente`}
                      className={cn(
                        'rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-800',
                        writeBlocked && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      Ausente
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registro detalhado */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="text-balance mb-3 font-semibold text-gray-900">Registro detalhado</h3>
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Selecione uma criança</option>
              {activeChildren.map(c => (
                <option key={c.id} value={c.id} disabled={recordedIds.includes(c.id)}>
                  {c.name} {recordedIds.includes(c.id) ? '(registrado)' : ''}
                </option>
              ))}
            </select>
            <button type="button"
              onClick={() => selectedChildId && setStep('details')}
              disabled={!selectedChildId || writeBlocked}
              className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-gray-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              Continuar
            </button>
          </div>
        </>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          {/* Criança selecionada */}
          <div className="flex items-center justify-between rounded-lg bg-cyan-100 p-4">
            <div>
              <p className="text-sm text-cyan-700">Registrando para</p>
              <p className="font-bold text-cyan-900">{selectedChild?.name || 'Criança'}</p>
              {editingRecordId && (
                <span className="mt-1 inline-flex rounded-full bg-cyan-200 px-2 py-0.5 text-xs font-semibold text-cyan-800">
                  Editando registro
                </span>
              )}
            </div>
            <button type="button"
              onClick={() => {
                if (editingRecordId) {
                  clearEditing();
                } else {
                  setStep('select');
                }
              }}
              className="text-cyan-700"
              aria-label="Voltar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Bloco 1: Presença */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h4 className="text-balance mb-3 font-semibold text-gray-900">Presença</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'present', label: 'Presente', color: 'green' },
                { value: 'late', label: 'Atrasado', color: 'yellow' },
                { value: 'absent', label: 'Ausente', color: 'red' },
              ].map(opt => (
                <button type="button"
                  key={opt.value}
                  aria-pressed={form.attendance === opt.value}
                  onClick={() => setForm({ ...form, attendance: opt.value })}
                  className={cn(
                    'rounded-lg py-3 text-sm font-medium transition-all',
                    form.attendance === opt.value
                      ? opt.color === 'green'
                        ? 'bg-green-500 text-white'
                        : opt.color === 'yellow'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-teal-50 text-gray-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bloco 2: Detalhes (só se presente/atrasado) */}
          {form.attendance !== 'absent' && (
            <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
              <h4 className="text-balance font-semibold text-gray-900">Detalhes</h4>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Humor</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'happy', label: '😊' },
                    { value: 'neutral', label: '😐' },
                    { value: 'sad', label: '😢' },
                  ].map(opt => (
                    <button type="button"
                      key={opt.value}
                      aria-label={`Selecionar humor ${opt.value}`}
                      aria-pressed={form.mood === opt.value}
                      onClick={() => setForm({ ...form, mood: opt.value })}
                      className={cn(
                        'rounded-lg py-3 text-2xl transition-all',
                        form.mood === opt.value
                          ? 'bg-cyan-100 ring-2 ring-cyan-500'
                          : 'bg-teal-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Participação</label>
                <select
                  value={form.participation}
                  onChange={e => setForm({ ...form, participation: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Interação</label>
                <select
                  value={form.interaction}
                  onChange={e => setForm({ ...form, interaction: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Atividade</label>
                <input
                  value={form.activity}
                  onChange={e => setForm({ ...form, activity: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                  placeholder="Ex: Leitura, Arte, Jogo..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Desempenho</label>
                <select
                  value={form.performance}
                  onChange={e => setForm({ ...form, performance: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
            </div>
          )}

          {/* Bloco 3: Observações */}
          <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
            <h4 className="text-balance font-semibold text-gray-900">Observações</h4>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Algo importante..."
              className="w-full rounded-lg border px-4 py-3"
            />

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.familyContact === 'yes'}
                  onChange={e =>
                    setForm({ ...form, familyContact: e.target.checked ? 'yes' : 'no' })
                  }
                  className="h-5 w-5 rounded"
                />
                <span className="text-sm">Houve contato com a família</span>
              </label>
            </div>

            {form.familyContact === 'yes' && (
              <select
                value={form.contactReason}
                onChange={e => setForm({ ...form, contactReason: e.target.value })}
                className="w-full rounded-lg border px-4 py-3"
              >
                <option value="">Motivo do contato</option>
                <option value="routine">Rotina</option>
                <option value="praise">Elogio</option>
                <option value="behavior">Comportamento</option>
                <option value="absence">Ausência</option>
                <option value="other">Outro</option>
              </select>
            )}
          </div>

          {/* Botão salvar */}
          <button type="button"
            onClick={handleDetailedRecord}
            disabled={writeBlocked}
            className="w-full rounded-lg bg-green-600 py-4 font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingRecordId ? 'Atualizar registro' : 'Salvar Registro'}
          </button>
        </div>
      )}
    </div>
  );
}

export default DailyRecordView;
