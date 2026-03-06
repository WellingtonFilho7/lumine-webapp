import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileImage, FileText, Loader2, Paperclip, RefreshCw, Wallet } from 'lucide-react';
import {
  FINANCE_CATEGORIES,
  FINANCE_PAGE_SIZE,
  FINANCE_PAYMENT_METHODS,
  FINANCE_TYPES,
} from '../../constants/finance';
import { cn } from '../../utils/cn';
import {
  formatFinanceDate,
  formatMoneyBRL,
  getFileExtension,
  mergeUniqueTransactions,
  validateFinanceFile,
} from '../../utils/finance';
import useFinance from '../../hooks/useFinance';

const initialForm = {
  tipo: 'gasto',
  categoria: 'alimentacao',
  descricao: '',
  valor: '',
  dataTransacao: new Date().toISOString().split('T')[0],
  formaPagamento: '',
  observacoes: '',
};

export default function FinanceView({ apiBaseUrl, jsonHeaders, isOnline, onlineOnly = true }) {
  const { listTransactions, createTransactionWithUpload, getFileUrl } = useFinance({
    apiBaseUrl,
    jsonHeaders,
    isOnline,
    onlineOnly,
  });

  const [form, setForm] = useState(initialForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileLoadingById, setFileLoadingById] = useState({});

  const [listError, setListError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');

  const [filters, setFilters] = useState({ tipo: '', from: '', to: '' });

  const categoryMap = useMemo(() => {
    return FINANCE_CATEGORIES.reduce((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {});
  }, []);

  const paymentMap = useMemo(() => {
    return FINANCE_PAYMENT_METHODS.reduce((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {});
  }, []);

  const typeMap = useMemo(() => {
    return FINANCE_TYPES.reduce((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {});
  }, []);

  const loadTransactions = useCallback(
    async ({ cursor = null, reset = false } = {}) => {
      if (reset) {
        setLoadingList(true);
      } else {
        setLoadingMore(true);
      }
      setListError('');

      try {
        const response = await listTransactions({
          cursor,
          tipo: filters.tipo,
          from: filters.from,
          to: filters.to,
          limit: FINANCE_PAGE_SIZE,
        });

        setTransactions(prev =>
          reset ? response.items : mergeUniqueTransactions(prev, response.items)
        );
        setNextCursor(response.nextCursor || null);
        setHasMore(Boolean(response.hasMore || response.nextCursor));
      } catch (error) {
        setListError(error?.message || 'Não foi possível carregar transações.');
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
      }
    },
    [filters.from, filters.tipo, filters.to, listTransactions]
  );

  useEffect(() => {
    loadTransactions({ reset: true });
  }, [loadTransactions]);

  const onChangeFormField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const onSelectFile = useCallback(event => {
    const file = event.target.files?.[0] || null;
    setSubmitError('');
    setSubmitNotice('');

    if (!file) {
      setSelectedFile(null);
      setFileError('');
      return;
    }

    const validation = validateFinanceFile(file);
    if (!validation.ok) {
      setSelectedFile(null);
      setFileError(validation.message);
      return;
    }

    setSelectedFile(file);
    setFileError('');
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setSelectedFile(null);
    setFileError('');
  }, []);

  const submitTransaction = useCallback(
    async event => {
      event.preventDefault();
      setSubmitError('');
      setSubmitNotice('');

      if (!form.descricao.trim()) {
        setSubmitError('Descrição é obrigatória.');
        return;
      }
      if (!form.valor) {
        setSubmitError('Valor é obrigatório.');
        return;
      }

      if (!selectedFile) {
        setSubmitError('Comprovante é obrigatório nesta versão. Anexe um arquivo para continuar.');
        return;
      }

      if (selectedFile) {
        const validation = validateFinanceFile(selectedFile);
        if (!validation.ok) {
          setFileError(validation.message);
          return;
        }
      }

      setSubmitting(true);
      try {
        await createTransactionWithUpload({ form, file: selectedFile });
        setSubmitNotice('Transação registrada com sucesso.');
        resetForm();
        await loadTransactions({ reset: true });
      } catch (error) {
        setSubmitError(error?.message || 'Falha ao registrar transação.');
      } finally {
        setSubmitting(false);
      }
    },
    [createTransactionWithUpload, form, loadTransactions, resetForm, selectedFile]
  );

  const openReceipt = useCallback(
    async (transactionId, comprovantePath) => {
      if (!comprovantePath) return;

      setFileLoadingById(prev => ({ ...prev, [transactionId]: true }));
      setListError('');
      try {
        const signedUrl = await getFileUrl(comprovantePath);
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        setListError(error?.message || 'Não foi possível abrir o comprovante.');
      } finally {
        setFileLoadingById(prev => {
          const next = { ...prev };
          delete next[transactionId];
          return next;
        });
      }
    },
    [getFileUrl]
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Wallet size={18} className="text-cyan-700" />
          <h2 className="text-base font-semibold text-gray-900 lg:text-lg">Lançar transação</h2>
        </div>

        {!isOnline && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sem conexão. O módulo financeiro opera somente online.
          </div>
        )}

        {submitError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError}
          </div>
        )}
        {submitNotice && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {submitNotice}
          </div>
        )}

        <form className="space-y-4" onSubmit={submitTransaction}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Tipo</span>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={form.tipo}
                onChange={event => onChangeFormField('tipo', event.target.value)}
                required
              >
                {FINANCE_TYPES.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Categoria</span>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={form.categoria}
                onChange={event => onChangeFormField('categoria', event.target.value)}
                required
              >
                {FINANCE_CATEGORIES.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Data</span>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={form.dataTransacao}
                onChange={event => onChangeFormField('dataTransacao', event.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Descrição</span>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={form.descricao}
                onChange={event => onChangeFormField('descricao', event.target.value)}
                maxLength={300}
                placeholder="Ex: Compra de material escolar"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Valor (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={form.valor}
                onChange={event => onChangeFormField('valor', event.target.value)}
                placeholder="Ex: 129,90"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Forma de pagamento</span>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={form.formaPagamento}
                onChange={event => onChangeFormField('formaPagamento', event.target.value)}
              >
                <option value="">Não informado</option>
                {FINANCE_PAYMENT_METHODS.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Comprovante obrigatório (JPG/PNG/WEBP/PDF, até 10MB)</span>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <Paperclip size={14} />
                  <span className="truncate">
                    {selectedFile
                      ? `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`
                      : 'Selecionar arquivo'}
                  </span>
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={onSelectFile}
                />
              </label>
              {fileError && <p className="text-xs font-medium text-rose-600">{fileError}</p>}
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Observações</span>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={form.observacoes}
              onChange={event => onChangeFormField('observacoes', event.target.value)}
              maxLength={500}
              placeholder="Opcional"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={submitting || (onlineOnly && !isOnline)}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Salvando...' : 'Salvar transação'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              Limpar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 lg:text-lg">Movimentações</h3>
          <button
            type="button"
            onClick={() => loadTransactions({ reset: true })}
            disabled={loadingList}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(loadingList && 'animate-spin')} />
            Atualizar
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 lg:grid-cols-3">
          <select
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={filters.tipo}
            onChange={event => setFilters(prev => ({ ...prev, tipo: event.target.value }))}
          >
            <option value="">Todos os tipos</option>
            {FINANCE_TYPES.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={filters.from}
            onChange={event => setFilters(prev => ({ ...prev, from: event.target.value }))}
          />
          <input
            type="date"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={filters.to}
            onChange={event => setFilters(prev => ({ ...prev, to: event.target.value }))}
          />
        </div>

        {listError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {listError}
          </div>
        )}

        {loadingList ? (
          <p className="text-sm text-gray-500">Carregando transações...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma movimentação encontrada.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const txId =
                tx.id ||
                `${tx.tipo}-${tx.data || tx.data_transacao || tx.dataTransacao || ''}-${tx.valorCentavos ?? tx.valor_centavos ?? tx.valor ?? tx.amount ?? ''}`;
              const dataTransacao =
                tx.data ||
                tx.data_transacao ||
                tx.dataTransacao ||
                tx.date ||
                tx.created_at ||
                tx.createdAt ||
                tx.updated_at ||
                tx.updatedAt;
              const tipo = tx.tipo || tx.type;
              const categoria = tx.categoria || tx.category;
              const descricao = tx.descricao || tx.description || '-';
              const valorCentavos = tx.valorCentavos ?? tx.valor_centavos;
              const valorBase = tx.valor ?? tx.amount ?? tx.value;
              const valor = Number.isFinite(Number(valorBase))
                ? Number(valorBase)
                : Number.isFinite(Number(valorCentavos))
                ? Number(valorCentavos) / 100
                : NaN;
              const formaPagamento = tx.forma_pagamento || tx.formaPagamento || tx.paymentMethod;
              const comprovantePath = tx.comprovante_path || tx.comprovantePath || tx.receiptPath || '';
              const loadingFile = Boolean(fileLoadingById[txId]);
              const ext = getFileExtension(comprovantePath);

              return (
                <div
                  key={txId}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 lg:flex lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          tipo === 'gasto' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'
                        )}
                      >
                        {typeMap[tipo] || tipo || '-'}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-gray-900">{descricao}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      <span>{categoryMap[categoria] || categoria || '-'}</span>
                      <span>{paymentMap[formaPagamento] || formaPagamento || 'Forma não informada'}</span>
                      {comprovantePath && (
                        <span className="inline-flex items-center gap-1">
                          {ext === 'pdf' ? <FileText size={12} /> : <FileImage size={12} />}
                          Comprovante
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 lg:mt-0">
                    <div className="min-w-[108px] text-right">
                      <p className="text-[11px] text-gray-500">{formatFinanceDate(dataTransacao)}</p>
                      <p className="text-sm font-semibold text-gray-900">{formatMoneyBRL(valor)}</p>
                    </div>
                    {comprovantePath && (
                      <button
                        type="button"
                        onClick={() => openReceipt(txId, comprovantePath)}
                        disabled={loadingFile}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
                      >
                        {loadingFile ? <Loader2 size={12} className="animate-spin" /> : null}
                        Ver comprovante
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !loadingList && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => loadTransactions({ cursor: nextCursor, reset: false })}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" />}
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
