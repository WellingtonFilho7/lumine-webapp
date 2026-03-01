import React, { useEffect, useState } from 'react';
import { ChevronDown, Clock, MessageCircle, Phone, School, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getMissingMatriculaFields, getMissingTriageFields } from '../../utils/enrollment';
import InfoRow from '../../components/ui/InfoRow';
import StatusBadge from '../../components/ui/StatusBadge';
import ChildAvatar from '../../components/ui/ChildAvatar';
import { FIXED_LEAVE_ALONE_CONFIRMATION } from '../../utils/enrollmentHardening';

function ChildDetailView({
  child,
  dailyRecords,
  onUpdateChild,
  isOnline = true,
  onlineOnly = false,
  onDeleteChild,
  getStatusMeta,
  parseEnrollmentHistory,
  buildStatusFormData,
  getMissingFieldsForStatus,
  isStatusTransitionAllowed,
  normalizeImageConsent,
  participationDays,
  enrollmentStatusMeta,
  formatDate,
  calculateAge,
  calculateAttendanceRate,
  moodLabels = {},
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
  const [nextStatus, setNextStatus] = useState(statusMeta.status);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusError, setStatusError] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFormData, setStatusFormData] = useState(() => buildStatusFormData(child));
  const writeBlocked = onlineOnly && !isOnline;
  const offlineWriteMessage =
    'Sem internet no momento. No modo online-only, conecte-se para salvar.';
  const sanitizedGuardianPhone = String(child.guardianPhone || '').replace(/\D/g, '');
  const whatsappLink = sanitizedGuardianPhone ? `https://wa.me/55${sanitizedGuardianPhone}` : '';

  useEffect(() => {
    setStatusFormData(buildStatusFormData(child));
    setDeleteArmed(false);
    setDeleteError('');
    setIsDeleting(false);
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
    if (!isStatusTransitionAllowed(statusMeta.status, status)) {
      return 'Transição de status não permitida.';
    }
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

  const applyStatusChange = async () => {
    if (writeBlocked) {
      setStatusError(offlineWriteMessage);
      return;
    }

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
      updates.sexo = statusFormData.sexo;
      updates.birthDate = statusFormData.birthDate;
      updates.guardianName = statusFormData.guardianName.trim();
      updates.parentesco = statusFormData.parentesco;
      updates.guardianPhone = statusFormData.guardianPhone.trim();
      updates.contatoEmergenciaNome = statusFormData.contatoEmergenciaNome.trim();
      updates.contatoEmergenciaTelefone = statusFormData.contatoEmergenciaTelefone.trim();
      updates.neighborhood = statusFormData.neighborhood.trim();
      updates.school = statusFormData.school.trim();
      updates.schoolShift = statusFormData.schoolShift;
      updates.referralSource = statusFormData.referralSource;
      updates.schoolCommuteAlone = statusFormData.schoolCommuteAlone;
      updates.renovacao = statusFormData.renovacao;
      updates.termoLgpdAssinado = statusFormData.termoLgpdAssinado === true;
    }

    if (!child.enrollmentDate) updates.enrollmentDate = now;
    if (requiresTriage && !child.triageDate) updates.triageDate = now;

    if (requiresMatricula) {
      updates.startDate = statusFormData.startDate;
      updates.entryDate = statusFormData.startDate;
      updates.participationDays = statusFormData.participationDays;
      updates.authorizedPickup = statusFormData.authorizedPickup.trim();
      updates.canLeaveAlone = statusFormData.canLeaveAlone;
      updates.leaveAloneConfirmado =
        statusFormData.canLeaveAlone === 'sim' ? statusFormData.leaveAloneConfirmado === true : false;
      updates.leaveAloneConsent = updates.leaveAloneConfirmado;
      updates.leaveAloneConfirmation = updates.leaveAloneConfirmado
        ? FIXED_LEAVE_ALONE_CONFIRMATION
        : '';
      updates.formaChegada = statusFormData.formaChegada;
      updates.consentimentoSaude = statusFormData.consentimentoSaude === true;
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

    const updated = onUpdateChild ? await onUpdateChild(child.id, updates) : false;
    if (updated === false) {
      setStatusError('Não foi possível salvar agora. Verifique a conexão e tente novamente.');
      return;
    }
    setStatusNotes('');
  };

  const handleDeleteChild = async () => {
    if (writeBlocked) {
      setDeleteError(offlineWriteMessage);
      return;
    }

    if (typeof onDeleteChild !== 'function' || !child?.id || isDeleting) return;

    if (!deleteArmed) {
      setDeleteArmed(true);
      setDeleteError('');
      return;
    }

    const confirmed = window.confirm(
      `Confirma excluir definitivamente o cadastro de ${child.name}? Esta ação também remove os registros diários vinculados.`
    );
    if (!confirmed) return;

    setDeleteError('');
    setIsDeleting(true);
    try {
      const ok = await onDeleteChild(child.id);
      if (ok === false) {
        setDeleteError('Não foi possível concluir a exclusão agora. Tente novamente.');
      }
    } catch (_error) {
      setDeleteError('Não foi possível concluir a exclusão agora. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setDeleteArmed(false);
    }
  };



  return (
    <div className="space-y-4">
            {/* Header compacto */}
      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="flex items-center gap-3">
          <ChildAvatar name={child.name} status={statusMeta.status} size="md" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-gray-900">{child.name}</h2>
            <p className="text-xs font-normal text-gray-500">
              {child.birthDate ? calculateAge(child.birthDate) + ' anos' : 'Idade n/d'}
            </p>
          </div>
          <StatusBadge status={statusMeta.status} />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Frequência</span>
            <span className="tabular-nums">{rate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-teal-100">
            <div className="h-full rounded-full bg-cyan-600" style={{ width: String(Math.max(0, Math.min(100, Number(rate) || 0))) + '%' }} />
          </div>
          <p className="mt-2 text-xs text-gray-500 tabular-nums">{present} presenças · {absent} faltas</p>
        </div>
      </div>
      <details className="rounded-lg bg-white p-4 shadow-md">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-900">
          Alterar status
          <ChevronDown className="details-chevron size-4 text-gray-500" />
        </summary>
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-gray-400">Status da matrícula</p>
            <StatusBadge status={statusMeta.status} size="md" className="mt-2" />
          </div>

        </div>
          <div className="mt-4 space-y-3">
            <select
              value={nextStatus}
              onChange={e => setNextStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {allowedStatusOptions.map(option => (
                <option
                    key={option.value}
                    value={option.value}
                    disabled={
                      option.value === statusMeta.status ||
                      !isStatusTransitionAllowed(statusMeta.status, option.value)
                    }
                  >
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
                      <label className="mb-1 block text-xs font-medium text-gray-700">Sexo da criança</label>
                      <select
                        value={statusFormData.sexo}
                        onChange={e => updateStatusField('sexo', e.target.value)}
                        className={fieldClass('sexo')}
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="nao_declarado">Não declarado</option>
                      </select>
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
                      <label className="mb-1 block text-xs font-medium text-gray-700">Parentesco do responsável</label>
                      <select
                        value={statusFormData.parentesco}
                        onChange={e => updateStatusField('parentesco', e.target.value)}
                        className={fieldClass('parentesco')}
                      >
                        <option value="">Selecione</option>
                        <option value="mae">Mãe</option>
                        <option value="pai">Pai</option>
                        <option value="avo">Avó/Avô</option>
                        <option value="tio">Tio/Tia</option>
                        <option value="responsavel_legal">Responsável legal</option>
                        <option value="outro">Outro</option>
                      </select>
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
                      <label className="mb-1 block text-xs font-medium text-gray-700">Contato de emergência (nome)</label>
                      <input
                        type="text"
                        value={statusFormData.contatoEmergenciaNome}
                        onChange={e => updateStatusField('contatoEmergenciaNome', e.target.value)}
                        className={fieldClass('contatoEmergenciaNome')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Contato de emergência (telefone)</label>
                      <input
                        type="tel"
                        value={statusFormData.contatoEmergenciaTelefone}
                        onChange={e => updateStatusField('contatoEmergenciaTelefone', e.target.value)}
                        className={fieldClass('contatoEmergenciaTelefone')}
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
                        <option value="manha">Manhã</option>
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
                        <option value="indicacao">Indicação</option>
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
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Renovação de matrícula</label>
                      <select
                        value={statusFormData.renovacao}
                        onChange={e => updateStatusField('renovacao', e.target.value)}
                        className={fieldClass('renovacao')}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    <label
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-2 text-xs',
                        missingSet.has('termoLgpdAssinado') ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-700'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={statusFormData.termoLgpdAssinado}
                        onChange={e => updateStatusField('termoLgpdAssinado', e.target.checked)}
                        className="size-4"
                      />
                      Responsável assinou o termo LGPD físico
                    </label>
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
                            aria-pressed={statusFormData.participationDays.includes(day.value)}
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
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Forma de chegada/saída
                      </label>
                      <select
                        value={statusFormData.formaChegada}
                        onChange={e => updateStatusField('formaChegada', e.target.value)}
                        className={fieldClass('formaChegada')}
                      >
                        <option value="">Selecione</option>
                        <option value="levada_responsavel">Levada/buscada pelo responsável</option>
                        <option value="a_pe">A pé</option>
                        <option value="transporte_escolar">Transporte escolar</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    {statusFormData.canLeaveAlone === 'sim' && (
                      <div className="space-y-2 rounded-lg bg-white p-2">
                        <label className="flex items-center gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={statusFormData.leaveAloneConfirmado}
                            onChange={e => updateStatusField('leaveAloneConfirmado', e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          O responsável confirma a autorização de saída desacompanhada
                        </label>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={statusFormData.consentimentoSaude}
                        onChange={e => updateStatusField('consentimentoSaude', e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      Autorização para dados de saúde
                    </label>
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
                        <option value="pre_alfabetizacao">Pré-alfabetização</option>
                        <option value="alfabetizacao">Alfabetização</option>
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
                            checked={statusFormData.documentsReceived.includes('certidao_nascimento')}
                            onChange={() => toggleStatusDocument('certidao_nascimento')}
                            className="h-4 w-4 rounded"
                          />
                          Certidão de nascimento
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={statusFormData.documentsReceived.includes('documento_responsavel')}
                            onChange={() => toggleStatusDocument('documento_responsavel')}
                            className="h-4 w-4 rounded"
                          />
                          Documento do responsável
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={statusFormData.documentsReceived.includes('comprovante_residencia')}
                            onChange={() => toggleStatusDocument('comprovante_residencia')}
                            className="h-4 w-4 rounded"
                          />
                          Comprovante de residência
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={statusFormData.documentsReceived.includes('carteira_vacinacao')}
                            onChange={() => toggleStatusDocument('carteira_vacinacao')}
                            className="h-4 w-4 rounded"
                          />
                          Carteira de vacinação
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
                onClick={() => {
                  setStatusError('');
                  setStatusNotes('');
                  setNextStatus(statusMeta.status);
                  setStatusFormData(buildStatusFormData(child));
                }}
                className="flex-1 rounded-lg bg-teal-50 py-2 text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyStatusChange}
                disabled={writeBlocked}
                className={cn(
                  'flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-gray-900 hover:bg-orange-400',
                  writeBlocked && 'cursor-not-allowed opacity-50'
                )}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* Info */}
      <details open className="rounded-lg bg-white p-4 shadow-md">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-900">
          Informações
          <ChevronDown className="details-chevron size-4 text-gray-500" />
        </summary>
        <div className="mt-3 space-y-3">
          <InfoRow icon={User} label="Responsável" value={child.guardianName} />
          <InfoRow icon={Phone} label="Telefone" value={child.guardianPhone} />
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800"
            >
              <MessageCircle className="size-4" />
              Chamar no WhatsApp
            </a>
          )}
          {child.school && (
            <InfoRow
              icon={School}
              label="Escola"
              value={child.school + (child.grade ? ' - ' + child.grade : '')}
            />
          )}
          <InfoRow icon={Clock} label="Entrada" value={formatDate(child.entryDate)} />
        </div>
      </details>

      {/* Histórico de status */}
      <details className="rounded-lg bg-white p-4 shadow-md">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-900">
          Histórico da matrícula
          <ChevronDown className="details-chevron size-4 text-gray-500" />
        </summary>
        <div className="mt-3">
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
                      {enrollmentStatusMeta[entry.action] ? (
                        <StatusBadge status={entry.action} />
                      ) : (
                        <span
                          className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', meta.className)}
                        >
                          {meta.label}
                        </span>
                      )}
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
      </details>

      {/* Histórico */}
      <details className="rounded-lg bg-white p-4 shadow-md">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-900">
          Últimos registros
          <ChevronDown className="details-chevron size-4 text-gray-500" />
        </summary>
        <div className="mt-3">
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
                        ? 'bg-green-100 text-green-800'
                        : rec.attendance === 'late'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    )}
                  >
                    {rec.attendance === 'present'
                      ? 'Presente ✔'
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
      </details>

      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm font-semibold text-rose-900">Zona de perigo</p>
        <p className="mt-1 text-xs text-rose-700">
          Use apenas quando for necessário remover definitivamente o cadastro e seus registros.
        </p>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={handleDeleteChild}
            disabled={writeBlocked || isDeleting || typeof onDeleteChild !== 'function'}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-sm font-semibold text-white',
              deleteArmed ? 'bg-rose-700 hover:bg-rose-800' : 'bg-rose-600 hover:bg-rose-700',
              (writeBlocked || isDeleting || typeof onDeleteChild !== 'function') &&
                'cursor-not-allowed opacity-60'
            )}
          >
            {isDeleting ? 'Excluindo...' : deleteArmed ? 'Confirmar exclusão' : 'Excluir cadastro'}
          </button>

          {deleteArmed && !isDeleting && (
            <button
              type="button"
              onClick={() => {
                setDeleteArmed(false);
                setDeleteError('');
              }}
              className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700"
            >
              Cancelar exclusão
            </button>
          )}

          {deleteArmed && !isDeleting && (
            <p className="text-xs text-rose-700">
              Toque novamente em “Confirmar exclusão” para prosseguir.
            </p>
          )}

          {deleteError && <p className="text-xs text-rose-700">{deleteError}</p>}
        </div>
      </div>
    </div>
  );
}

export default ChildDetailView;
