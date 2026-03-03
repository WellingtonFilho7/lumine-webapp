export const ENROLLMENT_STATUS_META = {
  pre_inscrito: { label: 'Pré-inscrito', className: 'bg-blue-50 text-blue-800 font-semibold' },
  em_triagem: { label: 'Em triagem', className: 'bg-amber-100 text-amber-800 font-semibold' },
  aprovado: { label: 'Aprovado', className: 'bg-blue-100 text-blue-800 font-semibold' },
  lista_espera: { label: 'Lista de espera', className: 'bg-orange-200 text-orange-900 font-semibold' },
  matriculado: { label: 'Matriculado', className: 'bg-green-100 text-green-800 font-semibold' },
  recusado: { label: 'Não atendida', className: 'bg-red-100 text-red-800 font-semibold' },
  desistente: { label: 'Desistente', className: 'bg-gray-200 text-gray-700 font-semibold' },
  inativo: { label: 'Inativo', className: 'bg-gray-200 text-gray-700 font-semibold' },
};

export const TRIAGE_RESULT_OPTIONS = [
  { value: 'aprovado', label: 'Aprovada para matrícula' },
  { value: 'lista_espera', label: 'Lista de espera' },
  { value: 'recusado', label: 'Não atendida no momento' },
];

export const PARTICIPATION_DAYS = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
];

export const STATUS_FIELD_LABELS = {
  name: 'Nome completo',
  sexo: 'Sexo da criança',
  birthDate: 'Data de nascimento',
  guardianName: 'Nome do responsável',
  parentesco: 'Parentesco do responsável',
  guardianPhone: 'Telefone (WhatsApp)',
  contatoEmergenciaNome: 'Contato de emergência (nome)',
  contatoEmergenciaTelefone: 'Contato de emergência (telefone)',
  neighborhood: 'Bairro/Comunidade',
  school: 'Escola',
  schoolShift: 'Turno escolar',
  triageNotes: 'Observações da triagem',
  priority: 'Prioridade',
  referralSource: 'Origem do contato',
  schoolCommuteAlone: 'Vai e volta desacompanhada da escola',
  renovacao: 'Renovação de matrícula',
  healthCareNeeded: 'Cuidado de saúde',
  healthNotes: 'Cuidado de saúde informado',
  startDate: 'Data de início',
  participationDays: 'Dias de participação',
  authorizedPickup: 'Pessoas autorizadas a retirar',
  canLeaveAlone: 'Pode sair desacompanhada',
  leaveAloneConfirmado: 'Confirmação de saída desacompanhada',
  formaChegada: 'Forma de chegada/saída',
  consentimentoSaude: 'Autorização para dados de saúde',
  termsAccepted: 'Termo de Responsabilidade e Consentimento',
};

export const TRIAGE_REQUIRED_STATUSES = [
  'em_triagem',
  'aprovado',
  'lista_espera',
  'recusado',
  'matriculado',
];

export const WEEKDAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export const MOOD_LABELS = {
  happy: '😊 Animada',
  calm: '😌 Tranquila',
  quiet: '🤫 Quieta',
  sad: '😢 Chorosa',
  agitated: '😤 Agitada',
  irritated: '😠 Irritada',
};
