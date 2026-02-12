import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import {
  TRIAGE_REQUIRED_FIELDS,
  MATRICULA_REQUIRED_FIELDS,
  buildChecklist,
  isTriageComplete,
  isMatriculaComplete,
} from '../../utils/enrollment';

function AddChildView({ addChild, setView, triageResultOptions, participationDays, statusFieldLabels }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    guardianName: '',
    guardianPhone: '',
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
    specialNeeds: '',
    triageNotes: '',
    priority: '',
    priorityReason: '',
    triageResult: '',
    startDate: new Date().toISOString().split('T')[0],
    participationDays: [],
    authorizedPickup: '',
    canLeaveAlone: '',
    leaveAloneConsent: false,
    leaveAloneConfirmation: '',
    termsAccepted: false,
    classGroup: '',
    imageConsent: '',
    documentsReceived: [],
    initialObservations: '',
  });

  const [triageError, setTriageError] = useState('');
  const [matriculaError, setMatriculaError] = useState('');

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
    ...(form.canLeaveAlone === 'sim' ? ['leaveAloneConsent', 'leaveAloneConfirmation'] : []),
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

    const {
      termsAccepted,
      triageResult,
      healthNotes,
      leaveAloneConfirmation,
      ...rest
    } = form;

    return {
      ...rest,
      healthNotes: form.healthCareNeeded === 'sim' ? healthNotes : '',
      leaveAloneConfirmation: form.canLeaveAlone === 'sim' ? leaveAloneConfirmation : '',
      enrollmentStatus: status,
      enrollmentDate: now,
      triageDate: triageCompleteFlag ? now : '',
      matriculationDate: status === 'matriculado' ? now : '',
      startDate: status === 'matriculado' ? form.startDate : '',
      entryDate: status === 'matriculado' ? form.startDate : '',
      responsibilityTerm: termsAccepted,
      consentTerm: termsAccepted,
      enrollmentHistory,
    };
  };

  const handleSaveTriagem = () => {
    setTriageError('');
    if (form.triageResult && !triageComplete) {
      setTriageError('Complete os itens obrigatórios da triagem para definir o resultado.');
      return;
    }
    const status = form.triageResult || 'em_triagem';
    addChild(buildPayload(status, triageComplete));
    setView('children');
  };

  const handleMatricular = () => {
    setTriageError('');
    setMatriculaError('');
    if (!triageComplete) {
      setTriageError('Complete os itens obrigatórios da triagem para concluir.');
      return;
    }
    if (!matriculaComplete) {
      setMatriculaError('Complete os itens obrigatórios da matrícula para concluir.');
      return;
    }
    addChild(buildPayload('matriculado', true));
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

            {/* Progress Bar */}
            <div className="mt-3 mb-3">
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    triageComplete ? "bg-green-600" : "bg-blue-600"
                  )}
                  style={{
                    width: `${Math.round((triageChecklistItems.filter(item => item.complete).length / triageChecklistItems.length) * 100)}%`
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-600 font-semibold">
                {triageChecklistItems.filter(item => item.complete).length} de {triageChecklistItems.length} campos preenchidos
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {triageChecklistItems.map(item => (
                <span
                  key={item.field}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold',
                    item.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      item.complete ? 'bg-emerald-500' : 'bg-gray-300'
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
                onChange={e => updateField('guardianPhone', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                placeholder="(83) 99999-9999"
              />
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
                <option value="manhã">Manhã</option>
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
                <option value="indicação">Indicação</option>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone alternativo</label>
              <input
                type="tel"
                value={form.guardianPhoneAlt}
                onChange={e => updateField('guardianPhoneAlt', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              />
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Qual cuidado de saúde?</label>
                <input
                  type="text"
                  value={form.healthNotes}
                  onChange={e => updateField('healthNotes', e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Existe alguma restrição alimentar?</label>
              <select
                value={form.dietaryRestriction}
                onChange={e => updateField('dietaryRestriction', e.target.value)}
                className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
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
                <option value="média">Média</option>
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
            <button
              onClick={handleSaveTriagem}
              className="flex-1 rounded-lg bg-teal-50 py-4 font-semibold text-gray-700"
            >
              {triageComplete ? 'Concluir triagem' : 'Salvar rascunho'}
            </button>
            <button
              onClick={() => {
                setTriageError('');
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
              className="flex-1 rounded-lg bg-orange-500 py-4 font-semibold text-gray-900 hover:bg-orange-400"
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

            {/* Progress Bar */}
            <div className="mt-3 mb-3">
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    matriculaComplete ? "bg-green-600" : "bg-blue-600"
                  )}
                  style={{
                    width: `${Math.round((matriculaChecklistItems.filter(item => item.complete).length / matriculaChecklistItems.length) * 100)}%`
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-600 font-semibold">
                {matriculaChecklistItems.filter(item => item.complete).length} de {matriculaChecklistItems.length} campos preenchidos
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {matriculaChecklistItems.map(item => (
                <span
                  key={item.field}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold',
                    item.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      item.complete ? 'bg-emerald-500' : 'bg-gray-300'
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
              <div className="space-y-3 rounded-lg bg-cyan-50 p-4">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.leaveAloneConsent}
                    onChange={e => updateField('leaveAloneConsent', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Autorizo a saída desacompanhada
                </label>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Confirmação do responsável legal *
                  </label>
                  <input
                    type="text"
                    value={form.leaveAloneConfirmation}
                    onChange={e => updateField('leaveAloneConfirmation', e.target.value)}
                    className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
                    placeholder="Ex: Autorizo que Maria saia desacompanhada"
                  />
                </div>
              </div>
            )}
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
                <option value="pré_alfabetização">Pré-alfabetização</option>
                <option value="alfabetização">Alfabetização</option>
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
                <option value="">Não autorizo</option>
                <option value="interno">Uso interno (sem divulgação)</option>
                <option value="comunicacao">Uso institucional e comunicação</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Documentos recebidos</p>
              <div className="space-y-2 text-sm text-gray-600">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('certidão_nascimento')}
                    onChange={() => toggleDocument('certidão_nascimento')}
                    className="h-4 w-4 rounded"
                  />
                  Certidão de nascimento
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('documento_responsável')}
                    onChange={() => toggleDocument('documento_responsável')}
                    className="h-4 w-4 rounded"
                  />
                  Documento do responsável
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('comprovante_residência')}
                    onChange={() => toggleDocument('comprovante_residência')}
                    className="h-4 w-4 rounded"
                  />
                  Comprovante de residência
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
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg bg-teal-50 py-4 font-semibold text-gray-700"
            >
              Voltar
            </button>
            <button
              onClick={handleMatricular}
              disabled={!matriculaComplete}
              className={cn(
                'flex-1 rounded-lg bg-green-600 py-4 font-semibold text-white',
                !matriculaComplete && 'opacity-50'
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

// ============================================
// DETALHES DA CRIANÇA
// ============================================

export default AddChildView;
