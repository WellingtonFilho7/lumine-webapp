import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import {
  TRIAGE_REQUIRED_FIELDS,
  MATRICULA_REQUIRED_FIELDS,
  buildChecklist,
  isTriageComplete,
  isMatriculaComplete,
} from '../../utils/enrollment';
import {
  getEnrollmentHardeningMissingFields,
  normalizeEnrollmentPayload,
} from '../../utils/enrollmentHardening';

const STRICT_UI_MODE = (process.env.REACT_APP_ENROLLMENT_STRICT_UI || 'true').toLowerCase() !== 'false';

function AddChildView({
  addChild,
  setView,
  isOnline = true,
  onlineOnly = false,
  triageResultOptions,
  participationDays,
  statusFieldLabels,
}) {
  const [step, setStep] = useState(1);
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
    referralSource: '',
    schoolCommuteAlone: '',
    grade: '',
    guardianPhoneAlt: '',
    healthCareNeeded: '',
    healthNotes: '',
    dietaryRestriction: '',
    restricaoAlimentar: '',
    alergiaAlimentar: '',
    alergiaMedicamento: '',
    medicamentosEmUso: '',
    specialNeeds: '',
    triageNotes: '',
    priority: '',
    priorityReason: '',
    triageResult: '',
    renovacao: '',
    termoLgpdAssinado: false,
    termoLgpdData: '',
    startDate: new Date().toISOString().split('T')[0],
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
  const [matriculaError, setMatriculaError] = useState('');
  const writeBlocked = onlineOnly && !isOnline;
  const offlineWriteMessage =
    'Sem internet no momento. No modo online-only, conecte-se para salvar.';

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleDocument = value => {
    setForm(prev => {
      const current = Array.isArray(prev.documentsReceived) ? prev.documentsReceived : [];
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, documentsReceived: next };
    });
  };

  const toggleParticipationDay = value => {
    setForm(prev => {
      const current = Array.isArray(prev.participationDays) ? prev.participationDays : [];
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, participationDays: next };
    });
  };

  const triageChecklistFields = [
    ...TRIAGE_REQUIRED_FIELDS,
    ...(form.healthCareNeeded === 'sim' ? ['healthNotes'] : []),
  ];
  const triageChecklistItems = buildChecklist(
    triageChecklistFields,
    form,
    statusFieldLabels
  );
  const triageComplete = isTriageComplete(form);
  const triageMissingCount = triageChecklistItems.filter(item => !item.complete).length;

  const matriculaChecklistFields = [
    ...MATRICULA_REQUIRED_FIELDS,
    ...(form.canLeaveAlone === 'sim' ? ['leaveAloneConfirmado'] : []),
  ];
  const matriculaChecklistItems = buildChecklist(
    matriculaChecklistFields,
    form,
    statusFieldLabels
  );
  const matriculaComplete = isMatriculaComplete(form);
  const matriculaMissingCount = matriculaChecklistItems.filter(item => !item.complete).length;

  const buildPayload = (status, triageIsComplete) => {
    const now = new Date().toISOString();
    const enrollmentHistory = [];
    const triageCompleteFlag = Boolean(triageIsComplete);

    if (status === 'matriculado') {
      enrollmentHistory.push({
        date: now,
        action: 'aprovado',
        notes: 'Triagem aprovada',
      });
      enrollmentHistory.push({
        date: now,
        action: 'matriculado',
        notes: 'Matrícula efetivada',
      });
    } else {
      enrollmentHistory.push({
        date: now,
        action: status,
        notes: triageCompleteFlag ? 'Triagem registrada' : 'Rascunho salvo',
      });
    }

    const normalized = normalizeEnrollmentPayload({
      ...form,
      neighborhood: form.neighborhood,
      termoLgpdData: form.termoLgpdAssinado ? now : '',
    });

    const {
      termsAccepted,
      triageResult,
      ...rest
    } = normalized;

    return {
      ...rest,
      enrollmentStatus: status,
      enrollmentDate: now,
      triageDate: triageCompleteFlag ? now : '',
      matriculationDate: status === 'matriculado' ? now : '',
      startDate: status === 'matriculado' ? normalized.startDate : '',
      entryDate: status === 'matriculado' ? normalized.startDate : '',
      responsibilityTerm: termsAccepted,
      consentTerm: termsAccepted,
      enrollmentHistory,
    };
  };

  const handleSaveTriagem = async () => {
    setTriageError('');
    if (writeBlocked) {
      setTriageError(offlineWriteMessage);
      return;
    }
    if (form.triageResult && !triageComplete) {
      setTriageError('Complete os itens obrigatórios da triagem para definir o resultado.');
      return;
    }
    const status = form.triageResult || 'em_triagem';
    const ok = await addChild(buildPayload(status, triageComplete));
    if (!ok) {
      setTriageError('Não foi possível salvar agora. Verifique a conexão e tente novamente.');
      return;
    }
    setView('children');
  };

  const handleMatricular = async () => {
    setTriageError('');
    setMatriculaError('');
    if (writeBlocked) {
      setMatriculaError(offlineWriteMessage);
      return;
    }
    if (!triageComplete) {
      setTriageError('Complete os itens obrigatórios da triagem para concluir.');
      return;
    }
    if (!matriculaComplete) {
      setMatriculaError('Complete os itens obrigatórios da matrícula para concluir.');
      return;
    }

    const hardeningMissing = getEnrollmentHardeningMissingFields(form, {
      strictMode: STRICT_UI_MODE,
    });

    if (hardeningMissing.length) {
      setMatriculaError('Faltam confirmações legais obrigatórias para concluir a matrícula.');
      return;
    }

    const ok = await addChild(buildPayload('matriculado', true));
    if (!ok) {
      setMatriculaError('Não foi possível concluir agora. Verifique a conexão e tente novamente.');
      return;
    }
    setView('children');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2].map(s => (
          <div
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full',
              step >= s ? 'bg-cyan-700' : 'bg-gray-200'
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-balance text-lg font-semibold text-gray-800">Triagem</h2>
            <p className="text-pretty text-sm text-gray-500">Coleta inicial em um único momento.</p>
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

            <div className="mt-3 mb-3">
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
                    className={cn(
                      'size-2 rounded-full',
                      item.complete ? 'bg-emerald-600' : 'bg-gray-300'
                    )}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sexo da criança *</label>
                <select
                  value={form.sexo}
                  onChange={e => updateField('sexo', e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="nao_declarado">Prefiro não declarar</option>
                </select>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Parentesco *</label>
                <select
                  value={form.parentesco}
                  onChange={e => updateField('parentesco', e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Selecione</option>
                  <option value="mae">Mãe</option>
                  <option value="pai">Pai</option>
                  <option value="avo">Avô/Avó</option>
                  <option value="tio">Tio/Tia</option>
                  <option value="responsavel_legal">Responsável legal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Telefone (WhatsApp) *</label>
                <input
                  type="tel"
                  value={form.guardianPhone}
                  onChange={e => updateField('guardianPhone', e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                  placeholder="(83) 99999-9999"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone alternativo</label>
              <input
                type="tel"
                value={form.guardianPhoneAlt}
                onChange={e => updateField('guardianPhoneAlt', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-800">Contato de emergência *</p>
              <p className="mb-3 text-xs text-gray-600">Pessoa diferente do responsável principal para situações de urgência.</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.contatoEmergenciaNome}
                  onChange={e => updateField('contatoEmergenciaNome', e.target.value)}
                  className="w-full rounded-lg border bg-white px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                  placeholder="Nome completo"
                />
                <input
                  type="tel"
                  value={form.contatoEmergenciaTelefone}
                  onChange={e => updateField('contatoEmergenciaTelefone', e.target.value)}
                  className="w-full rounded-lg border bg-white px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                  placeholder="(83) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Série</label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={e => updateField('grade', e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                  placeholder="2º ano"
                />
              </div>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Como conheceu o Lumine? *</label>
              <select
                value={form.referralSource}
                onChange={e => updateField('referralSource', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="igreja">Igreja</option>
                <option value="escola">Escola</option>
                <option value="CRAS">CRAS</option>
                <option value="indicacao">Indicação</option>
                <option value="redes_sociais">Redes sociais</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                A criança vai e volta desacompanhada da escola? *
              </label>
              <select
                value={form.schoolCommuteAlone}
                onChange={e => updateField('schoolCommuteAlone', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Existe algum cuidado de saúde?</label>
              <select
                value={form.healthCareNeeded}
                onChange={e => updateField('healthCareNeeded', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            {form.healthCareNeeded === 'sim' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Qual cuidado de saúde? *</label>
                <input
                  type="text"
                  value={form.healthNotes}
                  onChange={e => updateField('healthNotes', e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Restrição alimentar</label>
              <input
                type="text"
                value={form.restricaoAlimentar}
                onChange={e => updateField('restricaoAlimentar', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                placeholder="Ex: intolerância à lactose, dieta específica"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Alergia alimentar</label>
              <input
                type="text"
                value={form.alergiaAlimentar}
                onChange={e => updateField('alergiaAlimentar', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                placeholder="Ex: amendoim, leite"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Alergia a medicamentos</label>
              <input
                type="text"
                value={form.alergiaMedicamento}
                onChange={e => updateField('alergiaMedicamento', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                placeholder="Ex: dipirona"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Medicamentos em uso</label>
              <input
                type="text"
                value={form.medicamentosEmUso}
                onChange={e => updateField('medicamentosEmUso', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                placeholder="Nome + dosagem + horario"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Necessidades específicas</label>
              <input
                type="text"
                value={form.specialNeeds}
                onChange={e => updateField('specialNeeds', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">É renovação de matrícula? *</label>
              <select
                value={form.renovacao}
                onChange={e => updateField('renovacao', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
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

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notas internas da triagem</label>
              <input
                type="text"
                value={form.priorityReason}
                onChange={e => updateField('priorityReason', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-800">Termo LGPD *</p>
              <p className="mb-3 text-xs text-gray-600">
                Confirme que o responsável leu e assinou o Termo LGPD físico de coleta e uso de dados do Lumine.
              </p>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.termoLgpdAssinado}
                  onChange={e => updateField('termoLgpdAssinado', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                O responsável assinou o termo LGPD físico
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Resultado da triagem (opcional)</label>
              <select
                value={form.triageResult}
                onChange={e => updateField('triageResult', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                {triageResultOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button"
              onClick={handleSaveTriagem}
              disabled={writeBlocked}
              className={cn(
                'flex-1 rounded-lg bg-teal-50 py-4 font-semibold text-gray-700',
                writeBlocked && 'cursor-not-allowed opacity-50'
              )}
            >
              {triageComplete ? 'Concluir triagem' : 'Salvar rascunho'}
            </button>
            <button type="button"
              onClick={() => {
                setTriageError('');
                if (writeBlocked) {
                  setTriageError(offlineWriteMessage);
                  return;
                }
                if (form.triageResult !== 'aprovado') {
                  setTriageError("Selecione 'Aprovada para matrícula' para continuar.");
                  return;
                }
                if (!triageComplete) {
                  setTriageError('Complete os itens obrigatórios da triagem para continuar.');
                  return;
                }
                setStep(2);
              }}
              disabled={writeBlocked}
              className={cn(
                'flex-1 rounded-lg bg-orange-500 py-4 font-semibold text-gray-900 hover:bg-orange-400',
                writeBlocked && 'cursor-not-allowed opacity-50'
              )}
            >
              Continuar para matrícula
            </button>
          </div>
          {triageError && (
            <p className="text-pretty text-xs text-rose-600">{triageError}</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-balance text-lg font-semibold text-gray-800">Matrícula</h2>
            <p className="text-pretty text-sm text-gray-500">Somente para crianças aprovadas na triagem.</p>
          </div>

          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-pretty text-xs font-semibold text-gray-500">Obrigatórios da matrícula</p>
              <span className="text-xs text-gray-500 tabular-nums">
                {matriculaComplete
                  ? 'Completa'
                  : `${matriculaMissingCount} pendente${matriculaMissingCount === 1 ? '' : 's'}`}
              </span>
            </div>

            <div className="mt-3 mb-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    matriculaComplete ? 'bg-green-700' : 'bg-blue-600'
                  )}
                  style={{
                    width: `${Math.round(
                      (matriculaChecklistItems.filter(item => item.complete).length /
                        Math.max(matriculaChecklistItems.length, 1)) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs font-semibold text-gray-600">
                {matriculaChecklistItems.filter(item => item.complete).length} de {matriculaChecklistItems.length} campos preenchidos
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {matriculaChecklistItems.map(item => (
                <span
                  key={item.field}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold',
                    item.complete ? 'bg-emerald-50 text-emerald-800' : 'bg-teal-50 text-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      item.complete ? 'bg-emerald-600' : 'bg-gray-300'
                    )}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data de início *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => updateField('startDate', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Dias de participação *</p>
              <div className="flex flex-wrap gap-2">
                {participationDays.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={form.participationDays.includes(day.value)}
                    onClick={() => toggleParticipationDay(day.value)}
                    className={cn(
                      'rounded-full px-3 py-1 text-sm font-medium transition-all',
                      form.participationDays.includes(day.value)
                        ? 'bg-cyan-700 text-white'
                        : 'bg-teal-50 text-gray-600'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Pessoas autorizadas a retirar a criança *
              </label>
              <input
                type="text"
                value={form.authorizedPickup}
                onChange={e => updateField('authorizedPickup', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                placeholder="Nome(s) autorizados"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Como a criança chega e sai do programa? *
              </label>
              <select
                value={form.formaChegada}
                onChange={e => updateField('formaChegada', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="levada_responsavel">Levada/buscada pelo responsável</option>
                <option value="a_pe">A pé</option>
                <option value="transporte_escolar">Transporte escolar</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                A criança pode sair desacompanhada ao deixar o Lumine? *
              </label>
              <select
                value={form.canLeaveAlone}
                onChange={e => updateField('canLeaveAlone', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            {form.canLeaveAlone === 'sim' && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-gray-700">
                  Declaro que estou ciente de que meu/minha filho(a) está autorizado(a) a sair das
                  dependências do Instituto Lumine sem acompanhamento de um adulto responsável,
                  assumindo total responsabilidade por esse deslocamento.
                </p>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.leaveAloneConfirmado}
                    onChange={e => updateField('leaveAloneConfirmado', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  O responsável confirma esta autorização
                </label>
              </div>
            )}

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-800">Autorização para dados de saúde *</p>
              <p className="mb-3 text-xs text-gray-600">
                Confirme que o responsável autorizou o uso dos dados sensíveis de saúde para segurança da criança.
              </p>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.consentimentoSaude}
                  onChange={e => updateField('consentimentoSaude', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                O responsável autorizou o tratamento de dados de saúde
              </label>
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={e => updateField('termsAccepted', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Declaro ciência e concordo com o Termo de Responsabilidade e Consentimento *
            </label>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Turma/Grupo</label>
              <select
                value={form.classGroup}
                onChange={e => updateField('classGroup', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="pre_alfabetizacao">Pré-alfabetização</option>
                <option value="alfabetizacao">Alfabetização</option>
                <option value="fundamental_1">Fundamental 1</option>
                <option value="fundamental_2">Fundamental 2</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Autorização de uso de imagem (opcional)
              </label>
              <select
                value={form.imageConsent}
                onChange={e => updateField('imageConsent', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Nenhuma autorização</option>
                <option value="interno">Apenas uso interno</option>
                <option value="comunicacao">Comunicação institucional</option>
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Documentos recebidos</p>
              <div className="space-y-2 text-sm text-gray-600">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('certidao_nascimento')}
                    onChange={() => toggleDocument('certidao_nascimento')}
                    className="h-4 w-4 rounded"
                  />
                  Certidão de nascimento
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('documento_responsavel')}
                    onChange={() => toggleDocument('documento_responsavel')}
                    className="h-4 w-4 rounded"
                  />
                  Documento do responsável
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('comprovante_residencia')}
                    onChange={() => toggleDocument('comprovante_residencia')}
                    className="h-4 w-4 rounded"
                  />
                  Comprovante de residência
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('carteira_vacinacao')}
                    onChange={() => toggleDocument('carteira_vacinacao')}
                    className="h-4 w-4 rounded"
                  />
                  Carteira de vacinação
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações pedagógicas</label>
              <textarea
                value={form.initialObservations}
                onChange={e => updateField('initialObservations', e.target.value)}
                rows={3}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg bg-teal-50 py-4 font-semibold text-gray-700"
            >
              Voltar
            </button>
            <button type="button"
              onClick={handleMatricular}
              disabled={!matriculaComplete || writeBlocked}
              className={cn(
                'flex-1 rounded-lg bg-green-600 py-4 font-semibold text-white',
                (!matriculaComplete || writeBlocked) && 'cursor-not-allowed opacity-50'
              )}
            >
              Matricular
            </button>
          </div>
          {matriculaError && (
            <p className="text-pretty text-xs text-rose-600">{matriculaError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default AddChildView;
