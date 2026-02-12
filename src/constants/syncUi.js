export const SYNC_BUTTON_THEME_MOBILE = {
  syncing: 'bg-cyan-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
  idle: 'bg-white/20 hover:bg-white/30',
};

export const SYNC_BUTTON_LABEL_MOBILE = {
  syncing: 'Sync...',
  success: 'OK!',
  error: 'Erro',
  idle: 'Sync',
};

export const SYNC_BUTTON_THEME_DESKTOP = {
  syncing: 'bg-cyan-100 text-cyan-800',
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-rose-100 text-rose-700',
  idle: 'bg-gray-900 text-white hover:bg-gray-800',
};

export const SYNC_BUTTON_LABEL_DESKTOP = {
  syncing: 'Sincronizando',
  success: 'Sincronizado',
  error: 'Erro',
  idle: 'Sincronizar',
};

export function getPendingChangesLabel(pendingChanges) {
  return `${pendingChanges} alteração${pendingChanges > 1 ? 'ões' : ''} pendente${pendingChanges > 1 ? 's' : ''}`;
}
