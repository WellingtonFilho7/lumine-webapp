export const FINANCE_TYPES = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'doacao', label: 'Doação' },
];

export const FINANCE_CATEGORIES = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'material_pedagogico', label: 'Material pedagógico' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reembolso_voluntario', label: 'Reembolso voluntário' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'outros', label: 'Outros' },
];

export const FINANCE_PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'dinheiro', label: 'Dinheiro' },
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
