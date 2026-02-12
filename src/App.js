// ============================================
// INSTITUTO LUMINE - SISTEMA DE ACOMPANHAMENTO
// Versão 3.0 - UX/UI Otimizada para Mobile
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ChevronLeft,
  Download,
  Upload,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn } from './utils/cn';
import {
  getMissingTriageFields,
  getMissingMatriculaFields,
  isTriageDraft,
} from './utils/enrollment';
import { clearOnboardingFlag, getOnboardingFlag, setOnboardingFlag } from './utils/onboarding';
import { upsertDailyRecord } from './utils/records';
import { ATTENDANCE_THRESHOLDS, DEFAULT_API_URL } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import useSync from './hooks/useSync';
import useChildren from './hooks/useChildren';
import useRecords from './hooks/useRecords';
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
import DailyRecordView from './views/records/DailyRecordView';
import DailyRecordDesktop from './views/records/DailyRecordDesktop';

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
