// ============================================
// INSTITUTO LUMINE - SISTEMA DE ACOMPANHAMENTO
// Versão 3.0 - UX/UI Otimizada para Mobile
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, AlertTriangle, RefreshCw } from 'lucide-react';
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
import { DEFAULT_API_URL } from './constants';
import { VIEW_TITLES } from './constants/ui';
import {
  SYNC_BUTTON_THEME_MOBILE,
  SYNC_BUTTON_LABEL_MOBILE,
  SYNC_BUTTON_THEME_DESKTOP,
  SYNC_BUTTON_LABEL_DESKTOP,
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
} from './utils/statusWorkflow';

function getDeviceId() {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  const stored = localStorage.getItem('lumine_device_id');
  if (stored) return stored;
  const generated =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem('lumine_device_id', generated);
  return generated;
}

// ============================================
// CONFIGURAÇÃO
// ============================================
const API_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;
const API_TOKEN = process.env.REACT_APP_API_TOKEN || '';
const APP_VERSION = process.env.REACT_APP_APP_VERSION || '';
const DEVICE_ID = getDeviceId();
const META_HEADERS = {
  ...(DEVICE_ID ? { 'X-Device-Id': DEVICE_ID } : {}),
  ...(APP_VERSION ? { 'X-App-Version': APP_VERSION } : {}),
};
const AUTH_HEADERS = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};
const BASE_HEADERS = { ...AUTH_HEADERS, ...META_HEADERS };
const JSON_HEADERS = { 'Content-Type': 'application/json', ...BASE_HEADERS };

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
  });

  const { addChild, updateChild } = useChildren({
    apiUrl: API_URL,
    jsonHeaders: JSON_HEADERS,
    isOnline,
    normalizeChild,
    setChildren,
    setSelectedChild,
    setPendingChanges,
    setDataRev,
    setLastSync,
  });

  const { addDailyRecord } = useRecords({
    apiUrl: API_URL,
    jsonHeaders: JSON_HEADERS,
    isOnline,
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

  const clearLocalData = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  const stats = getDashboardStats(children, dailyRecords);
  const alerts = getAttendanceAlerts(children, dailyRecords);

  // Títulos das views
  const viewTitle =
    view === 'child-detail'
      ? selectedChild?.name || VIEW_TITLES['child-detail']
      : VIEW_TITLES[view] || 'Lumine';

  const syncStateKey = ['syncing', 'success', 'error'].includes(syncStatus)
    ? syncStatus
    : 'idle';

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
      <header className="sticky top-0 z-30 bg-cyan-700 px-4 py-3 text-white shadow-lg lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(view === 'add-child' || view === 'child-detail') && (
              <button
                onClick={() => setView('children')}
                className="p-1"
                aria-label="Voltar"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-balance text-lg font-bold">{viewTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de Pendências - Mais Proeminente */}
            {pendingChanges > 0 && syncStatus !== 'syncing' && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white animate-pulse">
                <AlertTriangle size={12} />
                {getPendingSyncBadgeMobileLabel(pendingChanges)}
              </div>
            )}

            {/* Status Online/Offline */}
            <div
              className={cn('size-2 rounded-full', getConnectionIndicatorClass(isOnline, 'mobile'))}
            />

            {/* Botão Sync */}
            <button
              onClick={() => syncWithServer()}
              disabled={syncStatus === 'syncing' || overwriteBlocked}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                SYNC_BUTTON_THEME_MOBILE[syncStateKey]
              )}
            >
              <RefreshCw size={14} className={cn(syncStatus === 'syncing' && 'animate-spin')} />
              {SYNC_BUTTON_LABEL_MOBILE[syncStateKey]}
            </button>
          </div>
        </div>

        {/* Última sync - só mostra se tiver */}
        {lastSync && syncStatus === 'idle' && (
          <p className="mt-1 text-xs text-cyan-200">Última sync: {formatTime(lastSync)}</p>
        )}
        {syncStatus === 'error' && syncError && (
          <div className="mt-1 flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-xs',
                syncErrorLevel === 'critical' ? 'text-rose-100 font-semibold' : 'text-amber-100'
              )}
            >
              Sync: {syncError}
            </p>
            {syncErrorLevel === 'critical' && (
              <button
                type="button"
                onClick={clearSyncFeedback}
                className="rounded border border-white/30 px-2 py-0.5 text-[10px] font-semibold text-white/90"
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </header>

      {/* ========== HEADER DESKTOP ========== */}
      <header className="hidden items-center justify-between border-b border-gray-200 bg-white px-8 py-3 lg:flex">
        <div>
          <p className="text-xs uppercase text-gray-400">Instituto Lumine</p>
          <h1 className="text-balance text-lg font-semibold text-gray-900">{viewTitle}</h1>
          <p className="text-xs text-gray-500">
            Última sync:{" "}
            {lastSync ? `${formatDate(lastSync)} às ${formatTime(lastSync)}` : "Nenhuma"}
          </p>
          {syncStatus === 'error' && syncError && (
            <div className="mt-1 flex items-center gap-2">
              <p
                className={cn(
                  'text-pretty text-xs',
                  syncErrorLevel === 'critical' ? 'text-rose-700 font-semibold' : 'text-amber-700'
                )}
              >
                Sync: {syncError}
              </p>
              {syncErrorLevel === 'critical' && (
                <button
                  type="button"
                  onClick={clearSyncFeedback}
                  className="rounded border border-rose-300 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador de Pendências Desktop - Mais Proeminente */}
          {pendingChanges > 0 && syncStatus !== 'syncing' && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-100 border-2 border-amber-500 px-3 py-2 text-sm font-bold text-amber-900 animate-pulse">
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
          <button
            onClick={() => syncWithServer()}
            disabled={syncStatus === "syncing" || overwriteBlocked}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition',
              SYNC_BUTTON_THEME_DESKTOP[syncStateKey]
            )}
          >
            <RefreshCw size={14} className={cn(syncStatus === 'syncing' && 'animate-spin')} />
            {SYNC_BUTTON_LABEL_DESKTOP[syncStateKey]}
          </button>
        </div>
      </header>

      {/* ========== CONTEÚDO ========== */}
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
                getStatusMeta={getStatusMeta}
                parseEnrollmentHistory={parseEnrollmentHistory}
                buildStatusFormData={buildStatusFormData}
                getMissingFieldsForStatus={getMissingFieldsForStatus}
                normalizeImageConsent={normalizeImageConsent}
                participationDays={PARTICIPATION_DAYS}
                enrollmentStatusMeta={ENROLLMENT_STATUS_META}
                formatDate={formatDate}
                calculateAge={calculateAge}
                calculateAttendanceRate={calculateAttendanceRate}
                MOOD_LABELS={MOOD_LABELS}
              />
            </div>
            <div className="hidden lg:block">
              <ChildDetailDesktop
                child={selectedChild}
                dailyRecords={dailyRecords}
                onUpdateChild={updateChild}
                getStatusMeta={getStatusMeta}
                parseEnrollmentHistory={parseEnrollmentHistory}
                buildStatusFormData={buildStatusFormData}
                getMissingFieldsForStatus={getMissingFieldsForStatus}
                normalizeImageConsent={normalizeImageConsent}
                participationDays={PARTICIPATION_DAYS}
                enrollmentStatusMeta={ENROLLMENT_STATUS_META}
                formatDate={formatDate}
                calculateAge={calculateAge}
                calculateAttendanceRate={calculateAttendanceRate}
                MOOD_LABELS={MOOD_LABELS}
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
                isMatriculated={isMatriculated}
                formatDate={formatDate}
              />
            </div>
            <div className="hidden lg:block">
              <DailyRecordDesktop
                children={children}
                dailyRecords={dailyRecords}
                addDailyRecord={addDailyRecord}
                isMatriculated={isMatriculated}
                formatDate={formatDate}
              />
            </div>
          </>
        )}
        {view === 'config' && (
          <ConfigView
            children={children}
            setChildren={setChildren}
            dailyRecords={dailyRecords}
            setDailyRecords={setDailyRecords}
            syncWithServer={syncWithServer}
            downloadFromServer={downloadFromServer}
            lastSync={lastSync}
            isOnline={isOnline}
            overwriteBlocked={overwriteBlocked}
            clearLocalData={clearLocalData}
            reviewMode={reviewMode}
            setReviewMode={setReviewMode}
            onOpenOnboarding={handleOnboardingReopen}
            normalizeChildren={normalizeChildren}
            normalizeRecords={normalizeRecords}
            isMatriculated={isMatriculated}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}
      </main>

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

      <MobileNav view={view} setView={setView} />
    </div>
    </>
  );
}

// ============================================
// ADICIONAR CRIANÇA
// ============================================

export { DailyRecordView, DailyRecordDesktop, ConfigView };
