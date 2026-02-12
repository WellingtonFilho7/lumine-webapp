import React, { useEffect, useState } from 'react';
import { Clock, Phone, School, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getMissingMatriculaFields, getMissingTriageFields } from '../../utils/enrollment';
import InfoRow from '../../components/ui/InfoRow';
import StatusBadge from '../../components/ui/StatusBadge';
import ChildAvatar from '../../components/ui/ChildAvatar';

function ChildDetailView({
  child,
  dailyRecords,
  onUpdateChild,
  getStatusMeta,
  parseEnrollmentHistory,
  buildStatusFormData,
  getMissingFieldsForStatus,
  normalizeImageConsent,
  participationDays,
  enrollmentStatusMeta,
  formatDate,
  calculateAge,
  calculateAttendanceRate,
  moodLabels,
}) {
  const childRecords = dailyRecords
    .filter(r => r.childInternalId === child.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const rate = calculateAttendanceRate(childRecords);
  const present = childRecords.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  const absent = childRecords.filter(r => r.attendance === 'absent').length;

  const statusMeta = getStatusMeta(child);
  const enrollmentHistory = parseEnrollmentHistory(child.enrollmentHistory);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [nextStatus, setNextStatus] = useState(statusMeta.status);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusFormData, setStatusFormData] = useState(() => buildStatusFormData(child));

  useEffect(() => {
    setStatusFormData(buildStatusFormData(child));
  }, [child, buildStatusFormData]);

  const requiresTriage = ['em_triagem', 'aprovado', 'lista_espera', 'recusado', 'matriculado']
    .includes(nextStatus);
  const requiresMatricula = nextStatus === 'matriculado';
  const missingTriage = requiresTriage ? getMissingTriageFields(statusFormData) : [];
  const missingMatricula = requiresMatricula ? getMissingMatriculaFields(statusFormData) : [];

  const missingSet = new Set([...missingTriage, ...missingMatricula]);
  const fieldClass = field =>
    cn(
      'w-full rounded-lg border px-3 py-2 text-sm',
      missingSet.has(field) ? 'border-rose-300 focus:ring-rose-300' : 'border-gray-200'
    );

  const updateStatusField = (field, value) => {
    setStatusFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleStatusDocument = doc => {
    setStatusFormData(prev => {
      const current = Array.isArray(prev.documentsReceived) ? prev.documentsReceived : [];
      const next = current.includes(doc)
        ? current.filter(item => item !== doc)
        : [...current, doc];
      return { ...prev, documentsReceived: next };
    });
  };

  const allowedStatusOptions = [
    { value: 'em_triagem', label: 'Em triagem' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'lista_espera', label: 'Lista de espera' },
    { value: 'matriculado', label: 'Matriculado' },
    { value: 'recusado', label: 'Não atendida' },
    { value: 'desistente', label: 'Desistente' },
    { value: 'inativo', label: 'Inativo' },
  ];

  const validateStatusTransition = status => {
    if (status === statusMeta.status) return 'Escolha um status diferente.';
    const missing = getMissingFieldsForStatus(status, statusFormData);
    if (missing.length) {
      return `Complete os campos obrigatórios: ${missing.join(', ')}.`;
    }
    if (status === 'recusado' && !statusNotes.trim()) {
      return 'Informe o motivo do não atendimento.';
    }
    if (status === 'desistente' && !statusNotes.trim()) {
      return 'Informe o motivo da desistência.';
    }
    return '';
  };

  const applyStatusChange = () => {
    const error = validateStatusTransition(nextStatus);
    if (error) {
      setStatusError(error);
      return;
    }
    setStatusError('');
    const now = new Date().toISOString();
    const updatedHistory = [
      ...enrollmentHistory,
      { date: now, action: nextStatus, notes: statusNotes.trim() || 'Atualização de status' },
    ];

    const updates = {
      enrollmentStatus: nextStatus,
      enrollmentHistory: updatedHistory,
    };

    if (requiresTriage) {
      updates.name = statusFormData.name.trim();
      updates.birthDate = statusFormData.birthDate;
      updates.guardianName = statusFormData.guardianName.trim();
      updates.guardianPhone = statusFormData.guardianPhone.trim();
      updates.neighborhood = statusFormData.neighborhood.trim();
      updates.school = statusFormData.school.trim();
      updates.schoolShift = statusFormData.schoolShift;
      updates.referralSource = statusFormData.referralSource;
      updates.schoolCommuteAlone = statusFormData.schoolCommuteAlone;
    }

    if (!child.enrollmentDate) updates.enrollmentDate = now;
    if (requiresTriage && !child.triageDate) updates.triageDate = now;

    if (requiresMatricula) {
      updates.startDate = statusFormData.startDate;
      updates.entryDate = statusFormData.startDate;
      updates.participationDays = statusFormData.participationDays;
      updates.authorizedPickup = statusFormData.authorizedPickup.trim();
      updates.canLeaveAlone = statusFormData.canLeaveAlone;
      updates.leaveAloneConsent =
        statusFormData.canLeaveAlone === 'sim' ? statusFormData.leaveAloneConsent : false;
      updates.leaveAloneConfirmation =
        statusFormData.canLeaveAlone === 'sim' ? statusFormData.leaveAloneConfirmation.trim() : '';
      updates.responsibilityTerm = statusFormData.termsAccepted;
      updates.consentTerm = statusFormData.termsAccepted;
      updates.classGroup = statusFormData.classGroup || '';
      updates.imageConsent = normalizeImageConsent(statusFormData.imageConsent);
      updates.documentsReceived = Array.isArray(statusFormData.documentsReceived)
        ? statusFormData.documentsReceived
        : [];
      updates.initialObservations = statusFormData.initialObservations || '';
      if (!child.matriculationDate) updates.matriculationDate = now;
    }

    if (onUpdateChild) onUpdateChild(child.id, updates);
    setShowStatusForm(false);
    setStatusNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Avatar e nome */}
      <div className="rounded-lg bg-white p-6 text-center shadow-md">
        <ChildAvatar name={child.name} status={statusMeta.status} size="lg" className="mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">{child.name}</h2>
        <p className="text-xs font-normal text-gray-500">
          {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
        </p>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-gray-400">Status da matrícula</p>
            <StatusBadge status={statusMeta.status} size="md" className="mt-2" />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowStatusForm(prev => !prev);
              setStatusError('');
              setNextStatus(statusMeta.status);
              setStatusFormData(buildStatusFormData(child));
            }}
            className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800"
          >
            Alterar status
          </button>
        </div>

        {showStatusForm && (
          <div className="mt-4 space-y-3">
            <select
              value={nextStatus}
              onChange={e => setNextStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {allowedStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <textarea
              value={statusNotes}
              onChange={e => setStatusNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Notas da mudança de status"
            />
            {(requiresTriage || requiresMatricula) && (
              <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Dados obrigatórios</p>
                  {missingSet.size > 0 && (
                    <span className="text-xs font-semibold text-rose-600">
                      {missingSet.size} pendente(s)
                    </span>
                  )}
                </div>

                {requiresTriage && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500">Triagem</p>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Nome completo</label>
                      <input
                        type="text"
                        value={statusFormData.name}
                        onChange={e => updateStatusField('name', e.target.value)}
                        className={fieldClass('name')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Data de nascimento</label>
                      <input
                        type="date"
                        value={statusFormData.birthDate}
                        onChange={e => updateStatusField('birthDate', e.target.value)}
                        className={fieldClass('birthDate')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Nome do responsável</label>
                      <input
                        type="text"
                        value={statusFormData.guardianName}
                        onChange={e => updateStatusField('guardianName', e.target.value)}
                        className={fieldClass('guardianName')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Telefone (WhatsApp)</label>
                      <input
                        type="tel"
                        value={statusFormData.guardianPhone}
                        onChange={e => updateStatusField('guardianPhone', e.target.value)}
                        className={fieldClass('guardianPhone')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Bairro/Comunidade</label>
                      <input
                        type="text"
                        value={statusFormData.neighborhood}
                        onChange={e => updateStatusField('neighborhood', e.target.value)}
                        className={fieldClass('neighborhood')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Escola</label>
                      <input
                        type="text"
                        value={statusFormData.school}
                        onChange={e => updateStatusField('school', e.target.value)}
                        className={fieldClass('school')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Turno escolar</label>
                      <select
                        value={statusFormData.schoolShift}
                        onChange={e => updateStatusField('schoolShift', e.target.value)}
                        className={fieldClass('schoolShift')}
                      >
                        <option value="">Selecione</option>
                        <option value="manhã">Manhã</option>
                        <option value="tarde">Tarde</option>
                        <option value="integral">Integral</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Como conheceu o Lumine?</label>
                      <select
                        value={statusFormData.referralSource}
                        onChange={e => updateStatusField('referralSource', e.target.value)}
                        className={fieldClass('referralSource')}
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
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Vai e volta desacompanhada da escola?
                      </label>
                      <select
                        value={statusFormData.schoolCommuteAlone}
                        onChange={e => updateStatusField('schoolCommuteAlone', e.target.value)}
                        className={fieldClass('schoolCommuteAlone')}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  </div>
                )}

                {requiresMatricula && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500">Matrícula</p>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Data de início</label>
                      <input
                        type="date"
                        value={statusFormData.startDate}
                        onChange={e => updateStatusField('startDate', e.target.value)}
                        className={fieldClass('startDate')}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-700">Dias de participação</p>
                      <div className="flex flex-wrap gap-2">
                        {participationDays.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() =>
                              updateStatusField(
                                'participationDays',
                                statusFormData.participationDays.includes(day.value)
                                  ? statusFormData.participationDays.filter(item => item !== day.value)
                                  : [...statusFormData.participationDays, day.value]
                              )
                            }
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-medium',
                              statusFormData.participationDays.includes(day.value)
                                ? 'bg-cyan-700 text-white'
                                : missingSet.has('participationDays')
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-gray-200 text-gray-600'
                            )}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Pessoas autorizadas a retirar
                      </label>
                      <input
                        type="text"
                        value={statusFormData.authorizedPickup}
                        onChange={e => updateStatusField('authorizedPickup', e.target.value)}
                        className={fieldClass('authorizedPickup')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Pode sair desacompanhada?
                      </label>
                      <select
                        value={statusFormData.canLeaveAlone}
                        onChange={e => updateStatusField('canLeaveAlone', e.target.value)}
                        className={fieldClass('canLeaveAlone')}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    {statusFormData.canLeaveAlone === 'sim' && (
                      <div className="space-y-2 rounded-lg bg-white p-2">
                        <label className="flex items-center gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={statusFormData.leaveAloneConsent}
                            onChange={e => updateStatusField('leaveAloneConsent', e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          Autorizo a saída desacompanhada
                        </label>
                        <input
                          type="text"
                          value={statusFormData.leaveAloneConfirmation}
                          onChange={e => updateStatusField('leaveAloneConfirmation', e.target.value)}
                          placeholder="Confirmação da autorização"
                          className={fieldClass('leaveAloneConfirmation')}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={statusFormData.termsAccepted}
                        onChange={e => updateStatusField('termsAccepted', e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      Termo de Responsabilidade e Consentimento
                    </label>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Turma/Grupo</label>
                      <select
                        value={statusFormData.classGroup}
                        onChange={e => updateStatusField('classGroup', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Selecione</option>
                        <option value="pré_alfabetização">Pré-alfabetização</option>
                        <option value="alfabetização">Alfabetização</option>
                        <option value="fundamental_1">Fundamental 1</option>
                        <option value="fundamental_2">Fundamental 2</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Autorização de uso de imagem (opcional)
                      </label>
                      <select
                        value={statusFormData.imageConsent}
                        onChange={e => updateStatusField('imageConsent', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Não autorizo</option>
                        <option value="interno">Uso interno (sem divulgação)</option>
                        <option value="comunicacao">Uso institucional e comunicação</option>
                      </select>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-700">Documentos recebidos</p>
                      <div className="space-y-2 text-xs text-gray-600">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={statusFormData.documentsReceived.includes('certidão_nascimento')}
                            onChange={() => toggleStatusDocument('certidão_nascimento')}
                            className="h-4 w-4 rounded"
                          />
                          Certidão de nascimento
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={statusFormData.documentsReceived.includes('documento_responsável')}
                            onChange={() => toggleStatusDocument('documento_responsável')}
                            className="h-4 w-4 rounded"
                          />
                          Documento do responsável
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={statusFormData.documentsReceived.includes('comprovante_residência')}
                            onChange={() => toggleStatusDocument('comprovante_residência')}
                            className="h-4 w-4 rounded"
                          />
                          Comprovante de residência
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Observações pedagógicas</label>
                      <textarea
                        value={statusFormData.initialObservations}
                        onChange={e => updateStatusField('initialObservations', e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {statusError && <p className="text-pretty text-xs text-rose-600">{statusError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowStatusForm(false)}
                className="flex-1 rounded-lg bg-teal-50 py-2 text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyStatusChange}
                className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-gray-900 hover:bg-orange-400"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-cyan-50 p-3 text-center">
          <p className="text-xl font-bold text-cyan-700">{rate}%</p>
          <p className="text-xs text-cyan-700">Frequência</p>
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <p className="text-xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-green-600">Presenças</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center">
          <p className="text-xl font-bold text-red-600">{absent}</p>
          <p className="text-xs text-red-600">Faltas</p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-3 rounded-lg bg-white p-4 shadow-md">
        <h3 className="font-semibold text-gray-800">Informações</h3>
        <InfoRow icon={User} label="Responsável" value={child.guardianName} />
        <InfoRow icon={Phone} label="Telefone" value={child.guardianPhone} />
        {child.school && (
          <InfoRow
            icon={School}
            label="Escola"
            value={`${child.school}${child.grade ? ` - ${child.grade}` : ''}`}
          />
        )}
        <InfoRow icon={Clock} label="Entrada" value={formatDate(child.entryDate)} />
      </div>

      
      {/* Histórico de status */}
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h3 className="mb-3 font-semibold text-gray-800">Histórico da matrícula</h3>
        {enrollmentHistory.length > 0 ? (
          <div className="space-y-2">
            {enrollmentHistory
              .slice()
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((entry, index) => {
                const meta = enrollmentStatusMeta[entry.action] || {
                  label: entry.action || 'Status',
                  className: 'bg-teal-50 text-gray-600',
                };
                return (
                  <div key={`${entry.date}-${index}`} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          meta.className
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                    </div>
                    {entry.notes && <p className="mt-2 text-xs text-gray-600">{entry.notes}</p>}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">Sem histórico registrado.</p>
        )}
      </div>

      {/* Histórico */}
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h3 className="mb-3 font-semibold text-gray-800">Últimos registros</h3>
        {childRecords.length > 0 ? (
          <div className="space-y-2">
            {childRecords.slice(0, 10).map(rec => (
              <div
                key={rec.id}
                className={cn(
                  'rounded-lg border-l-4 p-3',
                  rec.attendance === 'present'
                    ? 'border-green-500 bg-green-50'
                    : rec.attendance === 'late'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-red-500 bg-red-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{formatDate(rec.date)}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      rec.attendance === 'present'
                        ? 'bg-green-200 text-green-800'
                        : rec.attendance === 'late'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                    )}
                  >
                    {rec.attendance === 'present'
                      ? 'Presente'
                      : rec.attendance === 'late'
                      ? 'Atrasado'
                      : 'Ausente'}
                  </span>
                </div>
                {rec.attendance !== 'absent' && rec.mood && (
                  <p className="mt-1 text-xs text-gray-600">
                    {moodLabels[rec.mood] || rec.mood}
                  </p>
                )}
                {rec.notes && (
                  <p className="mt-1 text-xs italic text-gray-500">"{rec.notes}"</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">Nenhum registro</p>
        )}
      </div>
    </div>
  );
}

export default ChildDetailView;
