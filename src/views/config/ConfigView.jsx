import React, { useCallback, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, Upload } from 'lucide-react';
import { ATTENDANCE_THRESHOLDS } from '../../constants';
import { cn } from '../../utils/cn';
import ClearLocalDataDialog from '../../components/dialogs/ClearLocalDataDialog';

const defaultNormalizeChildren = childrenList => ({ children: childrenList, changed: false });
const defaultNormalizeRecords = recordsList => ({ records: recordsList, changed: false });
const defaultIsMatriculated = child => {
  if (!child) return false;
  return child.enrollmentStatus ? child.enrollmentStatus === 'matriculado' : true;
};
const defaultFormatDate = value => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR');
};
const defaultFormatTime = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

function ConfigView({
  children,
  setChildren,
  dailyRecords,
  setDailyRecords,
  syncWithServer,
  downloadFromServer,
  lastSync,
  isOnline,
  overwriteBlocked,
  clearLocalData,
  reviewMode,
  setReviewMode,
  onOpenOnboarding,
  normalizeChildren = defaultNormalizeChildren,
  normalizeRecords = defaultNormalizeRecords,
  isMatriculated = defaultIsMatriculated,
  formatDate = defaultFormatDate,
  formatTime = defaultFormatTime,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const exportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      children,
      dailyRecords,
      records: dailyRecords,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumine-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const importedRecords = Array.isArray(data.dailyRecords)
          ? data.dailyRecords
          : Array.isArray(data.records)
          ? data.records
          : null;
        if (Array.isArray(data.children) && importedRecords) {
          const normalized = normalizeChildren(data.children).children;
          setConfirmAction(() => () => {
            setChildren(normalized);
            const normalizedRecords = normalizeRecords(importedRecords).records;
            setDailyRecords(normalizedRecords);
            setShowConfirm(false);
          });
          setShowConfirm(true);
        }
      } catch {
        alert('Arquivo inválido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Relatório em cards
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const activeChildren = children.filter(isMatriculated);
  const monthRecords = dailyRecords.filter(r => r.date?.startsWith(selectedMonth));
  const monthDays = [...new Set(monthRecords.map(r => r.date?.split('T')[0]))].length;
  const monthMeals = monthRecords.filter(r => r.attendance !== 'absent').length;

  const childStats = activeChildren
    .map(child => {
      const recs = monthRecords.filter(r => r.childInternalId === child.id);
      const present = recs.filter(r => r.attendance === 'present' || r.attendance === 'late')
        .length;
      return {
        ...child,
        present,
        total: recs.length,
        rate: recs.length ? Math.round((present / recs.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.rate - a.rate);

  const handleOnboardingOpen = useCallback(() => {
    onOpenOnboarding?.();
  }, [onOpenOnboarding]);

  const renderOnboardingCard = className => (
    <div className={cn('space-y-3 rounded-lg bg-white p-4 shadow-md', className)}>
      <div>
        <h3 className="text-balance text-base font-semibold text-gray-800">Guia rápida (3 passos)</h3>
        <p className="text-pretty mt-1 text-sm text-gray-500">
          Reabra o checklist sempre que tiver dúvida.
        </p>
      </div>
      <ol className="space-y-2 text-pretty text-sm text-gray-600">
        <li className="flex gap-2">
          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold tabular-nums text-cyan-800">
            1
          </span>
          <span className="text-pretty">Triagem: cadastre o básico e defina o status da criança.</span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold tabular-nums text-cyan-800">
            2
          </span>
          <span className="text-pretty">Matrícula: preencha início, dias de participação e responsável.</span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold tabular-nums text-cyan-800">
            3
          </span>
          <span className="text-pretty">Sincronização: baixe antes se o servidor estiver mais recente.</span>
        </li>
      </ol>
      <button type="button"
        onClick={handleOnboardingOpen}
        className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-gray-900 hover:bg-orange-400"
      >
        Reabrir guia rápida
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Dialog.Root open={showConfirm} onOpenChange={setShowConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 bg-black/50"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6">
            <Dialog.Title className="text-lg font-bold">Confirmar</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-600">
              Substituir dados atuais pelos importados?
            </Dialog.Description>
            <div className="mt-6 flex gap-3">
              <Dialog.Close asChild>
                <button type="button" className="flex-1 rounded-lg bg-teal-50 py-3 font-medium">
                  Cancelar
                </button>
              </Dialog.Close>
              <button type="button"
                onClick={() => confirmAction?.()}
                className="flex-1 rounded-lg bg-orange-500 py-3 font-medium text-gray-900 hover:bg-orange-400"
              >
                Confirmar
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="space-y-4 lg:hidden">
        {/* Sincronização */}
      <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className={cn('size-3 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-500')} />
          <h3 className="text-balance font-semibold text-gray-800">Sincronização</h3>
        </div>

        {lastSync && (
          <p className="text-sm text-gray-500">
            Última sync: {formatDate(lastSync)} às {formatTime(lastSync)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={() => syncWithServer()}
            disabled={!isOnline || overwriteBlocked}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-100 py-3 font-medium text-green-700 disabled:opacity-50"
          >
            <Upload size={18} />
            Enviar
          </button>
          <button type="button"
            onClick={downloadFromServer}
            disabled={!isOnline}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-100 py-3 font-medium text-cyan-700 disabled:opacity-50"
          >
            <Download size={18} />
            Baixar
          </button>
        </div>
      </div>

      {/* Modo revisão */}
      <div className="space-y-3 rounded-lg bg-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-balance font-semibold text-gray-800">Modo revisão</h3>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={reviewMode}
              onChange={e => setReviewMode(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-cyan-700"
            />
          </label>
        </div>
        <p className="text-sm text-gray-500">
          Quando ativo, o app não faz overwrite automático. Use o botão Sync quando estiver pronto.
        </p>
      </div>

      {renderOnboardingCard()}

      {/* Backup */}
      <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
        <h3 className="text-balance font-semibold text-gray-800">Backup Local</h3>
        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={exportJSON}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-100 py-3 font-medium text-cyan-800"
          >
            <Download size={18} />
            Exportar
          </button>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-50 py-3 font-medium text-gray-700">
            <Upload size={18} />
            Importar
            <input type="file" accept=".json" onChange={importJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Segurança */}
      <div className="space-y-3 rounded-lg bg-rose-50 p-4 shadow-md">
        <h3 className="text-balance font-semibold text-rose-700">Segurança</h3>
        <p className="text-sm text-rose-600">Remove todas as crianças e registros deste dispositivo.</p>
        <ClearLocalDataDialog
          onConfirm={clearLocalData}
          triggerClassName="w-full rounded-lg bg-rose-600 py-3 text-sm font-semibold text-white"
        />
      </div>

      {/* Relatório Mensal em Cards */}
      <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
        <h3 className="text-balance font-semibold text-gray-800">Relatório Mensal</h3>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
        />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-cyan-50 p-3">
            <p className="text-lg font-bold text-cyan-700 tabular-nums">{activeChildren.length}</p>
            <p className="text-xs text-cyan-700">Crianças</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-lg font-bold text-green-600">
              {[...new Set(monthRecords.map(r => r.date?.split('T')[0]))].length}
            </p>
            <p className="text-xs text-green-600">Dias</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <p className="text-lg font-bold text-orange-600">
              {monthRecords.filter(r => r.attendance !== 'absent').length}
            </p>
            <p className="text-xs text-orange-600">Refeições</p>
          </div>
        </div>

        {/* Cards por criança */}
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {childStats.map(child => (
            <div key={child.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{child.name}</p>
                <p className="text-xs text-gray-500">
                  {child.present}/{child.total} dias
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-12 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      child.rate >= ATTENDANCE_THRESHOLDS.GREEN
                        ? 'bg-green-500'
                        : child.rate >= ATTENDANCE_THRESHOLDS.YELLOW
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                    style={{ width: `${child.rate}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'w-10 text-right text-sm font-bold',
                    child.rate >= ATTENDANCE_THRESHOLDS.GREEN
                      ? 'text-green-600'
                      : child.rate >= ATTENDANCE_THRESHOLDS.YELLOW
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  )}
                >
                  {child.rate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-lg bg-teal-50 p-4 text-center">
        <p className="text-sm text-gray-500 tabular-nums">
          {children.length} crianças • {dailyRecords.length} registros
        </p>
        <p className="mt-1 text-xs text-gray-400">Instituto Lumine v3.0</p>
      </div>
      </div>

      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-500')} />
                <h3 className="text-balance font-semibold text-gray-800">Sincronização</h3>
              </div>
              <span className="text-xs text-gray-400">
                {lastSync ? `${formatDate(lastSync)} ${formatTime(lastSync)}` : 'Sem sync'}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Envie e baixe dados da planilha.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button"
                onClick={() => syncWithServer()}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-100 py-2 text-sm font-semibold text-green-700 disabled:opacity-50"
              >
                <Upload size={16} />
                Enviar
              </button>
              <button type="button"
                onClick={downloadFromServer}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-100 py-2 text-sm font-semibold text-cyan-700 disabled:opacity-50"
              >
                <Download size={16} />
                Baixar
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md">
            <h3 className="text-balance font-semibold text-gray-800">Backup Local</h3>
            <p className="mt-2 text-sm text-gray-500">Exporte ou restaure um arquivo JSON.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button"
                onClick={exportJSON}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-100 py-2 text-sm font-semibold text-cyan-800"
              >
                <Download size={16} />
                Exportar
              </button>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-50 py-2 text-sm font-semibold text-gray-700">
                <Upload size={16} />
                Importar
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md">
            <h3 className="text-balance font-semibold text-gray-800">Relatório Mensal</h3>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-cyan-50 p-3">
                <p className="text-lg font-bold text-cyan-700 tabular-nums">{activeChildren.length}</p>
                <p className="text-xs text-cyan-700">Crianças</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-lg font-bold text-green-600 tabular-nums">{monthDays}</p>
                <p className="text-xs text-green-600">Dias</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-lg font-bold text-orange-600 tabular-nums">{monthMeals}</p>
                <p className="text-xs text-orange-600">Refeições</p>
              </div>
            </div>
          </div>
        </div>

        {renderOnboardingCard('rounded-2xl p-5')}

        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-balance font-semibold text-gray-800">Modo revisão</h3>
              <p className="mt-1 text-sm text-gray-500">
                Quando ativo, o app não faz overwrite automático. Use o botão Sync quando estiver pronto.
              </p>
            </div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={reviewMode}
                onChange={e => setReviewMode(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-cyan-700"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50 p-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-balance font-semibold text-rose-700">Segurança</h3>
              <p className="mt-1 text-sm text-rose-600">
                Remove todas as crianças e registros deste dispositivo.
              </p>
            </div>
            <ClearLocalDataDialog
              onConfirm={clearLocalData}
              triggerClassName="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Criança</th>
                <th className="px-4 py-3">Presenças</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Frequência</th>
              </tr>
            </thead>
            <tbody>
              {childStats.map(child => (
                <tr key={child.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{child.name}</td>
                  <td className="px-4 py-3 text-gray-600">{child.present}</td>
                  <td className="px-4 py-3 text-gray-600">{child.total}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-semibold',
                        child.rate >= ATTENDANCE_THRESHOLDS.GREEN
                          ? 'bg-green-100 text-green-700'
                          : child.rate >= ATTENDANCE_THRESHOLDS.YELLOW
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      {child.rate}%
                    </span>
                  </td>
                </tr>
              ))}
              {childStats.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                    <p className="text-pretty">Nenhum dado disponível para este mês.</p>
                    <button type="button"
                      onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                      className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Selecionar outro mês
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl bg-teal-50 p-4 text-center text-sm text-gray-500">
          {children.length} crianças • {dailyRecords.length} registros
          <p className="mt-1 text-xs text-gray-400">Instituto Lumine v3.0</p>
        </div>
      </div>
    </div>
  );
}

export default ConfigView;
