export const FINANCE_TYPES = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'doacao', label: 'Doação' },
];

export const FINANCE_CATEGORIES = [
  { value: 'aluguel_utilidades', label: '01 - Aluguel e utilidades' },
  { value: 'manutencao_reparos', label: '02 - Manutenção e reparos' },
  { value: 'impostos_taxas', label: '03 - Impostos e taxas' },
  { value: 'tecnologia_e_equipamentos', label: '04 - Tecnologia e equipamentos' },
  { value: 'reembolso_voluntario', label: '05 - Reembolsos' },
  { value: 'servicos_tecnicos', label: '05 - Serviços técnicos' },
  { value: 'outros', label: '99 - Outros' },
];

export const FINANCE_CATEGORY_LEGACY_LABELS = {
  '01_aluguel_utilidades': '01 - Aluguel e utilidades',
  '02_manutencao_reparos': '02 - Manutenção e reparos',
  '03_impostos_taxas': '03 - Impostos e taxas',
  '04_tecnologia_e_equipamentos': '04 - Tecnologia e equipamentos',
  '05-reembolsos': '05 - Reembolsos',
  '05_reembolsos': '05 - Reembolsos',
  '05_servicos_tecnicos': '05 - Serviços técnicos',
  '99_outros': '99 - Outros',
  infra: 'Infraestrutura (legado)',
};

export const FINANCE_PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'nao_informado', label: 'Não informado' },
];

export const FINANCE_ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const FINANCE_ALLOWED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

export const FINANCE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const FINANCE_PAGE_SIZE = 20;
