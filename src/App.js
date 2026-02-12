// ============================================
// INSTITUTO LUMINE - SISTEMA DE ACOMPANHAMENTO
// Versão 3.0 - UX/UI Otimizada para Mobile
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ChevronLeft,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { cn } from './utils/cn';
import {
  getMissingTriageFields,
  getMissingMatriculaFields,
  isTriageDraft,
} from './utils/enrollment';
import { clearOnboardingFlag, getOnboardingFlag, setOnboardingFlag } from './utils/onboarding';
import { buildRecordForm, getRecordFormDefaults, upsertDailyRecord } from './utils/records';
import { ATTENDANCE_THRESHOLDS, DEFAULT_API_URL } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import useSync from './hooks/useSync';
import useChildren from './hooks/useChildren';
import useRecords from './hooks/useRecords';
import RecordsLookupPanel from './components/RecordsLookupPanel';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import FloatingActions from './components/layout/FloatingActions';
import OnboardingModal from './components/dialogs/OnboardingModal';
import SyncConflictDialog from './components/dialogs/SyncConflictDialog';
import ClearLocalDataDialog from './components/dialogs/ClearLocalDataDialog';
import DashboardView from './views/dashboard/DashboardView';
import DashboardDesktop from './views/dashboard/DashboardDesktop';
import ChildrenView from './views/children/ChildrenView';
import ChildrenTable from './views/children/ChildrenTable';
import AddChildView from './views/children/AddChildView';
import ChildDetailView from './views/children/ChildDetailView';
import ChildDetailDesktop from './views/children/ChildDetailDesktop';

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

const ENROLLMENT_STATUS_META = {
  pre_inscrito: { label: 'Pré-inscrito', className: 'bg-blue-50 text-blue-800 font-semibold' },
  em_triagem: { label: 'Em triagem', className: 'bg-amber-100 text-amber-800 font-semibold' },
  aprovado: { label: 'Aprovado', className: 'bg-blue-100 text-blue-800 font-semibold' },
  lista_espera: { label: 'Lista de espera', className: 'bg-orange-200 text-orange-900 font-semibold' },
  matriculado: { label: 'Matriculado', className: 'bg-green-100 text-green-800 font-semibold' },
  recusado: { label: 'Não atendida', className: 'bg-red-100 text-red-800 font-semibold' },
  desistente: { label: 'Desistente', className: 'bg-gray-200 text-gray-700 font-semibold' },
  inativo: { label: 'Inativo', className: 'bg-gray-200 text-gray-700 font-semibold' },
};

const TRIAGE_RESULT_OPTIONS = [
  { value: 'aprovado', label: 'Aprovada para matrícula' },
  { value: 'lista_espera', label: 'Lista de espera' },
  { value: 'recusado', label: 'Não atendida no momento' },
];

const PARTICIPATION_DAYS = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
];

const LEGACY_STATUS_MAP = {
  active: 'matriculado',
  inactive: 'inativo',
};

function getEnrollmentStatus(child) {
  if (!child) return 'matriculado';
  if (child.enrollmentStatus) return child.enrollmentStatus;
  const legacy = child.status ? LEGACY_STATUS_MAP[child.status] : '';
  return legacy || 'matriculado';
}

function getStatusMeta(child) {
  const status = getEnrollmentStatus(child);
  return {
    status,
    ...(ENROLLMENT_STATUS_META[status] || {
      label: 'Sem status',
      className: 'bg-teal-50 text-gray-600',
    }),
  };
}

function isMatriculated(child) {
  return getEnrollmentStatus(child) === 'matriculado';
}

function parseEnrollmentHistory(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseDocumentsReceived(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split('|')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseParticipationDays(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split('|')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  if (value === true || value === false) return value;
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'sim', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'nao', 'não', 'no', '0'].includes(normalized)) return false;
  return false;
}

function normalizeYesNo(value) {
  if (value == null) return '';
  const normalized = String(value).trim().toLowerCase();
  if (['sim', 'yes', 'true', '1'].includes(normalized)) return 'sim';
  if (['nao', 'não', 'no', 'false', '0'].includes(normalized)) return 'nao';
  return normalized;
}

function normalizeImageConsent(value) {
  if (value === true) return 'comunicacao';
  if (value === false || value == null) return '';
  const normalized = String(value).trim().toLowerCase();
  if (['interno', 'internal', 'uso_interno'].includes(normalized)) return 'interno';
  if (['comunicacao', 'communication', 'comunicação'].includes(normalized)) return 'comunicacao';
  if (['nao', 'não', 'no', 'nenhum'].includes(normalized)) return '';
  return normalized;
}

const STATUS_FIELD_LABELS = {
  name: 'Nome completo',
  birthDate: 'Data de nascimento',
  guardianName: 'Nome do responsável',
  guardianPhone: 'Telefone (WhatsApp)',
  neighborhood: 'Bairro/Comunidade',
  school: 'Escola',
  schoolShift: 'Turno escolar',
  referralSource: 'Origem do contato',
  schoolCommuteAlone: 'Vai e volta desacompanhada da escola',
  healthNotes: 'Cuidado de saude informado',
  startDate: 'Data de início',
  participationDays: 'Dias de participação',
  authorizedPickup: 'Pessoas autorizadas a retirar',
  canLeaveAlone: 'Pode sair desacompanhada',
  leaveAloneConsent: 'Autorização de saída desacompanhada',
  leaveAloneConfirmation: 'Confirmação da autorização',
  termsAccepted: 'Termo de Responsabilidade e Consentimento',
};

function buildStatusFormData(child) {
  return {
    name: child?.name || '',
    birthDate: child?.birthDate || '',
    guardianName: child?.guardianName || '',
    guardianPhone: child?.guardianPhone || '',
    neighborhood: child?.neighborhood || '',
    school: child?.school || '',
    schoolShift: child?.schoolShift || '',
    referralSource: child?.referralSource || '',
    schoolCommuteAlone: child?.schoolCommuteAlone || '',
    startDate: child?.startDate || child?.entryDate || '',
    participationDays: parseParticipationDays(child?.participationDays),
    authorizedPickup: child?.authorizedPickup || '',
    canLeaveAlone: child?.canLeaveAlone || '',
    leaveAloneConsent: parseBoolean(child?.leaveAloneConsent),
    leaveAloneConfirmation: child?.leaveAloneConfirmation || '',
    termsAccepted: Boolean(child?.responsibilityTerm || child?.consentTerm),
    classGroup: child?.classGroup || '',
    imageConsent: normalizeImageConsent(child?.imageConsent),
    documentsReceived: parseDocumentsReceived(child?.documentsReceived),
    initialObservations: child?.initialObservations || '',
  };
}

function getMissingFieldsForStatus(status, data) {
  const requiresTriage = ['em_triagem', 'aprovado', 'lista_espera', 'recusado', 'matriculado']
    .includes(status);
  const requiresMatricula = status === 'matriculado';
  const missingKeys = [
    ...(requiresTriage ? getMissingTriageFields(data) : []),
    ...(requiresMatricula ? getMissingMatriculaFields(data) : []),
  ];
  return [...new Set(missingKeys)].map(field => STATUS_FIELD_LABELS[field] || field);
}

function normalizeChild(child) {
  const normalized = { ...child };
  let changed = false;

  const status = getEnrollmentStatus(normalized);
  if (normalized.enrollmentStatus !== status) {
    normalized.enrollmentStatus = status;
    changed = true;
  }

  if (normalized.childId == null) {
    normalized.childId = '';
    changed = true;
  }

  const docs = parseDocumentsReceived(normalized.documentsReceived);
  if (docs !== normalized.documentsReceived) {
    normalized.documentsReceived = docs;
    changed = true;
  }

  const history = parseEnrollmentHistory(normalized.enrollmentHistory);
  if (history !== normalized.enrollmentHistory) {
    normalized.enrollmentHistory = history;
    changed = true;
  }

  if (!normalized.enrollmentHistory.length) {
    const baseDate = normalized.createdAt || new Date().toISOString();
    const notes = normalized.status ? 'Migração do sistema anterior' : 'Cadastro inicial';
    normalized.enrollmentHistory = [{ date: baseDate, action: status, notes }];
    changed = true;
  }

  if (!normalized.enrollmentDate) {
    normalized.enrollmentDate =
      normalized.entryDate || normalized.createdAt || new Date().toISOString();
    changed = true;
  }

  if (status === 'matriculado' && !normalized.matriculationDate) {
    normalized.matriculationDate = normalized.entryDate || normalized.enrollmentDate;
    changed = true;
  }

  if (!normalized.startDate && normalized.entryDate) {
    normalized.startDate = normalized.entryDate;
    changed = true;
  }

  const participationDays = parseParticipationDays(normalized.participationDays);
  if (participationDays !== normalized.participationDays) {
    normalized.participationDays = participationDays;
    changed = true;
  }

  const normalizedImageConsent = normalizeImageConsent(normalized.imageConsent);
  if (normalizedImageConsent !== normalized.imageConsent) {
    normalized.imageConsent = normalizedImageConsent;
    changed = true;
  }

  ['responsibilityTerm', 'consentTerm', 'leaveAloneConsent'].forEach(field => {
    const parsed = parseBoolean(normalized[field]);
    if (parsed !== normalized[field]) {
      normalized[field] = parsed;
      changed = true;
    }
  });

  ['schoolCommuteAlone', 'healthCareNeeded', 'dietaryRestriction', 'canLeaveAlone']
    .forEach(field => {
      const normalizedValue = normalizeYesNo(normalized[field]);
      if (normalizedValue !== normalized[field]) {
        normalized[field] = normalizedValue;
        changed = true;
      }
    });

  if (normalized.leaveAloneConfirmation == null) {
    normalized.leaveAloneConfirmation = '';
    changed = true;
  }

  return { child: normalized, changed };
}

function normalizeChildren(childrenList) {
  if (!Array.isArray(childrenList)) {
    return { children: [], changed: true };
  }
  let changed = false;
  const normalized = childrenList.map(child => {
    const result = normalizeChild(child);
    if (result.changed) changed = true;
    return result.child;
  });
  return { children: normalized, changed };
}


function normalizeRecord(record) {
  const normalized = { ...record };
  let changed = false;
  const internalId = normalized.childInternalId || normalized.childId || '';

  if (normalized.childInternalId !== internalId) {
    normalized.childInternalId = internalId;
    changed = true;
  }

  if (normalized.childId !== internalId) {
    normalized.childId = internalId;
    changed = true;
  }

  return { record: normalized, changed };
}

function normalizeRecords(recordsList) {
  if (!Array.isArray(recordsList)) {
    return { records: [], changed: true };
  }
  let changed = false;
  const normalized = recordsList.map(record => {
    const result = normalizeRecord(record);
    if (result.changed) changed = true;
    return result.record;
  });
  return { records: normalized, changed };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function calculateAge(birthDate) {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateAttendanceRate(records) {
  if (records.length === 0) return 0;
  const present = records.filter(r => r.attendance === 'present' || r.attendance === 'late')
    .length;
  return Math.round((present / records.length) * 100);
}

const moodLabels = {
  happy: '😊 Animada',
  calm: '😌 Tranquila',
  quiet: '🤫 Quieta',
  sad: '😢 Chorosa',
  agitated: '😤 Agitada',
  irritated: '😠 Irritada',
};

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

  // Stats
  const getStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecs = dailyRecords.filter(r => r.date?.split('T')[0] === today);
    const present = todayRecs.filter(
      r => r.attendance === 'present' || r.attendance === 'late'
    ).length;
    const active = children.filter(isMatriculated).length;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthRecs = dailyRecords.filter(r => new Date(r.date) >= thisMonth);
    const meals = monthRecs.filter(
      r => r.attendance === 'present' || r.attendance === 'late'
    ).length;
    return { present, absent: active - present, total: active, meals };
  };

  // Alertas
  const getAlerts = () => {
    const alerts = [];
    const today = new Date();
    const dayKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    children
      .filter(isMatriculated)
      .forEach(child => {
        const participation = parseParticipationDays(child.participationDays);
        if (!participation.length) return;

        let confirmedAbsences = 0;
        let pending = 0;

        for (let offset = 0; offset < 14; offset += 1) {
          const date = new Date(today);
          date.setHours(0, 0, 0, 0);
          date.setDate(today.getDate() - offset);
          const dayKey = dayKeys[date.getDay()];
          if (!participation.includes(dayKey)) continue;

          const dateStr = date.toISOString().split('T')[0];
          const record = dailyRecords.find(
            r => r.childInternalId === child.id && r.date?.split('T')[0] === dateStr
          );

          if (!record) {
            pending += 1;
            continue;
          }

          if (record.attendance === 'absent') {
            confirmedAbsences += 1;
            continue;
          }

          if (record.attendance === 'present' || record.attendance === 'late') {
            break;
          }
        }

        if (confirmedAbsences >= 3) {
          alerts.push({
            childId: child.id,
            childName: child.name,
            msg: '3+ faltas confirmadas seguidas',
            severity: 'strong',
          });
          return;
        }

        if (confirmedAbsences >= 2 && pending >= 1) {
          alerts.push({
            childId: child.id,
            childName: child.name,
            msg: 'Possível sequência de faltas. Verificar registros pendentes dos últimos encontros.',
            severity: 'weak',
          });
        }
      });

    return alerts;
  };

  const stats = getStats();
  const alerts = getAlerts();

  // Títulos das views
  const viewTitles = {
    dashboard: 'Dashboard',
    children: 'Crianças',
    'add-child': 'Nova Criança',
    daily: 'Registro',
    'child-detail': selectedChild?.name || 'Detalhes',
    config: 'Configurações',
  };

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
                onClick={() => setView(view === 'add-child' ? 'children' : 'children')}
                className="p-1"
                aria-label="Voltar"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-balance text-lg font-bold">{viewTitles[view]}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de Pendências - Mais Proeminente */}
            {pendingChanges > 0 && syncStatus !== 'syncing' && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white animate-pulse">
                <AlertTriangle size={12} />
                {pendingChanges} não sync
              </div>
            )}

            {/* Status Online/Offline */}
            <div
              className={cn('size-2 rounded-full', isOnline ? 'bg-green-400' : 'bg-red-400')}
            />

            {/* Botão Sync */}
            <button
              onClick={() => syncWithServer()}
              disabled={syncStatus === 'syncing' || overwriteBlocked}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                syncStatus === 'syncing'
                  ? 'bg-cyan-500'
                  : syncStatus === 'success'
                  ? 'bg-green-500'
                  : syncStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-white/20 hover:bg-white/30'
              )}
            >
              <RefreshCw size={14} className={cn(syncStatus === 'syncing' && 'animate-spin')} />
              {syncStatus === 'syncing'
                ? 'Sync...'
                : syncStatus === 'success'
                ? 'OK!'
                : syncStatus === 'error'
                ? 'Erro'
                : 'Sync'}
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
          <h1 className="text-balance text-lg font-semibold text-gray-900">{viewTitles[view]}</h1>
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
              {pendingChanges} alteração{pendingChanges > 1 ? 'ões' : ''} pendente{pendingChanges > 1 ? 's' : ''}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">
            <span
              className={cn('size-2 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-rose-400')}
            />
            {isOnline ? "Online" : "Offline"}
          </div>
          <button
            onClick={() => syncWithServer()}
            disabled={syncStatus === "syncing" || overwriteBlocked}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition',
              syncStatus === 'syncing'
                ? 'bg-cyan-100 text-cyan-800'
                : syncStatus === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : syncStatus === 'error'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            )}
          >
            <RefreshCw size={14} className={cn(syncStatus === 'syncing' && 'animate-spin')} />
            {syncStatus === "syncing"
              ? "Sincronizando"
              : syncStatus === "success"
              ? "Sincronizado"
              : syncStatus === "error"
              ? "Erro"
              : "Sincronizar"}
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
                moodLabels={moodLabels}
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
                moodLabels={moodLabels}
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
              />
            </div>
            <div className="hidden lg:block">
              <DailyRecordDesktop
                children={children}
                dailyRecords={dailyRecords}
                addDailyRecord={addDailyRecord}
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

function DailyRecordView({ children, dailyRecords, addDailyRecord }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const childrenById = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [step, setStep] = useState('select');
  const [editingRecordId, setEditingRecordId] = useState('');
  const [form, setForm] = useState(getRecordFormDefaults());
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const resetTimerRef = useRef(null);

  const activeChildren = children.filter(isMatriculated);
  const dateRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = dateRecords.map(r => r.childInternalId);
  const pending = activeChildren.filter(c => !recordedIds.includes(c.id));
  const selectedChild =
    children.find(c => c.id === selectedChildId) ||
    activeChildren.find(c => c.id === selectedChildId);

  const clearTimers = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(message => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
      toastTimerRef.current = null;
    }, 1500);
  }, []);

  const clearEditing = () => {
    setEditingRecordId('');
    setSelectedChildId('');
    setStep('select');
    setForm(getRecordFormDefaults());
  };

  useEffect(() => {
    clearEditing();
  }, [date]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleEditRecord = record => {
    setEditingRecordId(record.id);
    setSelectedChildId(record.childInternalId);
    setForm(buildRecordForm(record));
    setStep('details');
  };

  const quickRecord = (childId, attendance) => {
    addDailyRecord({
      childInternalId: childId,
      date,
      attendance,
      participation: 'medium',
      mood: 'neutral',
      interaction: 'medium',
      activity: '',
      performance: 'medium',
      notes: '',
      familyContact: 'no',
      contactReason: '',
    });
    showToast('Registro salvo!');
  };

  const handleDetailedRecord = () => {
    if (!selectedChildId) return;
    const isEditing = Boolean(editingRecordId);
    addDailyRecord({ childInternalId: selectedChildId, date, ...form });
    showToast(isEditing ? 'Registro atualizado!' : 'Registro salvo!');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      clearEditing();
      resetTimerRef.current = null;
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Toast de sucesso */}
      {toastMessage && (
        <div
          className="fixed left-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 5rem)' }}
        >
          <CheckCircle size={20} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Seletor de data */}
      <div className="rounded-lg bg-white p-4 shadow-md">
        <label className="mb-2 block text-sm font-medium text-gray-700">Data do registro</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Status do dia */}
      <div className="flex items-center justify-between rounded-lg bg-cyan-50 p-4">
        <div>
          <p className="text-sm font-medium text-cyan-900">Registros hoje</p>
          <p className="text-2xl font-bold text-cyan-700 tabular-nums">
            {dateRecords.length}/{activeChildren.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-cyan-700 tabular-nums">{pending.length} pendentes</p>
        </div>
      </div>

      <RecordsLookupPanel
        children={children}
        activeChildren={activeChildren}
        dailyRecords={dailyRecords}
        formatDate={formatDate}
      />

      {step === 'select' && (
        <>
          {dateRecords.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-balance font-semibold text-gray-800">Registros do dia</h3>
                <span className="text-xs text-gray-500 tabular-nums">{dateRecords.length} registros</span>
              </div>
              <div className="space-y-2">
                {dateRecords.map(record => {
                  const child = childrenById.get(record.childInternalId);
                  const label = child?.name || 'Criança';
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleEditRecord(record)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left"
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          record.attendance === 'present'
                            ? 'bg-green-500'
                            : record.attendance === 'late'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        )}
                      />
                      <span className="flex-1 truncate text-sm font-medium text-gray-800">{label}</span>
                      <span className="text-xs text-gray-500">
                        {record.attendance === 'present'
                          ? 'Presente'
                          : record.attendance === 'late'
                          ? 'Atrasado'
                          : 'Ausente'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Registro rápido */}
          {pending.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <h3 className="text-balance mb-3 font-semibold text-gray-800">Registro rápido</h3>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {pending.map(child => (
                  <div key={child.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <span className="flex-1 truncate text-sm font-medium">{child.name}</span>
                    <button
                      onClick={() => quickRecord(child.id, 'present')}
                      className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700"
                    >
                      Presente
                    </button>
                    <button
                      onClick={() => quickRecord(child.id, 'absent')}
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700"
                    >
                      Ausente
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registro detalhado */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="text-balance mb-3 font-semibold text-gray-800">Registro detalhado</h3>
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="mb-3 w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Selecione uma criança</option>
              {activeChildren.map(c => (
                <option key={c.id} value={c.id} disabled={recordedIds.includes(c.id)}>
                  {c.name} {recordedIds.includes(c.id) ? '(registrado)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedChildId && setStep('details')}
              disabled={!selectedChildId}
              className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-gray-900 hover:bg-orange-400 disabled:bg-gray-300 disabled:text-gray-500"
            >
              Continuar
            </button>
          </div>
        </>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          {/* Criança selecionada */}
          <div className="flex items-center justify-between rounded-lg bg-cyan-100 p-4">
            <div>
              <p className="text-sm text-cyan-700">Registrando para</p>
              <p className="font-bold text-cyan-900">{selectedChild?.name || 'Criança'}</p>
              {editingRecordId && (
                <span className="mt-1 inline-flex rounded-full bg-cyan-200 px-2 py-0.5 text-xs font-semibold text-cyan-800">
                  Editando registro
                </span>
              )}
            </div>
            <button
              onClick={() => {
                if (editingRecordId) {
                  clearEditing();
                } else {
                  setStep('select');
                }
              }}
              className="text-cyan-700"
              aria-label="Voltar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Bloco 1: Presença */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h4 className="text-balance mb-3 font-medium text-gray-800">Presença</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'present', label: 'Presente', color: 'green' },
                { value: 'late', label: 'Atrasado', color: 'yellow' },
                { value: 'absent', label: 'Ausente', color: 'red' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, attendance: opt.value })}
                  className={cn(
                    'rounded-lg py-3 text-sm font-medium transition-all',
                    form.attendance === opt.value
                      ? opt.color === 'green'
                        ? 'bg-green-500 text-white'
                        : opt.color === 'yellow'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-teal-50 text-gray-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bloco 2: Detalhes (só se presente/atrasado) */}
          {form.attendance !== 'absent' && (
            <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
              <h4 className="text-balance font-medium text-gray-800">Detalhes</h4>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Humor</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'happy', label: '😊' },
                    { value: 'neutral', label: '😐' },
                    { value: 'sad', label: '😢' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, mood: opt.value })}
                      className={cn(
                        'rounded-lg py-3 text-2xl transition-all',
                        form.mood === opt.value
                          ? 'bg-cyan-100 ring-2 ring-cyan-500'
                          : 'bg-teal-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Participação</label>
                <select
                  value={form.participation}
                  onChange={e => setForm({ ...form, participation: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Interação</label>
                <select
                  value={form.interaction}
                  onChange={e => setForm({ ...form, interaction: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Atividade</label>
                <input
                  value={form.activity}
                  onChange={e => setForm({ ...form, activity: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                  placeholder="Ex: Leitura, Arte, Jogo..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Desempenho</label>
                <select
                  value={form.performance}
                  onChange={e => setForm({ ...form, performance: e.target.value })}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
            </div>
          )}

          {/* Bloco 3: Observações */}
          <div className="space-y-4 rounded-lg bg-white p-4 shadow-md">
            <h4 className="text-balance font-medium text-gray-800">Observações</h4>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Algo importante..."
              className="w-full rounded-lg border px-4 py-3"
            />

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.familyContact === 'yes'}
                  onChange={e =>
                    setForm({ ...form, familyContact: e.target.checked ? 'yes' : 'no' })
                  }
                  className="h-5 w-5 rounded"
                />
                <span className="text-sm">Houve contato com a família</span>
              </label>
            </div>

            {form.familyContact === 'yes' && (
              <select
                value={form.contactReason}
                onChange={e => setForm({ ...form, contactReason: e.target.value })}
                className="w-full rounded-lg border px-4 py-3"
              >
                <option value="">Motivo do contato</option>
                <option value="routine">Rotina</option>
                <option value="praise">Elogio</option>
                <option value="behavior">Comportamento</option>
                <option value="absence">Ausência</option>
                <option value="other">Outro</option>
              </select>
            )}
          </div>

          {/* Botão salvar */}
          <button
            onClick={handleDetailedRecord}
            className="w-full rounded-lg bg-green-600 py-4 font-semibold text-white shadow-lg"
          >
            {editingRecordId ? 'Atualizar registro' : 'Salvar Registro'}
          </button>
        </div>
      )}
    </div>
  );
}

function DailyRecordDesktop({ children, dailyRecords, addDailyRecord }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const childrenById = useMemo(() => new Map(children.map(child => [child.id, child])), [children]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [editingRecordId, setEditingRecordId] = useState('');
  const [form, setForm] = useState(getRecordFormDefaults());
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const resetTimerRef = useRef(null);

  const activeChildren = children.filter(isMatriculated);
  const dateRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = dateRecords.map(r => r.childInternalId);
  const pending = activeChildren.filter(c => !recordedIds.includes(c.id));
  const selectedChild =
    children.find(c => c.id === selectedChildId) ||
    activeChildren.find(c => c.id === selectedChildId);

  const clearTimers = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(message => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
      toastTimerRef.current = null;
    }, 1200);
  }, []);

  const clearEditing = () => {
    setEditingRecordId('');
    setSelectedChildId('');
    setForm(getRecordFormDefaults());
  };

  useEffect(() => {
    clearEditing();
  }, [date]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleEditRecord = record => {
    setEditingRecordId(record.id);
    setSelectedChildId(record.childInternalId);
    setForm(buildRecordForm(record));
  };

  const quickRecord = (childId, attendance) => {
    addDailyRecord({
      childInternalId: childId,
      date,
      attendance,
      participation: 'medium',
      mood: 'neutral',
      interaction: 'medium',
      activity: '',
      performance: 'medium',
      notes: '',
      familyContact: 'no',
      contactReason: '',
    });
    showToast('Registro salvo!');
  };

  const handleDetailedRecord = () => {
    if (!selectedChildId) return;
    const isEditing = Boolean(editingRecordId);
    addDailyRecord({ childInternalId: selectedChildId, date, ...form });
    showToast(isEditing ? 'Registro atualizado!' : 'Registro salvo!');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      clearEditing();
      resetTimerRef.current = null;
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div
          className="fixed right-10 z-50 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 6rem)' }}
        >
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-md">
        <div>
          <p className="text-balance text-xs uppercase text-gray-400">Registro diário</p>
          <p className="text-sm text-gray-600 tabular-nums">
            {dateRecords.length}/{activeChildren.length} registrados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500">Data</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <RecordsLookupPanel
        children={children}
        activeChildren={activeChildren}
        dailyRecords={dailyRecords}
        formatDate={formatDate}
      />

      <div className="grid grid-cols-[minmax(0,360px)_1fr] gap-6">
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-balance font-semibold text-gray-800">Pendentes</h3>
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-gray-500 tabular-nums">
              {pending.length} pendentes
            </span>
          </div>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-auto">
            {pending.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                <p className="text-pretty">Nenhuma pendência para esta data.</p>
                <button
                  onClick={() => setSelectedChildId('')}
                  className="mt-3 w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Registrar agora
                </button>
              </div>
            )}
            {pending.map(child => (
              <div
                key={child.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2',
                  selectedChildId === child.id ? 'border-cyan-200 bg-cyan-50' : 'border-gray-100'
                )}
              >
                <button
                  onClick={() => setSelectedChildId(child.id)}
                  className="flex-1 text-left text-sm font-medium text-gray-800"
                >
                  {child.name}
                </button>
                <button
                  onClick={() => quickRecord(child.id, 'present')}
                  className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                >
                  Presente
                </button>
                <button
                  onClick={() => quickRecord(child.id, 'absent')}
                  className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                >
                  Ausente
                </button>
              </div>
            ))}
          </div>

          {dateRecords.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-balance text-sm font-semibold text-gray-800">Registros do dia</h4>
                <span className="text-xs text-gray-500 tabular-nums">{dateRecords.length} registros</span>
              </div>
              <div className="max-h-[260px] space-y-2 overflow-auto">
                {dateRecords.map(record => {
                  const child = childrenById.get(record.childInternalId);
                  const label = child?.name || 'Criança';
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleEditRecord(record)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left"
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          record.attendance === 'present'
                            ? 'bg-green-500'
                            : record.attendance === 'late'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        )}
                      />
                      <span className="flex-1 truncate text-sm font-medium text-gray-800">{label}</span>
                      <span className="text-xs text-gray-500">
                        {record.attendance === 'present'
                          ? 'Presente'
                          : record.attendance === 'late'
                          ? 'Atrasado'
                          : 'Ausente'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-balance text-xs uppercase text-gray-400">Detalhes</p>
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedChild ? selectedChild.name : 'Selecione uma criança'}
              </h3>
              {editingRecordId && (
                <span className="mt-1 inline-flex rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                  Editando registro
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {editingRecordId && (
                <button
                  type="button"
                  onClick={clearEditing}
                  className="text-xs font-semibold text-cyan-700"
                >
                  Cancelar edição
                </button>
              )}
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Selecionar</option>
                {activeChildren.map(child => (
                  <option key={child.id} value={child.id} disabled={recordedIds.includes(child.id)}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="text-balance text-xs font-semibold text-gray-500">Presença</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { value: 'present', label: 'Presente', color: 'green' },
                  { value: 'late', label: 'Atrasado', color: 'yellow' },
                  { value: 'absent', label: 'Ausente', color: 'red' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setForm({ ...form, attendance: option.value })}
                    className={cn(
                      'rounded-lg py-2 text-xs font-semibold',
                      form.attendance === option.value
                        ? option.color === 'green'
                          ? 'bg-green-500 text-white'
                          : option.color === 'yellow'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-teal-50 text-gray-600'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {form.attendance !== 'absent' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Humor</label>
                  <select
                    value={form.mood}
                    onChange={e => setForm({ ...form, mood: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="happy">Feliz</option>
                    <option value="neutral">Ok</option>
                    <option value="sad">Triste</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Participação</label>
                  <select
                    value={form.participation}
                    onChange={e => setForm({ ...form, participation: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Interação</label>
                  <select
                    value={form.interaction}
                    onChange={e => setForm({ ...form, interaction: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Desempenho</label>
                  <select
                    value={form.performance}
                    onChange={e => setForm({ ...form, performance: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500">Atividade</label>
                  <input
                    value={form.activity}
                    onChange={e => setForm({ ...form, activity: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Ex: Leitura, Arte, Jogo..."
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Algo importante..."
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.familyContact === 'yes'}
                  onChange={e =>
                    setForm({ ...form, familyContact: e.target.checked ? 'yes' : 'no' })
                  }
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-gray-700">Houve contato com a família</span>
              </div>
              {form.familyContact === 'yes' && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500">Motivo do contato</label>
                  <select
                    value={form.contactReason}
                    onChange={e => setForm({ ...form, contactReason: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Selecione</option>
                    <option value="routine">Rotina</option>
                    <option value="praise">Elogio</option>
                    <option value="behavior">Comportamento</option>
                    <option value="absence">Ausência</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleDetailedRecord}
              disabled={!selectedChildId}
              className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-gray-900 hover:bg-orange-400 disabled:bg-gray-300 disabled:text-gray-500"
            >
              {editingRecordId ? 'Atualizar registro' : 'Salvar registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONFIGURAÇÕES
// ============================================
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
      <button
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
                <button className="flex-1 rounded-lg bg-teal-50 py-3 font-medium">
                  Cancelar
                </button>
              </Dialog.Close>
              <button
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
          <button
            onClick={() => syncWithServer()}
            disabled={!isOnline || overwriteBlocked}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-100 py-3 font-medium text-green-700 disabled:opacity-50"
          >
            <Upload size={18} />
            Enviar
          </button>
          <button
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
          <button
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
              <button
                onClick={() => syncWithServer()}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-100 py-2 text-sm font-semibold text-green-700 disabled:opacity-50"
              >
                <Upload size={16} />
                Enviar
              </button>
              <button
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
              <button
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
                          ? 'bg-yellow-100 text-yellow-700'
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
                    <button
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

export { DailyRecordView, DailyRecordDesktop, ConfigView };