import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import {
  TRIAGE_REQUIRED_FIELDS,
  buildChecklist,
  isTriageComplete,
} from '../../utils/enrollment';
import { normalizeEnrollmentPayload } from '../../utils/enrollmentHardening';
import { formatPhoneBR } from '../../utils/phone';

function AddChildView({
  addChild,
  setView,
  isOnline = true,
  onlineOnly = false,
  statusFieldLabels,
}) {
  const [form, setForm] = useState({
    name: '',
    sexo: '',
    birthDate: '',
    guardianName: '',
    parentesco: '',
    guardianPhone: '',
    contatoEmergenciaNome: '',
    contatoEmergenciaTelefone: '',
    neighborhood: '',
    school: '',
    schoolShift: '',
    grade: '',
    guardianPhoneAlt: '',
    triageNotes: '',
    priority: '',
    // Campos coletados na matrícula
    referralSource: '',
    schoolCommuteAlone: '',
    renovacao: '',
    healthCareNeeded: '',
    healthNotes: '',
    restricaoAlimentar: '',
    alergiaAlimentar: '',
    alergiaMedicamento: '',
    medicamentosEmUso: '',
    specialNeeds: '',
    // Legais / matrícula
    termoLgpdAssinado: false,
    termoLgpdData: '',
    startDate: '',
    participationDays: [],
    authorizedPickup: '',
    canLeaveAlone: '',
    leaveAloneConsent: false,
    leaveAloneConfirmation: '',
    leaveAloneConfirmado: false,
    termsAccepted: false,
    classGroup: '',
    imageConsent: '',
    documentsReceived: [],
    formaChegada: '',
    consentimentoSaude: false,
    initialObservations: '',
  });

  const [triageError, setTriageError] = useState('');
  const writeBlocked = onlineOnly && !isOnline;
  const offlineWriteMessage =
    'Sem internet no momento. No modo online-only, conecte-se para salvar.';
  const [syncError, setSyncError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const triageChecklistItems = buildChecklist(TRIAGE_REQUIRED_FIELDS, form, statusFieldLabels);
  const triageComplete = isTriageComplete(form);
  const triageMissingCount = triageChecklistItems.filter(item => !item.complete).length;

  const buildPayload = triageIsComplete => {
    const now = new Date().toISOString();
    const normalized = normalizeEnrollmentPayload({
      ...form,
      neighborhood: form.neighborhood,
      termoLgpdData: form.termoLgpdAssinado ? now : '',
    });

    const { termsAccepted, triageResult, ...rest } = normalized;

    return {
      ...rest,
      enrollmentStatus: 'em_triagem',
      enrollmentDate: now,
      triageDate: triageIsComplete ? now : '',
      matriculationDate: '',
      startDate: '',
      entryDate: '',
      responsibilityTerm: false,
      consentTerm: false,
      enrollmentHistory: [
        {
          date: now,
          action: 'em_triagem',
          notes: triageIsComplete ? 'Triagem registrada' : 'Rascunho salvo',
        },
      ],
    };
  };

  const handleSaveTriagem = async () => {
    setTriageError('');
    setSyncError('');
    if (writeBlocked) {
      setTriageError(offlineWriteMessage);
      return;
    }

    setIsSaving(true);
    try {
      const ok = await addChild(buildPayload(triageComplete));
      if (ok === false) {
        setSyncError('Não foi possível sincronizar agora. Verifique internet e tente novamente.');
        return;
      }
      setView('children');
    } catch (_error) {
      setSyncError('Não foi possível sincronizar agora. Verifique internet e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-1 w-full rounded-full bg-cyan-700" />

      <div className="space-y-4">
        <div>
          <h2 className="text-balance text-lg font-semibold text-gray-800">Triagem</h2>
          <p className="text-pretty text-sm text-gray-500">Coleta inicial porta a porta.</p>
        </div>

        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-pretty text-xs font-semibold text-gray-500">Obrigatórios da triagem</p>
            <span className="text-xs text-gray-500 tabular-nums">
              {triageComplete
                ? 'Completa'
                : `${triageMissingCount} pendente${triageMissingCount === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="mb-3 mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  triageComplete ? 'bg-green-700' : 'bg-blue-600'
                )}
                style={{
                  width: `${Math.round(
                    (triageChecklistItems.filter(item => item.complete).length /
                      Math.max(triageChecklistItems.length, 1)) *
                      100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-600">
              {triageChecklistItems.filter(item => item.complete).length} de {triageChecklistItems.length} campos preenchidos
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {triageChecklistItems.map(item => (
              <span
                key={item.field}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold',
                  item.complete ? 'bg-emerald-50 text-emerald-800' : 'bg-teal-50 text-gray-600'
                )}
              >
                <span
                  className={cn('size-2 rounded-full', item.complete ? 'bg-emerald-600' : 'bg-gray-300')}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome completo *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              className="w-full rounded-lg border px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
              placeholder="Nome da criança"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Data de nascimento *</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => updateField('birthDate', e.target.value)}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome do responsável principal *</label>
            <input
              type="text"
              value={form.guardianName}
              onChange={e => updateField('guardianName', e.target.value)}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefone (WhatsApp) *</label>
            <input
              type="tel"
              value={form.guardianPhone}
              onChange={e => updateField('guardianPhone', formatPhoneBR(e.target.value))}
              inputMode="numeric"
              maxLength={15}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              placeholder="(83) 99999-9999"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Escola *</label>
            <input
              type="text"
              value={form.school}
              onChange={e => updateField('school', e.target.value)}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Turno escolar *</label>
            <select
              value={form.schoolShift}
              onChange={e => updateField('schoolShift', e.target.value)}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Selecione</option>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="integral">Integral</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bairro/Comunidade *</label>
            <input
              type="text"
              value={form.neighborhood}
              onChange={e => updateField('neighborhood', e.target.value)}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              placeholder="Digite o bairro/comunidade"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observações da triagem</label>
            <textarea
              value={form.triageNotes}
              onChange={e => updateField('triageNotes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Prioridade (interna)</label>
            <select
              value={form.priority}
              onChange={e => updateField('priority', e.target.value)}
              className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Selecione</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveTriagem}
            disabled={writeBlocked || isSaving}
            className={cn(
              'flex-1 rounded-lg bg-teal-50 py-4 font-semibold text-gray-700',
              (writeBlocked || isSaving) && 'cursor-not-allowed opacity-50'
            )}
          >
            {isSaving ? 'Salvando...' : triageComplete ? 'Concluir triagem' : 'Salvar rascunho'}
          </button>
        </div>
        {triageError && <p className="text-pretty text-xs text-rose-600">{triageError}</p>}
        {syncError && <p className="text-pretty text-xs text-rose-600">{syncError}</p>}
      </div>
    </div>
  );
}

export default AddChildView;
