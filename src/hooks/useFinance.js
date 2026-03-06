import { useCallback } from 'react';
import {
  FINANCE_PAGE_SIZE,
  FINANCE_ALLOWED_FILE_EXTENSIONS,
  FINANCE_ALLOWED_FILE_TYPES,
  FINANCE_MAX_FILE_SIZE_BYTES,
} from '../constants/finance';
import {
  buildFinanceCreatePayload,
  getFileExtension,
  normalizeListPayload,
  parseMoneyToNumber,
  validateFinanceFile,
} from '../utils/finance';

function buildError(status, message, code = 'REQUEST_FAILED') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function resolveApiError(response, payload, fallbackMessage) {
  const status = response?.status || 0;
  const message =
    payload?.message ||
    payload?.error ||
    fallbackMessage ||
    (status ? `Erro HTTP ${status}` : 'Falha de comunicação com servidor.');
  const code = payload?.error || 'REQUEST_FAILED';
  return buildError(status, message, code);
}

function isForbidden(status, payload) {
  return status === 403 || payload?.error === 'FORBIDDEN_ROLE';
}

export default function useFinance({ apiBaseUrl, jsonHeaders, isOnline, onlineOnly = true }) {
  const ensureOnline = useCallback(() => {
    if (onlineOnly && !isOnline) {
      throw buildError(0, 'Sem internet. Conecte para usar o módulo financeiro.', 'OFFLINE');
    }
  }, [onlineOnly, isOnline]);

  const checkFinanceAccess = useCallback(async () => {
    if (!apiBaseUrl) return { ok: false, forbidden: true, message: 'API indisponível.' };

    try {
      const response = await fetch(`${apiBaseUrl}/finance/list?limit=1`, {
        method: 'GET',
        headers: jsonHeaders,
      });
      const payload = await parseJson(response);

      if (!response.ok || !payload?.success) {
        if (isForbidden(response.status, payload)) {
          return { ok: false, forbidden: true, message: 'Acesso restrito ao financeiro.' };
        }
        const error = resolveApiError(response, payload, 'Falha ao validar acesso ao financeiro.');
        return { ok: false, forbidden: false, message: error.message, code: error.code };
      }

      return { ok: true, forbidden: false };
    } catch (error) {
      return {
        ok: false,
        forbidden: false,
        message: error?.message || 'Falha de rede ao validar acesso financeiro.',
      };
    }
  }, [apiBaseUrl, jsonHeaders]);

  const listTransactions = useCallback(
    async ({
      cursor = null,
      tipo = '',
      from = '',
      to = '',
      startDate = '',
      endDate = '',
      limit = FINANCE_PAGE_SIZE,
    } = {}) => {
      ensureOnline();

      const params = new URLSearchParams();
      params.set('limit', String(limit || FINANCE_PAGE_SIZE));
      if (cursor) params.set('cursor', cursor);
      if (tipo) params.set('tipo', tipo);
      const effectiveStartDate = startDate || from;
      const effectiveEndDate = endDate || to;
      if (effectiveStartDate) params.set('startDate', effectiveStartDate);
      if (effectiveEndDate) params.set('endDate', effectiveEndDate);

      const response = await fetch(`${apiBaseUrl}/finance/list?${params.toString()}`, {
        method: 'GET',
        headers: jsonHeaders,
      });
      const payload = await parseJson(response);

      if (!response.ok || !payload?.success) {
        throw resolveApiError(response, payload, 'Não foi possível carregar transações.');
      }

      return normalizeListPayload(payload);
    },
    [apiBaseUrl, jsonHeaders, ensureOnline]
  );

  const createTransactionWithUpload = useCallback(
    async ({ form, file }) => {
      ensureOnline();

      const valor = parseMoneyToNumber(form.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        throw buildError(400, 'Informe um valor válido maior que zero.', 'VALIDATION_ERROR');
      }

      if (!file) {
        throw buildError(
          400,
          'Comprovante é obrigatório nesta versão. Anexe um arquivo para continuar.',
          'VALIDATION_ERROR'
        );
      }

      const validation = validateFinanceFile(file);
      if (!validation.ok) {
        throw buildError(400, validation.message, 'INVALID_FILE');
      }

      let comprovantePath = '';
      let pathToken = '';

      if (file) {
        const uploadBody = {
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSizeBytes: file.size || 0,
        };

        const uploadRes = await fetch(`${apiBaseUrl}/finance/upload-url`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(uploadBody),
        });

        const uploadPayload = await parseJson(uploadRes);
        if (!uploadRes.ok || !uploadPayload?.success) {
          throw resolveApiError(uploadRes, uploadPayload, 'Não foi possível iniciar upload do comprovante.');
        }

        const data = uploadPayload?.data || {};
        const signedUploadUrl = data.signedUploadUrl || data.signedUrl || data.uploadUrl || '';
        comprovantePath = data.comprovantePath || data.path || data.filePath || '';
        pathToken = data.pathToken || data.token || '';

        if (!signedUploadUrl || !comprovantePath) {
          throw buildError(502, 'Resposta inválida no upload de comprovante.', 'UPLOAD_URL_INVALID');
        }

        const ext = getFileExtension(file.name);
        if (!FINANCE_ALLOWED_FILE_EXTENSIONS.includes(ext) && !FINANCE_ALLOWED_FILE_TYPES.includes(file.type)) {
          throw buildError(400, 'Formato inválido. Use JPG, PNG, WEBP ou PDF.', 'INVALID_FILE');
        }

        if (file.size > FINANCE_MAX_FILE_SIZE_BYTES) {
          throw buildError(400, 'Arquivo maior que 10MB. Escolha um comprovante menor.', 'INVALID_FILE');
        }

        const uploadFileRes = await fetch(signedUploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadFileRes.ok) {
          throw buildError(
            uploadFileRes.status,
            'Upload do comprovante falhou. Tente novamente.',
            'UPLOAD_FAILED'
          );
        }
      }

      const createPayload = buildFinanceCreatePayload(form, comprovantePath);
      if (pathToken) {
        createPayload.pathToken = pathToken;
        createPayload.path_token = pathToken;
      }

      const createRes = await fetch(`${apiBaseUrl}/finance/create`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(createPayload),
      });
      const createJson = await parseJson(createRes);

      if (!createRes.ok || !createJson?.success) {
        throw resolveApiError(createRes, createJson, 'Não foi possível salvar a transação.');
      }

      return createJson?.data || null;
    },
    [apiBaseUrl, jsonHeaders, ensureOnline]
  );

  const getFileUrl = useCallback(
    async comprovantePath => {
      ensureOnline();

      if (!comprovantePath) {
        throw buildError(400, 'Comprovante indisponível.', 'NO_FILE');
      }

      const response = await fetch(`${apiBaseUrl}/finance/file-url`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          comprovantePath,
          comprovante_path: comprovantePath,
          path: comprovantePath,
        }),
      });
      const payload = await parseJson(response);

      if (!response.ok || !payload?.success) {
        throw resolveApiError(response, payload, 'Não foi possível abrir o comprovante.');
      }

      const data = payload?.data || {};
      const signedUrl = data.signedUrl || data.url || data.fileUrl || '';
      if (!signedUrl) {
        throw buildError(502, 'URL assinada não retornada pelo servidor.', 'FILE_URL_INVALID');
      }

      return signedUrl;
    },
    [apiBaseUrl, jsonHeaders, ensureOnline]
  );

  return {
    checkFinanceAccess,
    listTransactions,
    createTransactionWithUpload,
    getFileUrl,
  };
}
