import { useCallback, useMemo, useState } from 'react';

function getErrorMessage(status, body, fallback) {
  if (body?.message) return body.message;
  if (status === 401) return 'Sessão inválida. Entre novamente.';
  if (status === 403) return 'Acesso restrito a administradores.';
  return fallback;
}

function extractFileNameFromDisposition(disposition) {
  const value = String(disposition || '');
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const simpleMatch = value.match(/filename="?([^"]+)"?/i);
  return simpleMatch?.[1] || '';
}

function triggerBlobDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export default function useOperationalBackup({
  apiBaseUrl = '',
  jsonHeaders = {},
  enabled = false,
}) {
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupNotice, setBackupNotice] = useState('');

  const backupUrl = useMemo(() => {
    if (!apiBaseUrl) return '';
    return `${apiBaseUrl}/admin/operational-backup/download`;
  }, [apiBaseUrl]);

  const downloadOperationalBackup = useCallback(async () => {
    if (!enabled || !backupUrl) return { ok: false, skipped: true };

    setIsDownloadingBackup(true);
    setBackupError('');
    setBackupNotice('');

    try {
      const response = await fetch(backupUrl, {
        method: 'GET',
        headers: jsonHeaders,
      });

      if (!response.ok) {
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        setBackupError(
          getErrorMessage(response.status, payload, 'Não foi possível gerar o backup operacional.')
        );
        return { ok: false };
      }

      const blob = await response.blob();
      const disposition = response.headers?.get('content-disposition');
      const fileName = extractFileNameFromDisposition(disposition) || 'operational-backup.json';

      triggerBlobDownload(blob, fileName);
      setBackupNotice(`Backup operacional baixado: ${fileName}`);
      return { ok: true, fileName };
    } catch {
      setBackupError('Falha de rede ao gerar backup operacional.');
      return { ok: false };
    } finally {
      setIsDownloadingBackup(false);
    }
  }, [backupUrl, enabled, jsonHeaders]);

  return {
    isDownloadingBackup,
    backupError,
    backupNotice,
    downloadOperationalBackup,
  };
}
