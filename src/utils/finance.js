import {
  FINANCE_ALLOWED_FILE_EXTENSIONS,
  FINANCE_ALLOWED_FILE_TYPES,
  FINANCE_MAX_FILE_SIZE_BYTES,
} from '../constants/finance';

export function getFileExtension(fileName = '') {
  const normalized = String(fileName || '').trim().toLowerCase();
  const parts = normalized.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1];
}

export function validateFinanceFile(file) {
  if (!file) return { ok: true };

  if (typeof file.size === 'number' && file.size > FINANCE_MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: 'Arquivo maior que 10MB. Escolha um comprovante menor.',
    };
  }

  const ext = getFileExtension(file.name);
  const type = String(file.type || '').toLowerCase();
  const extAllowed = FINANCE_ALLOWED_FILE_EXTENSIONS.includes(ext);
  const typeAllowed = FINANCE_ALLOWED_FILE_TYPES.includes(type);

  if (!extAllowed && !typeAllowed) {
    return {
      ok: false,
      message: 'Formato inválido. Use JPG, PNG, WEBP ou PDF.',
    };
  }

  return { ok: true };
}

export function parseMoneyToNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const raw = String(value || '').trim();
  if (!raw) return NaN;

  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function formatMoneyBRL(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'R$ 0,00';
  return numeric.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatFinanceDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(String(dateString));
  if (Number.isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString('pt-BR');
}

export function buildFinanceCreatePayload(form, comprovantePath) {
  const valor = parseMoneyToNumber(form.valor);

  const payload = {
    tipo: form.tipo,
    categoria: form.categoria,
    descricao: String(form.descricao || '').trim(),
    valor,
    data_transacao: form.dataTransacao,
    dataTransacao: form.dataTransacao,
    observacoes: String(form.observacoes || '').trim(),
    forma_pagamento: form.formaPagamento || null,
    formaPagamento: form.formaPagamento || null,
  };

  if (comprovantePath) {
    payload.comprovantePath = comprovantePath;
    payload.comprovante_path = comprovantePath;
  }

  return payload;
}

export function normalizeListPayload(payload) {
  const container = payload?.data || payload || {};
  const items = Array.isArray(container.items) ? container.items : [];

  return {
    items,
    total: Number(container.total || items.length || 0),
    nextCursor: container.nextCursor || container.next_cursor || null,
    hasMore:
      typeof container.hasMore === 'boolean'
        ? container.hasMore
        : typeof container.has_more === 'boolean'
        ? container.has_more
        : Boolean(container.nextCursor || container.next_cursor),
  };
}

export function mergeUniqueTransactions(currentItems, nextItems) {
  const seen = new Set();
  const merged = [];

  [...currentItems, ...nextItems].forEach(item => {
    const key = item?.id || `${item?.data_transacao || ''}-${item?.descricao || ''}-${item?.valor || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
}
