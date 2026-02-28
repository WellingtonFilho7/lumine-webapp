// ============================================
// INSTITUTO LUMINE - SISTEMA DE ACOMPANHAMENTO
// Versão 3.0 - UX/UI Otimizada para Mobile
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { cn } from './utils/cn';
import { isTriageDraft } from './utils/enrollment';
import { clearOnboardingFlag, getOnboardingFlag, setOnboardingFlag } from './utils/onboarding';
import {
  getEnrollmentStatus,
  isMatriculated,
  parseEnrollmentHistory,
  normalizeImageConsent,
  normalizeChild,
  normalizeChildren,
  normalizeRecords,
} from './utils/childData';
import {
  calculateAge,
  formatDate,
  formatTime,
  calculateAttendanceRate,
} from './utils/dateFormat';
import { upsertDailyRecord } from './utils/records';
import { getDashboardStats, getAttendanceAlerts } from './utils/dashboardMetrics';
import { getOrCreateDeviceId } from './utils/device';
import { buildApiHeaders } from './utils/apiHeaders';
import { DEFAULT_API_URL, MOBILE_UI_V2_ENABLED, ONLINE_ONLY_MODE, SHOW_LEGACY_SYNC_UI } from './constants';
import { VIEW_TITLES, UI_TEXT } from './constants/ui';
import {
  getSyncStateKey,
  isSyncActionDisabled,
  shouldShowPendingSyncBadge,
  getPendingChangesLabel,
  getPendingSyncBadgeMobileLabel,
  getConnectionIndicatorClass,
  getConnectionLabel,
} from './constants/syncUi';
import {
  ENROLLMENT_STATUS_META,
  TRIAGE_RESULT_OPTIONS,
  PARTICIPATION_DAYS,
  STATUS_FIELD_LABELS,
  MOOD_LABELS,
  WEEKDAY_KEYS,
} from './constants/enrollment';
import useLocalStorage from './hooks/useLocalStorage';
import useSync from './hooks/useSync';
import useChildren from './hooks/useChildren';
import useRecords from './hooks/useRecords';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import FloatingActions from './components/layout/FloatingActions';
import OnboardingModal from './components/dialogs/OnboardingModal';
import SyncConflictDialog from './components/dialogs/SyncConflictDialog';
import SyncErrorNotice from './components/ui/SyncErrorNotice';
import SyncActionButton from './components/ui/SyncActionButton';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardView from './views/dashboard/DashboardView';
import DashboardDesktop from './views/dashboard/DashboardDesktop';
import ChildrenView from './views/children/ChildrenView';
import ChildrenTable from './views/children/ChildrenTable';
import AddChildView from './views/children/AddChildView';
import ChildDetailView from './views/children/ChildDetailView';
import ChildDetailDesktop from './views/children/ChildDetailDesktop';
import DailyRecordView from './views/records/DailyRecordView';
import DailyRecordDesktop from './views/records/DailyRecordDesktop';
import ConfigView from './views/config/ConfigView';
import {
  getStatusMeta,
  buildStatusFormData,
  getMissingFieldsForStatus,
  isStatusTransitionAllowed,
} from './utils/statusWorkflow';

// ============================================
// CONFIGURAÇÃO
// ============================================
const API_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;
const API_TOKEN = process.env.REACT_APP_API_TOKEN || '';
const APP_VERSION = process.env.REACT_APP_APP_VERSION || '';
const DEVICE_ID = getOrCreateDeviceId();
const { baseHeaders: BASE_HEADERS, jsonHeaders: JSON_HEADERS } = buildApiHeaders({
  apiToken: API_TOKEN,
  appVersion: APP_VERSION,
  deviceId: DEVICE_ID,
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function LumineTracker() {
  const [view, setView] = useState('dashboard');
  const [children, setChildren] = useLocalStorage('lumine_children', []);
  const [dailyRecords, setDailyRecords] = useLocalStorage('lumine_records', []);
  const [selectedChild, setSelectedChild] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSync, setLastSync] = useLocalStorage('lumine_last_sync', null);
  const [dataRev, setDataRev] = useLocalStorage('lumine_data_rev', 0);
  const [reviewMode, setReviewMode] = useLocalStorage('lumine_review_mode', false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => !getOnboardingFlag());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [showFABMenu, setShowFABMenu] = useState(false);

  const {
    syncStatus,
    syncError,
    syncErrorLevel,
    overwriteBlocked,
    syncModal,
    setSyncModal,
    clearSyncFeedback,
    syncWithServer,
    downloadFromServer,
  } = useSync({
    apiUrl: API_URL,
    baseHeaders: BASE_HEADERS,
    jsonHeaders: JSON_HEADERS,
    children,
    dailyRecords,
    isOnline,
    dataRev,
    setDataRev,
    setLastSync,
    setChildren,
    setDailyRecords,
    normalizeChildren,
    normalizeRecords,
    pendingChanges,
    setPendingChanges,
    reviewMode,
    onlineOnly: ONLINE_ONLY_MODE,
    autoDownloadOnIdle: true,
  });

  const { addChild, deleteChild, updateChild } = useChildren({
    apiUrl: API_URL,
    jsonHeaders: JSON_HEADERS,
    isOnline,
    onlineOnly: ONLINE_ONLY_MODE,
    children,
    dailyRecords,
    syncWithServer,
    normalizeChild,
    setChildren,
    setDailyRecords,
    setSelectedChild,
    setPendingChanges,
    setDataRev,
    setLastSync,
  });

  const { addDailyRecord } = useRecords({
    apiUrl: API_URL,
    jsonHeaders: JSON_HEADERS,
    isOnline,
    onlineOnly: ONLINE_ONLY_MODE,
    reviewMode,
    children,
    dailyRecords,
    setDailyRecords,
    setPendingChanges,
    setDataRev,
    setLastSync,
    syncWithServer,
    upsertDailyRecord,
  });

  const handleOnboardingDone = useCallback(() => {
    setOnboardingFlag(true);
    setOnboardingOpen(false);
  }, []);

  const handleOnboardingLater = useCallback(() => {
    setOnboardingOpen(false);
  }, []);

  const handleOnboardingReopen = useCallback(() => {
    clearOnboardingFlag();
    setOnboardingOpen(true);
  }, []);

  const handleDeleteChild = useCallback(
    async childId => {
      const ok = await deleteChild(childId);
      setSelectedChild(null);
      setView('children');
      return ok;
    },
    [deleteChild, setSelectedChild, setView]
  );

  // Monitor de conexão
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    const { children: normalized, changed } = normalizeChildren(children);
    if (changed) setChildren(normalized);
  }, [children, setChildren]);

  useEffect(() => {
    const { records: normalized, changed } = normalizeRecords(dailyRecords);
    if (changed) setDailyRecords(normalized);
  }, [dailyRecords, setDailyRecords]);

  const refreshFromServer = useCallback(async () => {
    if (!ONLINE_ONLY_MODE || !isOnline) return;
    if (pendingChanges > 0 || syncStatus === 'syncing') return;
    await downloadFromServer({ silent: true });
  }, [isOnline, pendingChanges, syncStatus, downloadFromServer]);

  useEffect(() => {
    if (!ONLINE_ONLY_MODE || !isOnline) return;
    refreshFromServer();
  }, [isOnline, refreshFromServer]);

  useEffect(() => {
    if (!ONLINE_ONLY_MODE) return undefined;

    const handleFocus = () => {
      refreshFromServer();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromServer();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(() => {
      refreshFromServer();
    }, 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [refreshFromServer]);

  const clearLocalData = useCallback(async () => {
    setChildren([]);
    setDailyRecords([]);
    setDataRev(0);
    setLastSync(null);
    setPendingChanges(0);
    setSelectedChild(null);
    setSearchTerm('');

    if (isOnline) {
      await downloadFromServer({ silent: true });
    }
  }, [
    isOnline,
    downloadFromServer,
    setChildren,
    setDailyRecords,
    setDataRev,
    setLastSync,
    setPendingChanges,
    setSelectedChild,
    setSearchTerm,
  ]);

  const stats = getDashboardStats(children, dailyRecords);
  const alerts = getAttendanceAlerts(children, dailyRecords);

  const todayKey = new Date().toISOString().split('T')[0];
  const activeChildren = children.filter(isMatriculated);
  const todayWeekdayKey = WEEKDAY_KEYS[new Date(`${todayKey}T12:00:00`).getDay()];
  const expectedTodayChildren = activeChildren.filter(child => {
    const days = Array.isArray(child.participationDays) ? child.participationDays : [];
    return days.length === 0 || days.includes(todayWeekdayKey);
  });
  const todayRecordedIds = new Set(
    dailyRecords
      .filter(record => record.date?.split('T')[0] === todayKey)
      .map(record => record.childInternalId)
  );
  const pendingDailyCount = expectedTodayChildren.filter(child => !todayRecordedIds.has(child.id)).length;

  // Títulos das views
  const viewTitle =
    view === 'child-detail'
      ? selectedChild?.name || VIEW_TITLES['child-detail']
      : VIEW_TITLES[view] || 'Lumine';

  const syncStateKey = getSyncStateKey(syncStatus);
  const showLegacySyncUi = !ONLINE_ONLY_MODE || SHOW_LEGACY_SYNC_UI;
  const showPendingSyncBadge =
    showLegacySyncUi && shouldShowPendingSyncBadge(pendingChanges, syncStatus);
  const syncActionDisabled = isSyncActionDisabled(syncStatus, overwriteBlocked);
  const isSyncing = syncStateKey === 'syncing';

  return (
    <>
      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onLater={handleOnboardingLater}
        onDone={handleOnboardingDone}
      />

    <div className="min-h-dvh bg-teal-50 pb-20 lg:flex lg:h-dvh lg:overflow-hidden lg:pb-0">
      <Sidebar view={view} setView={setView} lastSyncLabel={lastSync ? `${formatDate(lastSync)} ${formatTime(lastSync)}` : ""} isOnline={isOnline} />
      <div className="flex-1 lg:flex lg:flex-col lg:overflow-hidden">
      {/* ========== HEADER COMPACTO ========== */}
      <header className={cn('sticky top-0 z-30 bg-cyan-700 px-4 text-white shadow-lg lg:hidden', MOBILE_UI_V2_ENABLED ? 'py-2' : 'py-3')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(view === 'add-child' || view === 'child-detail') && (
              <button type="button"
                onClick={() => setView('children')}
                className="p-1"
                aria-label={UI_TEXT.backAriaLabel}
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-balance text-lg font-bold">{viewTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de Pendências - Mais Proeminente */}
            {showPendingSyncBadge && (
              <div role="status" aria-live="polite" className="flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white animate-pulse">
                <AlertTriangle size={12} />
                {getPendingSyncBadgeMobileLabel(pendingChanges)}
              </div>
            )}

            {/* Status Online/Offline */}
            <div
              className={cn('size-2 rounded-full', getConnectionIndicatorClass(isOnline, 'mobile'))}
            />

            {/* Botão Sync */}
            {showLegacySyncUi && (
              <SyncActionButton
                variant="mobile"
                syncStateKey={syncStateKey}
                isSyncing={isSyncing}
                disabled={syncActionDisabled}
                onSync={() => syncWithServer()}
              />
            )}
          </div>
        </div>
        <SyncErrorNotice
          syncStatus={syncStatus}
          syncError={syncError}
          syncErrorLevel={syncErrorLevel}
          onClear={clearSyncFeedback}
          variant="mobile"
        />
      </header>

      {/* ========== HEADER DESKTOP ========== */}
      <header className="hidden items-center justify-between border-b border-gray-200 bg-white px-8 py-3 lg:flex">
        <div>
          <p className="text-xs uppercase text-gray-400">{UI_TEXT.instituteLabel}</p>
          <h1 className="text-balance text-lg font-semibold text-gray-900">{viewTitle}</h1>
          <p className="text-xs text-gray-500">
            {UI_TEXT.lastSyncLabel}:{" "}
            {lastSync ? `${formatDate(lastSync)} às ${formatTime(lastSync)}` : UI_TEXT.noSyncLabel}
          </p>
          <SyncErrorNotice
            syncStatus={syncStatus}
            syncError={syncError}
            syncErrorLevel={syncErrorLevel}
            onClear={clearSyncFeedback}
            variant="desktop"
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador de Pendências Desktop - Mais Proeminente */}
          {showPendingSyncBadge && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg bg-amber-100 border-2 border-amber-500 px-3 py-2 text-sm font-bold text-amber-900 animate-pulse">
              <AlertTriangle size={16} />
              {getPendingChangesLabel(pendingChanges)}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">
            <span
              className={cn('size-2 rounded-full', getConnectionIndicatorClass(isOnline, 'desktop'))}
            />
            {getConnectionLabel(isOnline)}
          </div>
          {showLegacySyncUi && (
            <SyncActionButton
              variant="desktop"
              syncStateKey={syncStateKey}
              isSyncing={isSyncing}
              disabled={syncActionDisabled}
              onSync={() => syncWithServer()}
            />
          )}
        </div>
      </header>

      {/* ========== CONTEÚDO ========== */}
      <ErrorBoundary>
      <main className="px-4 py-4 lg:flex-1 lg:overflow-auto lg:px-8 lg:py-6">
        {view === 'dashboard' && (
          <>
            <div className="lg:hidden">
              <DashboardView
                stats={stats}
                alerts={alerts}
                children={children}
                dailyRecords={dailyRecords}
                setSelectedChild={setSelectedChild}
                setView={setView}
                isMatriculated={isMatriculated}
              />
            </div>
            <div className="hidden lg:block">
              <DashboardDesktop
                stats={stats}
                alerts={alerts}
                children={children}
                dailyRecords={dailyRecords}
                setSelectedChild={setSelectedChild}
                setView={setView}
                isMatriculated={isMatriculated}
                formatDate={formatDate}
              />
            </div>
          </>
        )}
        {view === 'children' && (
          <>
            <div className="lg:hidden">
              <ChildrenView
                children={children}
                setSelectedChild={setSelectedChild}
                setView={setView}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isTriageDraft={isTriageDraft}
                getEnrollmentStatus={getEnrollmentStatus}
                getStatusMeta={getStatusMeta}
                calculateAge={calculateAge}
              />
            </div>
            <div className="hidden lg:block">
              <ChildrenTable
                children={children}
                setSelectedChild={setSelectedChild}
                setView={setView}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isTriageDraft={isTriageDraft}
                getEnrollmentStatus={getEnrollmentStatus}
                getStatusMeta={getStatusMeta}
                calculateAge={calculateAge}
              />
            </div>
          </>
        )}
        {view === 'add-child' && (
          <div className="mx-auto w-full lg:max-w-3xl">
            <AddChildView
              addChild={addChild}
              setView={setView}
              isOnline={isOnline}
              onlineOnly={ONLINE_ONLY_MODE}
              triageResultOptions={TRIAGE_RESULT_OPTIONS}
              participationDays={PARTICIPATION_DAYS}
              statusFieldLabels={STATUS_FIELD_LABELS}
            />
          </div>
        )}
        {view === 'child-detail' && selectedChild && (
          <>
            <div className="lg:hidden">
              <ChildDetailView
                child={selectedChild}
                dailyRecords={dailyRecords}
                onUpdateChild={updateChild}
                isOnline={isOnline}
                onlineOnly={ONLINE_ONLY_MODE}
                onDeleteChild={handleDeleteChild}
                getStatusMeta={getStatusMeta}
                parseEnrollmentHistory={parseEnrollmentHistory}
                buildStatusFormData={buildStatusFormData}
                getMissingFieldsForStatus={getMissingFieldsForStatus}
                isStatusTransitionAllowed={isStatusTransitionAllowed}
                normalizeImageConsent={normalizeImageConsent}
                participationDays={PARTICIPATION_DAYS}
                enrollmentStatusMeta={ENROLLMENT_STATUS_META}
                formatDate={formatDate}
                calculateAge={calculateAge}
                calculateAttendanceRate={calculateAttendanceRate}
                moodLabels={MOOD_LABELS}
              />
            </div>
            <div className="hidden lg:block">
              <ChildDetailDesktop
                child={selectedChild}
                dailyRecords={dailyRecords}
                onUpdateChild={updateChild}
                isOnline={isOnline}
                onlineOnly={ONLINE_ONLY_MODE}
                onDeleteChild={handleDeleteChild}
                getStatusMeta={getStatusMeta}
                parseEnrollmentHistory={parseEnrollmentHistory}
                buildStatusFormData={buildStatusFormData}
                getMissingFieldsForStatus={getMissingFieldsForStatus}
                isStatusTransitionAllowed={isStatusTransitionAllowed}
                normalizeImageConsent={normalizeImageConsent}
                participationDays={PARTICIPATION_DAYS}
                enrollmentStatusMeta={ENROLLMENT_STATUS_META}
                formatDate={formatDate}
                calculateAge={calculateAge}
                calculateAttendanceRate={calculateAttendanceRate}
                moodLabels={MOOD_LABELS}
              />
            </div>
          </>
        )}
        {view === 'daily' && (
          <>
            <div className="lg:hidden">
              <DailyRecordView
                children={children}
                dailyRecords={dailyRecords}
                addDailyRecord={addDailyRecord}
                isOnline={isOnline}
                onlineOnly={ONLINE_ONLY_MODE}
                isMatriculated={isMatriculated}
                formatDate={formatDate}
              />
            </div>
            <div className="hidden lg:block">
              <DailyRecordDesktop
                children={children}
                dailyRecords={dailyRecords}
                addDailyRecord={addDailyRecord}
                isOnline={isOnline}
                onlineOnly={ONLINE_ONLY_MODE}
                isMatriculated={isMatriculated}
                formatDate={formatDate}
              />
            </div>
          </>
        )}
        {view === 'config' && (
          <ConfigView
            children={children}
            dailyRecords={dailyRecords}
            syncWithServer={syncWithServer}
            downloadFromServer={downloadFromServer}
            lastSync={lastSync}
            isOnline={isOnline}
            overwriteBlocked={overwriteBlocked}
            clearLocalData={clearLocalData}
            reviewMode={reviewMode}
            setReviewMode={setReviewMode}
            onlineOnly={ONLINE_ONLY_MODE}
            showLegacySyncUi={showLegacySyncUi}
            onOpenOnboarding={handleOnboardingReopen}
            isMatriculated={isMatriculated}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}
      </main>
      </ErrorBoundary>

      <SyncConflictDialog
        syncModal={syncModal}
        setSyncModal={setSyncModal}
        downloadFromServer={downloadFromServer}
      />
    </div>

      <FloatingActions
        view={view}
        setView={setView}
        showFABMenu={showFABMenu}
        setShowFABMenu={setShowFABMenu}
      />

      <MobileNav view={view} setView={setView} pendingDailyCount={pendingDailyCount} />
    </div>
    </>
  );
}

// ============================================
// ADICIONAR CRIANÇA
// ============================================

export { DailyRecordView, DailyRecordDesktop, ConfigView };
