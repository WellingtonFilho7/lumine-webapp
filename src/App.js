// ============================================
// INSTITUTO LUMINE - SISTEMA DE ACOMPANHAMENTO
// Versão 3.0 - UX/UI Otimizada para Mobile
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Calendar,
  Users,
  Settings,
  Plus,
  ChevronLeft,
  Search,
  Download,
  Upload,
  AlertTriangle,
  Home,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  ChevronRight,
  User,
  Phone,
  School,
  Clock,
} from 'lucide-react';
import { cn } from './utils/cn';
import {
  TRIAGE_REQUIRED_FIELDS,
  MATRICULA_REQUIRED_FIELDS,
  getMissingTriageFields,
  getMissingMatriculaFields,
  isTriageComplete,
  isMatriculaComplete,
  isTriageDraft,
  buildChecklist,
} from './utils/enrollment';
import { clearOnboardingFlag, getOnboardingFlag, setOnboardingFlag } from './utils/onboarding';
import { buildRecordForm, getRecordFormDefaults, upsertDailyRecord } from './utils/records';

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
const API_URL = 'https://lumine-api-7qnj.vercel.app/api/sync';
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
  pre_inscrito: { label: 'Pré-inscrito', className: 'bg-gray-100 text-gray-600' },
  em_triagem: { label: 'Em triagem', className: 'bg-yellow-100 text-yellow-700' },
  aprovado: { label: 'Aprovado', className: 'bg-blue-100 text-blue-700' },
  lista_espera: { label: 'Lista de espera', className: 'bg-orange-100 text-orange-700' },
  matriculado: { label: 'Matriculado', className: 'bg-emerald-100 text-emerald-700' },
  recusado: { label: 'Não atendida', className: 'bg-rose-100 text-rose-700' },
  desistente: { label: 'Desistente', className: 'bg-gray-100 text-gray-600' },
  inativo: { label: 'Inativo', className: 'bg-gray-100 text-gray-600' },
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
      className: 'bg-gray-100 text-gray-600',
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

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setValue = value => {
    try {
      setStoredValue(prevValue => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (e) {
      console.error('Erro:', e);
    }
  };
  return [storedValue, setValue];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function LumineTracker() {
  const [view, setView] = useState('dashboard');
  const [children, setChildren] = useLocalStorage('lumine_children', []);
  const [dailyRecords, setDailyRecords] = useLocalStorage('lumine_records', []);
  const [selectedChild, setSelectedChild] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError] = useState('');
  const [lastSync, setLastSync] = useLocalStorage('lumine_last_sync', null);
  const [dataRev, setDataRev] = useLocalStorage('lumine_data_rev', 0);
  const [reviewMode, setReviewMode] = useLocalStorage('lumine_review_mode', false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => !getOnboardingFlag());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [overwriteBlocked, setOverwriteBlocked] = useState(false);
  const [syncModal, setSyncModal] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [showFABMenu, setShowFABMenu] = useState(false);

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

  // Sync com servidor
  const syncWithServer = useCallback(async (payload = null) => {
    if (!isOnline) {
      setSyncError('Sem conexão');
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }

    if (overwriteBlocked && !payload) {
      setSyncError('Baixe os dados antes de sincronizar');
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }

    setSyncStatus('syncing');
    setSyncError('');

    const localRevBefore = Number(dataRev) || 0;
    let serverRev = localRevBefore;

    if (!payload) {
      try {
        const preRes = await fetch(API_URL, { headers: BASE_HEADERS });
        let preData = null;
        try {
          preData = await preRes.json();
        } catch {
          preData = null;
        }
        if (preRes.ok && preData?.success) {
          if (preData.data) {
            if (Array.isArray(preData.data.children)) {
              const normalized = normalizeChildren(preData.data.children).children;
              setChildren(normalized);
            }
            if (Array.isArray(preData.data.records)) {
              const normalizedRecords = normalizeRecords(preData.data.records).records;
              setDailyRecords(normalizedRecords);
            }
            setPendingChanges(0);
          }
          if (typeof preData.dataRev === 'number') {
            serverRev = preData.dataRev;
            setDataRev(serverRev);
          }
          setOverwriteBlocked(false);

          if (serverRev > localRevBefore) {
            setSyncModal({
              type: 'server-new',
              message: 'Há dados novos no servidor. Baixe os dados atuais antes de sincronizar.',
            });
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
            return;
          }
        }
      } catch {
        // Ignora falha no pré-check e tenta sincronizar normalmente.
      }
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: 'sync',
          ifMatchRev: serverRev,
          data: payload || { children, records: dailyRecords },
        }),
      });
      let result = null;
      try {
        result = await res.json();
      } catch {
        result = null;
      }

      if (!res.ok || !result?.success) {
        if (res.status === 409 && result?.error === 'REVISION_MISMATCH') {
          setSyncModal({
            type: 'revision-mismatch',
            message: 'Os dados foram alterados por outro dispositivo. Baixe a versão atual.',
          });
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 3000);
          return;
        }

        if (res.status === 409 && result?.error === 'DATA_LOSS_PREVENTED') {
          const serverCount = result?.serverCount || {};
          setOverwriteBlocked(true);
          setSyncError(
            `Servidor tem mais dados (Crianças: ${serverCount.children || 0}, Registros: ${serverCount.records || 0}). Baixe antes de sincronizar.`
          );
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 3000);
          alert(
            `O servidor tem mais dados (Crianças: ${serverCount.children || 0}, Registros: ${serverCount.records || 0}). Baixe antes de sincronizar.`
          );
          return;
        }

        const message = result?.error || result?.details || `Erro HTTP ${res.status}`;
        throw new Error(message);
      }

      if (typeof result?.dataRev === 'number') {
        setDataRev(result.dataRev);
      }
      setOverwriteBlocked(false);
      setSyncError('');
      setLastSync(new Date().toISOString());
      setPendingChanges(0);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      const message = error?.message || 'Erro na sincronização';
      setSyncError(message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [children, dailyRecords, isOnline, dataRev, overwriteBlocked, setChildren, setDailyRecords, setDataRev, setLastSync, setOverwriteBlocked, setSyncModal, setPendingChanges]);

  // Download do servidor
  const downloadFromServer = useCallback(async () => {
    if (!isOnline) return;
    setSyncStatus('syncing');
    setSyncError('');
    try {
      const res = await fetch(API_URL, { headers: BASE_HEADERS });
      let result = null;
      try {
        result = await res.json();
      } catch {
        result = null;
      }
      if (!res.ok || !result?.success) {
        const message = result?.error || result?.details || `Erro HTTP ${res.status}`;
        throw new Error(message);
      }
      if (result.data) {
        if (Array.isArray(result.data.children)) {
          const normalized = normalizeChildren(result.data.children).children;
          setChildren(normalized);
        }
        if (Array.isArray(result.data.records)) {
          const normalizedRecords = normalizeRecords(result.data.records).records;
          setDailyRecords(normalizedRecords);
        }
        setPendingChanges(0);
      }
      if (typeof result?.dataRev === 'number') setDataRev(result.dataRev);
      setOverwriteBlocked(false);
      setLastSync(new Date().toISOString());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      const message = error?.message || 'Erro ao baixar dados';
      setSyncError(message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [isOnline, setChildren, setDailyRecords, setDataRev, setLastSync, setOverwriteBlocked, setPendingChanges]);

  // Auto-sync a cada 5 min
  useEffect(() => {
    if (isOnline && pendingChanges > 0 && !overwriteBlocked && !reviewMode) {
      const interval = setInterval(() => syncWithServer(), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isOnline, pendingChanges, overwriteBlocked, reviewMode, syncWithServer]);

  // Adicionar criança
  const addChild = async data => {
    const now = new Date().toISOString();
    const enrollmentStatus = data.enrollmentStatus || 'matriculado';
    const entryDate =
      enrollmentStatus === 'matriculado'
        ? data.entryDate || new Date().toISOString().split('T')[0]
        : data.entryDate || '';
    const baseChild = {
      ...data,
      id: Date.now().toString(),
      createdAt: now,
      entryDate,
      enrollmentStatus,
      enrollmentDate: data.enrollmentDate || now,
      matriculationDate:
        enrollmentStatus === 'matriculado'
          ? data.matriculationDate || data.enrollmentDate || now
          : data.matriculationDate || '',
      startDate:
        enrollmentStatus === 'matriculado'
          ? data.startDate || entryDate
          : data.startDate || '',
      documentsReceived: data.documentsReceived || [],
      enrollmentHistory:
        Array.isArray(data.enrollmentHistory) && data.enrollmentHistory.length
          ? data.enrollmentHistory
          : [{ date: now, action: enrollmentStatus, notes: 'Cadastro inicial' }],
    };
    const newChild = normalizeChild(baseChild).child;
    setChildren(prev => [...prev, newChild]);
    setPendingChanges(p => p + 1);
    if (isOnline) {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ action: 'addChild', data: newChild }),
        });
        const result = await res.json().catch(() => null);
        if (result?.childId) {
          setChildren(prev =>
            prev.map(child =>
              child.id === newChild.id ? { ...child, childId: result.childId } : child
            )
          );
        }
        if (typeof result?.dataRev === 'number') {
          setDataRev(result.dataRev);
        }
      } catch {
        return;
      }
    }
  };

  const updateChild = (childId, updatedData) => {
    setChildren(prev =>
      prev.map(child => {
        if (child.id !== childId) return child;
        const merged = { ...child, ...updatedData };
        return normalizeChild(merged).child;
      })
    );
    setSelectedChild(prev => {
      if (!prev || prev.id !== childId) return prev;
      const merged = { ...prev, ...updatedData };
      return normalizeChild(merged).child;
    });
    setPendingChanges(p => p + 1);
  };

  // Adicionar registro (evita duplicidade por criança/dia)
  const addDailyRecord = async data => {
    const now = new Date().toISOString();
    const { recordPayload, nextRecords, existed } = upsertDailyRecord(dailyRecords, data, now);

    setDailyRecords(nextRecords);
    setPendingChanges(p => p + 1);

    if (isOnline) {
      if (existed) {
        if (!reviewMode) {
          await syncWithServer({ children, records: nextRecords });
        }
        return;
      }
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ action: 'addRecord', data: recordPayload }),
        });
        const result = await res.json().catch(() => null);
        if (typeof result?.dataRev === 'number') {
          setDataRev(result.dataRev);
        }
      } catch {
        return;
      }
    }
  };

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
      <Dialog.Root open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 bg-black/50"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6">
            <Dialog.Title className="text-balance text-lg font-semibold text-gray-900">
              Guia rápida (3 passos)
            </Dialog.Title>
            <Dialog.Description className="text-pretty mt-2 text-sm text-gray-600">
              Antes de começar, confira o essencial para registrar crianças e presenças sem perder dados.
            </Dialog.Description>
            <ol className="mt-4 space-y-3 text-pretty text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold tabular-nums text-indigo-700">
                  1
                </span>
                <span className="text-pretty">Cadastre a criança na triagem e finalize a matrícula quando estiver aprovada.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold tabular-nums text-indigo-700">
                  2
                </span>
                <span className="text-pretty">No registro diário, escolha presença e detalhe apenas quando necessário.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold tabular-nums text-indigo-700">
                  3
                </span>
                <span className="text-pretty">Ao sincronizar, sempre baixe antes se houver dados novos no servidor.</span>
              </li>
            </ol>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleOnboardingLater}
                className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700"
              >
                Ver depois
              </button>
              <button
                onClick={handleOnboardingDone}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white"
              >
                Entendi
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    <div className="min-h-dvh bg-gray-100 pb-20 lg:flex lg:h-dvh lg:overflow-hidden lg:pb-0">
      <Sidebar view={view} setView={setView} lastSync={lastSync} isOnline={isOnline} />
      <div className="flex-1 lg:flex lg:flex-col lg:overflow-hidden">
      {/* ========== HEADER COMPACTO ========== */}
      <header className="sticky top-0 z-30 bg-indigo-600 px-4 py-3 text-white shadow-lg lg:hidden">
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
                  ? 'bg-indigo-500'
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
                : pendingChanges > 0
                ? pendingChanges
                : 'Sync'}
            </button>
          </div>
        </div>

        {/* Última sync - só mostra se tiver */}
        {lastSync && syncStatus === 'idle' && (
          <p className="mt-1 text-xs text-indigo-200">Última sync: {formatTime(lastSync)}</p>
        )}
        {syncStatus === 'error' && syncError && (
          <p className="mt-1 text-xs text-rose-100">Sync: {syncError}</p>
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
            <p className="text-pretty text-xs text-rose-600">Sync: {syncError}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
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
                ? 'bg-indigo-100 text-indigo-700'
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
              : pendingChanges > 0
              ? `${pendingChanges} pendente(s)`
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
              />
            </div>
            <div className="hidden lg:block">
              <ChildrenTable
                children={children}
                setSelectedChild={setSelectedChild}
                setView={setView}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            </div>
          </>
        )}
        {view === 'add-child' && (
          <div className="mx-auto w-full lg:max-w-3xl">
            <AddChildView addChild={addChild} setView={setView} />
          </div>
        )}
        {view === 'child-detail' && selectedChild && (
          <>
            <div className="lg:hidden">
              <ChildDetailView child={selectedChild} dailyRecords={dailyRecords} setView={setView} onUpdateChild={updateChild} />
            </div>
            <div className="hidden lg:block">
              <ChildDetailDesktop child={selectedChild} dailyRecords={dailyRecords} onUpdateChild={updateChild} />
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

      <Dialog.Root
        open={Boolean(syncModal)}
        onOpenChange={open => {
          if (!open) setSyncModal(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 bg-black/50"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6">
            <Dialog.Title className="text-lg font-bold">Atenção</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-600">
              {syncModal?.message}
            </Dialog.Description>
            <div className="mt-6 flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-xl bg-gray-100 py-3 font-medium">
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                onClick={async () => {
                  try {
                    if (syncModal?.type === 'revision-mismatch') {
                      await downloadFromServer();
                    }
                  } finally {
                    setSyncModal(null);
                  }
                }}
                className="flex-1 rounded-xl bg-indigo-600 py-3 font-medium text-white"
              >
                Baixar agora
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>

      {/* ========== FAB (Floating Action Button) ========== */}
      {(view === 'children' || view === 'daily' || view === 'dashboard') && (
        <div
          className="fixed right-4 z-40 lg:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}
        >
          {showFABMenu && (
            <div className="absolute bottom-16 right-0 mb-2 w-48 overflow-hidden rounded-xl border bg-white shadow-xl">
              <button
                onClick={() => {
                  setView('add-child');
                  setShowFABMenu(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <Users size={18} className="text-indigo-600" />
                <span className="text-sm font-medium">Nova Criança</span>
              </button>
              <button
                onClick={() => {
                  setView('daily');
                  setShowFABMenu(false);
                }}
                className="flex w-full items-center gap-3 border-t px-4 py-3 text-left hover:bg-gray-50"
              >
                <Calendar size={18} className="text-green-600" />
                <span className="text-sm font-medium">Novo Registro</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowFABMenu(!showFABMenu)}
            className={cn(
              'flex size-14 items-center justify-center rounded-full shadow-lg transition-all',
              showFABMenu ? 'rotate-45 bg-gray-600' : 'bg-indigo-600'
            )}
            aria-label={showFABMenu ? 'Fechar ações' : 'Abrir ações'}
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>
      )}

      {/* ========== BOTTOM NAVIGATION ========== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white shadow-lg lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          <NavItem icon={Home} label="Início" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem
            icon={Users}
            label="Crianças"
            active={view === 'children' || view === 'add-child' || view === 'child-detail'}
            onClick={() => setView('children')}
          />
          <NavItem icon={Calendar} label="Registro" active={view === 'daily'} onClick={() => setView('daily')} />
          <NavItem icon={Settings} label="Config" active={view === 'config'} onClick={() => setView('config')} />
        </div>
      </nav>

      {/* Overlay para fechar FAB menu */}
      {showFABMenu && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => setShowFABMenu(false)}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        />
      )}
    </div>
    </>
  );
}

// ============================================
// BOTTOM NAV ITEM
// ============================================
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-full w-16 flex-col items-center justify-center transition-colors',
        active ? 'text-indigo-600' : 'text-gray-400'
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className={cn('mt-1 text-xs', active && 'font-semibold')}>{label}</span>
    </button>
  );
}


// ============================================
// SIDEBAR DESKTOP
// ============================================
function Sidebar({ view, setView, lastSync, isOnline }) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:bg-gray-900 lg:text-white">
      <div className="px-6 py-6">
        <p className="text-xs uppercase text-indigo-300">Instituto</p>
        <h2 className="text-balance mt-2 text-2xl font-semibold text-white">Lumine</h2>
        <p className="mt-1 text-xs text-indigo-200">Sistema de Acompanhamento</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        <SidebarItem
          icon={Home}
          label="Dashboard"
          active={view === 'dashboard'}
          onClick={() => setView('dashboard')}
        />
        <SidebarItem
          icon={Users}
          label="Crianças"
          active={view === 'children' || view === 'add-child' || view === 'child-detail'}
          onClick={() => setView('children')}
        />
        <SidebarItem
          icon={Calendar}
          label="Registro"
          active={view === 'daily'}
          onClick={() => setView('daily')}
        />
        <SidebarItem
          icon={Settings}
          label="Configurações"
          active={view === 'config'}
          onClick={() => setView('config')}
        />
      </nav>
      <div className="border-t border-white/10 px-6 py-4 text-xs text-indigo-200">
        <div className="flex items-center gap-2">
          <span
            className={cn('size-2 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-rose-400')}
          />
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <p className="mt-2">
          Última sync: {lastSync ? `${formatDate(lastSync)} ${formatTime(lastSync)}` : 'Nenhuma'}
        </p>
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-sm font-medium transition',
        active ? 'bg-indigo-600 text-white' : 'text-indigo-100 hover:bg-white/10'
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

// ============================================
// DASHBOARD
// ============================================
function DashboardView({ stats, alerts, children, dailyRecords, setSelectedChild, setView }) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = dailyRecords.filter(r => r.date?.split('T')[0] === today);
  const activeChildren = children.filter(isMatriculated);
  const pendingToday = activeChildren.filter(c => !todayRecords.find(r => r.childInternalId === c.id));

  return (
    <div className="space-y-4">
      {/* Cards de Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={stats.present} label="Presentes" color="green" icon={CheckCircle} />
        <StatCard value={stats.absent} label="Ausentes" color="red" icon={XCircle} />
        <StatCard value={stats.total} label="Total" color="indigo" icon={Users} />
        <StatCard value={stats.meals} label="Refeições/mês" color="amber" icon={Calendar} />
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <span className="text-balance text-sm font-semibold text-amber-800">Alertas</span>
          </div>
          {alerts.map((a, i) => (
            <div
              key={i}
              onClick={() => {
                const child = children.find(c => c.id === a.childId);
                if (child) {
                  setSelectedChild(child);
                  setView('child-detail');
                }
              }}
              className="cursor-pointer py-1 text-sm text-amber-700 hover:underline"
            >
              <strong>{a.childName}:</strong> {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Pendentes hoje */}
      {pendingToday.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-balance font-semibold text-gray-800">Registrar hoje</h3>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 tabular-nums">
              {pendingToday.length} pendentes
            </span>
          </div>
          <div className="space-y-2">
            {pendingToday.slice(0, 5).map(child => (
              <div
                key={child.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
              >
                <span className="flex-1 truncate text-sm font-medium">{child.name}</span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            ))}
            {pendingToday.length > 5 && (
              <button
                onClick={() => setView('daily')}
                className="w-full py-2 text-center text-sm font-medium text-indigo-600"
              >
                Ver todos ({pendingToday.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Atividade recente */}
      {todayRecords.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-balance mb-3 font-semibold text-gray-800">Registros de hoje</h3>
          <div className="space-y-2">
            {todayRecords.slice(0, 5).map(rec => {
              const child = children.find(c => c.id === rec.childInternalId);
              return (
                <div key={rec.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                  <div
                    className={cn(
                      'size-2 rounded-full',
                      rec.attendance === 'present'
                        ? 'bg-green-500'
                        : rec.attendance === 'late'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                  />
                  <span className="flex-1 truncate text-sm">{child?.name || 'Criança'}</span>
                  <span className="text-xs text-gray-500">
                    {rec.attendance === 'present'
                      ? 'Presente'
                      : rec.attendance === 'late'
                      ? 'Atrasado'
                      : 'Ausente'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardDesktop({ stats, alerts, children, dailyRecords, setSelectedChild, setView }) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = dailyRecords.filter(r => r.date?.split('T')[0] === today);
  const activeChildren = children.filter(isMatriculated);
  const pendingToday = activeChildren.filter(c => !todayRecords.find(r => r.childInternalId === c.id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard value={stats.present} label="Presentes" color="green" icon={CheckCircle} />
        <StatCard value={stats.absent} label="Ausentes" color="red" icon={XCircle} />
        <StatCard value={stats.total} label="Total" color="indigo" icon={Users} />
        <StatCard value={stats.meals} label="Refeições/mês" color="amber" icon={Calendar} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {alerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <span className="text-balance text-sm font-semibold text-amber-800">Alertas recentes</span>
              </div>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <button
                    key={`${alert.childId}-${index}`}
                    onClick={() => {
                      const child = children.find(c => c.id === alert.childId);
                      if (child) {
                        setSelectedChild(child);
                        setView('child-detail');
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-left text-sm text-amber-900 hover:bg-white"
                  >
                    <span>
                      <strong>{alert.childName}:</strong> {alert.msg}
                    </span>
                    <ChevronRight size={16} className="text-amber-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-balance font-semibold text-gray-800">Pendências de hoje</h3>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 tabular-nums">
                {pendingToday.length} pendentes
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {pendingToday.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                  Tudo registrado por hoje.
                </div>
              )}
              {pendingToday.slice(0, 6).map(child => (
                <div key={child.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <span className="truncate text-sm font-medium text-gray-800">{child.name}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              ))}
            </div>
            {pendingToday.length > 0 && (
              <button
                onClick={() => setView('daily')}
                className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Ir para registros
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-balance font-semibold text-gray-800">Registros de hoje</h3>
            <span className="text-xs text-gray-500 tabular-nums">{todayRecords.length} registros</span>
          </div>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
            {todayRecords.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                <p className="text-pretty">Nenhum registro feito hoje.</p>
                <button
                  onClick={() => setView('daily')}
                  className="mt-3 w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Ir para registro
                </button>
              </div>
            )}
            {todayRecords.map(record => {
              const child = children.find(c => c.id === record.childInternalId);
              return (
                <div key={record.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{child?.name || 'Criança'}</p>
                    <p className="text-xs text-gray-500">{formatDate(record.date)}</p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      record.attendance === 'present'
                        ? 'bg-green-100 text-green-700'
                        : record.attendance === 'late'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {record.attendance === 'present'
                      ? 'Presente'
                      : record.attendance === 'late'
                      ? 'Atrasado'
                      : 'Ausente'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, icon: Icon }) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <div className={cn('rounded-xl border p-4', colors[color])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs opacity-80">{label}</p>
        </div>
        <Icon size={24} className="opacity-50" />
      </div>
    </div>
  );
}

// ============================================
// LISTA DE CRIANÇAS
// ============================================
function ChildrenView({ children, setSelectedChild, setView, searchTerm, setSearchTerm }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = children.filter(child => {
    const matchesName = child.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesName) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'draft') return isTriageDraft(child);
    return getEnrollmentStatus(child) === statusFilter;
  });

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar criança..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 shadow-sm focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Filtro */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Todas' },
                    { value: 'em_triagem', label: 'Triagem' },
          { value: 'draft', label: 'Rascunhos' },
          { value: 'aprovado', label: 'Aprovado' },
          { value: 'lista_espera', label: 'Lista de espera' },
          { value: 'matriculado', label: 'Matriculado' },
          { value: 'recusado', label: 'Não atendida' },
          { value: 'desistente', label: 'Desistente' },
          { value: 'inativo', label: 'Inativo' },
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              statusFilter === option.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-500 tabular-nums">
        {filtered.length} criança{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map(child => {
          const statusMeta = getStatusMeta(child);
          const isDraft = isTriageDraft(child);
          return (
            <div
              key={child.id}
              onClick={() => {
                setSelectedChild(child);
                setView('child-detail');
              }}
              className="flex cursor-pointer items-center gap-4 rounded-xl bg-white p-4 shadow-sm active:bg-gray-50"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-indigo-100">
                <User size={24} className="text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-gray-800">{child.name}</h3>
                <p className="text-sm text-gray-500 tabular-nums">
                  {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                      statusMeta.className
                    )}
                  >
                    {statusMeta.label}
                  </span>
                  {isDraft && (
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Rascunho
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-pretty text-gray-500">
            {searchTerm ? 'Nenhuma criança encontrada' : 'Nenhuma criança cadastrada'}
          </p>
          <button
            onClick={() => setView('add-child')}
            className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cadastrar criança
          </button>
        </div>
      )}
    </div>
  );
}


function ChildrenTable({ children, setSelectedChild, setView, searchTerm, setSearchTerm }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = children.filter(child => {
    const matchesName = child.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesName) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'draft') return isTriageDraft(child);
    return getEnrollmentStatus(child) === statusFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar criança..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => setView('add-child')}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus size={16} />
          Nova criança
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Todas' },
                    { value: 'em_triagem', label: 'Triagem' },
          { value: 'draft', label: 'Rascunhos' },
          { value: 'aprovado', label: 'Aprovado' },
          { value: 'lista_espera', label: 'Lista de espera' },
          { value: 'matriculado', label: 'Matriculado' },
          { value: 'recusado', label: 'Não atendida' },
          { value: 'desistente', label: 'Desistente' },
          { value: 'inativo', label: 'Inativo' },
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              statusFilter === option.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-balance">Nome</th>
              <th className="px-4 py-3 text-balance">Idade</th>
              <th className="px-4 py-3 text-balance">Responsável</th>
              <th className="px-4 py-3 text-balance">Telefone</th>
              <th className="px-4 py-3 text-balance">Escola</th>
              <th className="px-4 py-3 text-balance">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(child => (
              <tr
                key={child.id}
                onClick={() => {
                  setSelectedChild(child);
                  setView('child-detail');
                }}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-800">{child.name}</td>
                <td className="px-4 py-3 text-gray-600 tabular-nums">
                  {child.birthDate ? `${calculateAge(child.birthDate)} anos` : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">{child.guardianName || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{child.guardianPhone || '-'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {child.school ? `${child.school}${child.grade ? ` - ${child.grade}` : ''}` : '-'}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const statusMeta = getStatusMeta(child);
                    const isDraft = isTriageDraft(child);
                    return (
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-xs font-semibold',
                            statusMeta.className
                          )}
                        >
                          {statusMeta.label}
                        </span>
                        {isDraft && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Rascunho
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  <p className="text-pretty">
                    {searchTerm ? 'Nenhuma criança encontrada' : 'Nenhuma criança cadastrada'}
                  </p>
                  <button
                    onClick={() => setView('add-child')}
                    className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cadastrar criança
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// ADICIONAR CRIANÇA
// ============================================
function AddChildView({ addChild, setView }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    guardianName: '',
    guardianPhone: '',
    neighborhood: '',
    school: '',
    schoolShift: '',
    referralSource: '',
    schoolCommuteAlone: '',
    grade: '',
    guardianPhoneAlt: '',
    healthCareNeeded: '',
    healthNotes: '',
    dietaryRestriction: '',
    specialNeeds: '',
    triageNotes: '',
    priority: '',
    priorityReason: '',
    triageResult: '',
    startDate: new Date().toISOString().split('T')[0],
    participationDays: [],
    authorizedPickup: '',
    canLeaveAlone: '',
    leaveAloneConsent: false,
    leaveAloneConfirmation: '',
    termsAccepted: false,
    classGroup: '',
    imageConsent: '',
    documentsReceived: [],
    initialObservations: '',
  });

  const [triageError, setTriageError] = useState('');
  const [matriculaError, setMatriculaError] = useState('');

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleDocument = value => {
    setForm(prev => {
      const current = Array.isArray(prev.documentsReceived) ? prev.documentsReceived : [];
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, documentsReceived: next };
    });
  };

  const toggleParticipationDay = value => {
    setForm(prev => {
      const current = Array.isArray(prev.participationDays) ? prev.participationDays : [];
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, participationDays: next };
    });
  };

  const triageChecklistFields = [
    ...TRIAGE_REQUIRED_FIELDS,
    ...(form.healthCareNeeded === 'sim' ? ['healthNotes'] : []),
  ];
  const triageChecklistItems = buildChecklist(
    triageChecklistFields,
    form,
    STATUS_FIELD_LABELS
  );
  const triageComplete = isTriageComplete(form);
  const triageMissingCount = triageChecklistItems.filter(item => !item.complete).length;

  const matriculaChecklistFields = [
    ...MATRICULA_REQUIRED_FIELDS,
    ...(form.canLeaveAlone === 'sim' ? ['leaveAloneConsent', 'leaveAloneConfirmation'] : []),
  ];
  const matriculaChecklistItems = buildChecklist(
    matriculaChecklistFields,
    form,
    STATUS_FIELD_LABELS
  );
  const matriculaComplete = isMatriculaComplete(form);
  const matriculaMissingCount = matriculaChecklistItems.filter(item => !item.complete).length;




  const buildPayload = (status, triageIsComplete) => {
    const now = new Date().toISOString();
    const enrollmentHistory = [];
    const triageCompleteFlag = Boolean(triageIsComplete);

    if (status === 'matriculado') {
      enrollmentHistory.push({
        date: now,
        action: 'aprovado',
        notes: 'Triagem aprovada',
      });
      enrollmentHistory.push({
        date: now,
        action: 'matriculado',
        notes: 'Matrícula efetivada',
      });
    } else {
      enrollmentHistory.push({
        date: now,
        action: status,
        notes: triageCompleteFlag ? 'Triagem registrada' : 'Rascunho salvo',
      });
    }

    const {
      termsAccepted,
      triageResult,
      healthNotes,
      leaveAloneConfirmation,
      ...rest
    } = form;

    return {
      ...rest,
      healthNotes: form.healthCareNeeded === 'sim' ? healthNotes : '',
      leaveAloneConfirmation: form.canLeaveAlone === 'sim' ? leaveAloneConfirmation : '',
      enrollmentStatus: status,
      enrollmentDate: now,
      triageDate: triageCompleteFlag ? now : '',
      matriculationDate: status === 'matriculado' ? now : '',
      startDate: status === 'matriculado' ? form.startDate : '',
      entryDate: status === 'matriculado' ? form.startDate : '',
      responsibilityTerm: termsAccepted,
      consentTerm: termsAccepted,
      enrollmentHistory,
    };
  };

  const handleSaveTriagem = () => {
    setTriageError('');
    if (form.triageResult && !triageComplete) {
      setTriageError('Complete os itens obrigatórios da triagem para definir o resultado.');
      return;
    }
    const status = form.triageResult || 'em_triagem';
    addChild(buildPayload(status, triageComplete));
    setView('children');
  };

  const handleMatricular = () => {
    setTriageError('');
    setMatriculaError('');
    if (!triageComplete) {
      setTriageError('Complete os itens obrigatórios da triagem para concluir.');
      return;
    }
    if (!matriculaComplete) {
      setMatriculaError('Complete os itens obrigatórios da matrícula para concluir.');
      return;
    }
    addChild(buildPayload('matriculado', true));
    setView('children');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2].map(s => (
          <div
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full',
              step >= s ? 'bg-indigo-600' : 'bg-gray-200'
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-balance text-lg font-semibold text-gray-800">Triagem</h2>
            <p className="text-pretty text-sm text-gray-500">Coleta inicial em um único momento.</p>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-pretty text-xs font-semibold text-gray-500">Obrigatórios da triagem</p>
              <span className="text-xs text-gray-500 tabular-nums">
                {triageComplete
                  ? 'Completa'
                  : `${triageMissingCount} pendente${triageMissingCount === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {triageChecklistItems.map(item => (
                <span
                  key={item.field}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold',
                    item.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      item.complete ? 'bg-emerald-500' : 'bg-gray-300'
                    )}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                placeholder="Nome da criança"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data de nascimento *</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={e => updateField('birthDate', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome do responsável principal *</label>
              <input
                type="text"
                value={form.guardianName}
                onChange={e => updateField('guardianName', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone (WhatsApp) *</label>
              <input
                type="tel"
                value={form.guardianPhone}
                onChange={e => updateField('guardianPhone', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                placeholder="(83) 99999-9999"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Escola *</label>
                <input
                  type="text"
                  value={form.school}
                  onChange={e => updateField('school', e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Série</label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={e => updateField('grade', e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder="2º ano"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Turno escolar *</label>
              <select
                value={form.schoolShift}
                onChange={e => updateField('schoolShift', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="manhã">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="integral">Integral</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bairro/Comunidade *</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={e => updateField('neighborhood', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Como conheceu o Lumine? *</label>
              <select
                value={form.referralSource}
                onChange={e => updateField('referralSource', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="igreja">Igreja</option>
                <option value="escola">Escola</option>
                <option value="CRAS">CRAS</option>
                <option value="indicação">Indicação</option>
                <option value="redes_sociais">Redes sociais</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                A criança vai e volta desacompanhada da escola? *
              </label>
              <select
                value={form.schoolCommuteAlone}
                onChange={e => updateField('schoolCommuteAlone', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone alternativo</label>
              <input
                type="tel"
                value={form.guardianPhoneAlt}
                onChange={e => updateField('guardianPhoneAlt', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Existe algum cuidado de saúde?</label>
              <select
                value={form.healthCareNeeded}
                onChange={e => updateField('healthCareNeeded', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            {form.healthCareNeeded === 'sim' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Qual cuidado de saúde?</label>
                <input
                  type="text"
                  value={form.healthNotes}
                  onChange={e => updateField('healthNotes', e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Existe alguma restrição alimentar?</label>
              <select
                value={form.dietaryRestriction}
                onChange={e => updateField('dietaryRestriction', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Necessidades específicas</label>
              <input
                type="text"
                value={form.specialNeeds}
                onChange={e => updateField('specialNeeds', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações da triagem</label>
              <textarea
                value={form.triageNotes}
                onChange={e => updateField('triageNotes', e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prioridade (interna)</label>
              <select
                value={form.priority}
                onChange={e => updateField('priority', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="alta">Alta</option>
                <option value="média">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notas internas da triagem</label>
              <input
                type="text"
                value={form.priorityReason}
                onChange={e => updateField('priorityReason', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Resultado da triagem (opcional)</label>
              <select
                value={form.triageResult}
                onChange={e => updateField('triageResult', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                {TRIAGE_RESULT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveTriagem}
              className="flex-1 rounded-xl bg-gray-100 py-4 font-semibold text-gray-700"
            >
              {triageComplete ? 'Concluir triagem' : 'Salvar rascunho'}
            </button>
            <button
              onClick={() => {
                setTriageError('');
                if (form.triageResult !== 'aprovado') {
                  setTriageError("Selecione 'Aprovada para matrícula' para continuar.");
                  return;
                }
                if (!triageComplete) {
                  setTriageError('Complete os itens obrigatórios da triagem para continuar.');
                  return;
                }
                setStep(2);
              }}
              className="flex-1 rounded-xl bg-indigo-600 py-4 font-semibold text-white"
            >
              Continuar para matrícula
            </button>
          </div>
          {triageError && (
            <p className="text-pretty text-xs text-rose-600">{triageError}</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-balance text-lg font-semibold text-gray-800">Matrícula</h2>
            <p className="text-pretty text-sm text-gray-500">Somente para crianças aprovadas na triagem.</p>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-pretty text-xs font-semibold text-gray-500">Obrigatórios da matrícula</p>
              <span className="text-xs text-gray-500 tabular-nums">
                {matriculaComplete
                  ? 'Completa'
                  : `${matriculaMissingCount} pendente${matriculaMissingCount === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {matriculaChecklistItems.map(item => (
                <span
                  key={item.field}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold',
                    item.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      item.complete ? 'bg-emerald-500' : 'bg-gray-300'
                    )}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data de início *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => updateField('startDate', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Dias de participação *</p>
              <div className="flex flex-wrap gap-2">
                {PARTICIPATION_DAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleParticipationDay(day.value)}
                    className={cn(
                      'rounded-full px-3 py-1 text-sm font-medium transition-all',
                      form.participationDays.includes(day.value)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Pessoas autorizadas a retirar a criança *
              </label>
              <input
                type="text"
                value={form.authorizedPickup}
                onChange={e => updateField('authorizedPickup', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                placeholder="Nome(s) autorizados"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                A criança pode sair desacompanhada ao deixar o Lumine? *
              </label>
              <select
                value={form.canLeaveAlone}
                onChange={e => updateField('canLeaveAlone', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            {form.canLeaveAlone === 'sim' && (
              <div className="space-y-3 rounded-xl bg-indigo-50 p-4">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.leaveAloneConsent}
                    onChange={e => updateField('leaveAloneConsent', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Autorizo a saída desacompanhada
                </label>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Confirmação do responsável legal *
                  </label>
                  <input
                    type="text"
                    value={form.leaveAloneConfirmation}
                    onChange={e => updateField('leaveAloneConfirmation', e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Autorizo que Maria saia desacompanhada"
                  />
                </div>
              </div>
            )}
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={e => updateField('termsAccepted', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Declaro ciência e concordo com o Termo de Responsabilidade e Consentimento *
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Turma/Grupo</label>
              <select
                value={form.classGroup}
                onChange={e => updateField('classGroup', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione</option>
                <option value="pré_alfabetização">Pré-alfabetização</option>
                <option value="alfabetização">Alfabetização</option>
                <option value="fundamental_1">Fundamental 1</option>
                <option value="fundamental_2">Fundamental 2</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Autorização de uso de imagem (opcional)
              </label>
              <select
                value={form.imageConsent}
                onChange={e => updateField('imageConsent', e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Não autorizo</option>
                <option value="interno">Uso interno (sem divulgação)</option>
                <option value="comunicacao">Uso institucional e comunicação</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Documentos recebidos</p>
              <div className="space-y-2 text-sm text-gray-600">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('certidão_nascimento')}
                    onChange={() => toggleDocument('certidão_nascimento')}
                    className="h-4 w-4 rounded"
                  />
                  Certidão de nascimento
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('documento_responsável')}
                    onChange={() => toggleDocument('documento_responsável')}
                    className="h-4 w-4 rounded"
                  />
                  Documento do responsável
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.documentsReceived.includes('comprovante_residência')}
                    onChange={() => toggleDocument('comprovante_residência')}
                    className="h-4 w-4 rounded"
                  />
                  Comprovante de residência
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações pedagógicas</label>
              <textarea
                value={form.initialObservations}
                onChange={e => updateField('initialObservations', e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl bg-gray-100 py-4 font-semibold text-gray-700"
            >
              Voltar
            </button>
            <button
              onClick={handleMatricular}
              disabled={!matriculaComplete}
              className={cn(
                'flex-1 rounded-xl bg-green-600 py-4 font-semibold text-white',
                !matriculaComplete && 'opacity-50'
              )}
            >
              Matricular
            </button>
          </div>
          {matriculaError && (
            <p className="text-pretty text-xs text-rose-600">{matriculaError}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// DETALHES DA CRIANÇA
// ============================================
function ChildDetailView({ child, dailyRecords, onUpdateChild }) {
  const childRecords = dailyRecords
    .filter(r => r.childInternalId === child.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const rate = calculateAttendanceRate(childRecords);
  const present = childRecords.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  const absent = childRecords.filter(r => r.attendance === 'absent').length;

  const statusMeta = getStatusMeta(child);
  const enrollmentHistory = parseEnrollmentHistory(child.enrollmentHistory);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [nextStatus, setNextStatus] = useState(statusMeta.status);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusFormData, setStatusFormData] = useState(() => buildStatusFormData(child));

  useEffect(() => {
    setStatusFormData(buildStatusFormData(child));
  }, [child]);

  const requiresTriage = ['em_triagem', 'aprovado', 'lista_espera', 'recusado', 'matriculado']
    .includes(nextStatus);
  const requiresMatricula = nextStatus === 'matriculado';
  const missingTriage = requiresTriage ? getMissingTriageFields(statusFormData) : [];
  const missingMatricula = requiresMatricula ? getMissingMatriculaFields(statusFormData) : [];

  const missingSet = new Set([...missingTriage, ...missingMatricula]);
  const fieldClass = field =>
    cn(
      'w-full rounded-lg border px-3 py-2 text-sm',
      missingSet.has(field) ? 'border-rose-300 focus:ring-rose-300' : 'border-gray-200'
    );

  const updateStatusField = (field, value) => {
    setStatusFormData(prev => ({ ...prev, [field]: value }));
  };

  const allowedStatusOptions = [
    { value: 'em_triagem', label: 'Em triagem' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'lista_espera', label: 'Lista de espera' },
    { value: 'matriculado', label: 'Matriculado' },
    { value: 'recusado', label: 'Não atendida' },
    { value: 'desistente', label: 'Desistente' },
    { value: 'inativo', label: 'Inativo' },
  ];

  const validateStatusTransition = status => {
    if (status === statusMeta.status) return 'Escolha um status diferente.';
    const missing = getMissingFieldsForStatus(status, statusFormData);
    if (missing.length) {
      return `Complete os campos obrigatórios: ${missing.join(', ')}.`;
    }
    if (status === 'recusado' && !statusNotes.trim()) {
      return 'Informe o motivo do não atendimento.';
    }
    if (status === 'desistente' && !statusNotes.trim()) {
      return 'Informe o motivo da desistência.';
    }
    return '';
  };

  const applyStatusChange = () => {
    const error = validateStatusTransition(nextStatus);
    if (error) {
      setStatusError(error);
      return;
    }
    setStatusError('');
    const now = new Date().toISOString();
    const updatedHistory = [
      ...enrollmentHistory,
      { date: now, action: nextStatus, notes: statusNotes.trim() || 'Atualização de status' },
    ];

    const updates = {
      enrollmentStatus: nextStatus,
      enrollmentHistory: updatedHistory,
    };

    if (requiresTriage) {
      updates.name = statusFormData.name.trim();
      updates.birthDate = statusFormData.birthDate;
      updates.guardianName = statusFormData.guardianName.trim();
      updates.guardianPhone = statusFormData.guardianPhone.trim();
      updates.neighborhood = statusFormData.neighborhood.trim();
      updates.school = statusFormData.school.trim();
      updates.schoolShift = statusFormData.schoolShift;
      updates.referralSource = statusFormData.referralSource;
      updates.schoolCommuteAlone = statusFormData.schoolCommuteAlone;
    }

    if (!child.enrollmentDate) updates.enrollmentDate = now;
    if (requiresTriage && !child.triageDate) updates.triageDate = now;

    if (requiresMatricula) {
      updates.startDate = statusFormData.startDate;
      updates.entryDate = statusFormData.startDate;
      updates.participationDays = statusFormData.participationDays;
      updates.authorizedPickup = statusFormData.authorizedPickup.trim();
      updates.canLeaveAlone = statusFormData.canLeaveAlone;
      updates.leaveAloneConsent =
        statusFormData.canLeaveAlone === 'sim' ? statusFormData.leaveAloneConsent : false;
      updates.leaveAloneConfirmation =
        statusFormData.canLeaveAlone === 'sim' ? statusFormData.leaveAloneConfirmation.trim() : '';
      updates.responsibilityTerm = statusFormData.termsAccepted;
      updates.consentTerm = statusFormData.termsAccepted;
      if (!child.matriculationDate) updates.matriculationDate = now;
    }

    if (onUpdateChild) onUpdateChild(child.id, updates);
    setShowStatusForm(false);
    setStatusNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Avatar e nome */}
      <div className="rounded-xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-indigo-100">
          <User size={40} className="text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{child.name}</h2>
        <p className="text-gray-500">
          {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
        </p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-gray-400">Status da matrícula</p>
            <span
              className={cn(
                'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                statusMeta.className
              )}
            >
              {statusMeta.label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowStatusForm(prev => !prev);
              setStatusError('');
              setNextStatus(statusMeta.status);
              setStatusFormData(buildStatusFormData(child));
            }}
            className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
          >
            Alterar status
          </button>
        </div>

        {showStatusForm && (
          <div className="mt-4 space-y-3">
            <select
              value={nextStatus}
              onChange={e => setNextStatus(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            >
              {allowedStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <textarea
              value={statusNotes}
              onChange={e => setStatusNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Notas da mudança de status"
            />
            {(requiresTriage || requiresMatricula) && (
              <div className="space-y-3 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Dados obrigatórios</p>
                  {missingSet.size > 0 && (
                    <span className="text-xs font-semibold text-rose-600">
                      {missingSet.size} pendente(s)
                    </span>
                  )}
                </div>

                {requiresTriage && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500">Triagem</p>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Nome completo</label>
                      <input
                        type="text"
                        value={statusFormData.name}
                        onChange={e => updateStatusField('name', e.target.value)}
                        className={fieldClass('name')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Data de nascimento</label>
                      <input
                        type="date"
                        value={statusFormData.birthDate}
                        onChange={e => updateStatusField('birthDate', e.target.value)}
                        className={fieldClass('birthDate')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Nome do responsável</label>
                      <input
                        type="text"
                        value={statusFormData.guardianName}
                        onChange={e => updateStatusField('guardianName', e.target.value)}
                        className={fieldClass('guardianName')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Telefone (WhatsApp)</label>
                      <input
                        type="tel"
                        value={statusFormData.guardianPhone}
                        onChange={e => updateStatusField('guardianPhone', e.target.value)}
                        className={fieldClass('guardianPhone')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Bairro/Comunidade</label>
                      <input
                        type="text"
                        value={statusFormData.neighborhood}
                        onChange={e => updateStatusField('neighborhood', e.target.value)}
                        className={fieldClass('neighborhood')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Escola</label>
                      <input
                        type="text"
                        value={statusFormData.school}
                        onChange={e => updateStatusField('school', e.target.value)}
                        className={fieldClass('school')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Turno escolar</label>
                      <select
                        value={statusFormData.schoolShift}
                        onChange={e => updateStatusField('schoolShift', e.target.value)}
                        className={fieldClass('schoolShift')}
                      >
                        <option value="">Selecione</option>
                        <option value="manhã">Manhã</option>
                        <option value="tarde">Tarde</option>
                        <option value="integral">Integral</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Como conheceu o Lumine?</label>
                      <select
                        value={statusFormData.referralSource}
                        onChange={e => updateStatusField('referralSource', e.target.value)}
                        className={fieldClass('referralSource')}
                      >
                        <option value="">Selecione</option>
                        <option value="igreja">Igreja</option>
                        <option value="escola">Escola</option>
                        <option value="CRAS">CRAS</option>
                        <option value="indicação">Indicação</option>
                        <option value="redes_sociais">Redes sociais</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Vai e volta desacompanhada da escola?
                      </label>
                      <select
                        value={statusFormData.schoolCommuteAlone}
                        onChange={e => updateStatusField('schoolCommuteAlone', e.target.value)}
                        className={fieldClass('schoolCommuteAlone')}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  </div>
                )}

                {requiresMatricula && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500">Matrícula</p>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Data de início</label>
                      <input
                        type="date"
                        value={statusFormData.startDate}
                        onChange={e => updateStatusField('startDate', e.target.value)}
                        className={fieldClass('startDate')}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-700">Dias de participação</p>
                      <div className="flex flex-wrap gap-2">
                        {PARTICIPATION_DAYS.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() =>
                              updateStatusField(
                                'participationDays',
                                statusFormData.participationDays.includes(day.value)
                                  ? statusFormData.participationDays.filter(item => item !== day.value)
                                  : [...statusFormData.participationDays, day.value]
                              )
                            }
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-medium',
                              statusFormData.participationDays.includes(day.value)
                                ? 'bg-indigo-600 text-white'
                                : missingSet.has('participationDays')
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-gray-200 text-gray-600'
                            )}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Pessoas autorizadas a retirar
                      </label>
                      <input
                        type="text"
                        value={statusFormData.authorizedPickup}
                        onChange={e => updateStatusField('authorizedPickup', e.target.value)}
                        className={fieldClass('authorizedPickup')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Pode sair desacompanhada?
                      </label>
                      <select
                        value={statusFormData.canLeaveAlone}
                        onChange={e => updateStatusField('canLeaveAlone', e.target.value)}
                        className={fieldClass('canLeaveAlone')}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    {statusFormData.canLeaveAlone === 'sim' && (
                      <div className="space-y-2 rounded-lg bg-white p-2">
                        <label className="flex items-center gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={statusFormData.leaveAloneConsent}
                            onChange={e => updateStatusField('leaveAloneConsent', e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          Autorizo a saída desacompanhada
                        </label>
                        <input
                          type="text"
                          value={statusFormData.leaveAloneConfirmation}
                          onChange={e => updateStatusField('leaveAloneConfirmation', e.target.value)}
                          placeholder="Confirmação da autorização"
                          className={fieldClass('leaveAloneConfirmation')}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={statusFormData.termsAccepted}
                        onChange={e => updateStatusField('termsAccepted', e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      Termo de Responsabilidade e Consentimento
                    </label>
                  </div>
                )}
              </div>
            )}
            {statusError && <p className="text-pretty text-xs text-rose-600">{statusError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowStatusForm(false)}
                className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyStatusChange}
                className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-indigo-50 p-3 text-center">
          <p className="text-xl font-bold text-indigo-600">{rate}%</p>
          <p className="text-xs text-indigo-600">Frequência</p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-green-600">Presenças</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 text-center">
          <p className="text-xl font-bold text-red-600">{absent}</p>
          <p className="text-xs text-red-600">Faltas</p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800">Informações</h3>
        <InfoRow icon={User} label="Responsável" value={child.guardianName} />
        <InfoRow icon={Phone} label="Telefone" value={child.guardianPhone} />
        {child.school && (
          <InfoRow
            icon={School}
            label="Escola"
            value={`${child.school}${child.grade ? ` - ${child.grade}` : ''}`}
          />
        )}
        <InfoRow icon={Clock} label="Entrada" value={formatDate(child.entryDate)} />
      </div>

      
      {/* Histórico de status */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-800">Histórico da matrícula</h3>
        {enrollmentHistory.length > 0 ? (
          <div className="space-y-2">
            {enrollmentHistory
              .slice()
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((entry, index) => {
                const meta = ENROLLMENT_STATUS_META[entry.action] || {
                  label: entry.action || 'Status',
                  className: 'bg-gray-100 text-gray-600',
                };
                return (
                  <div key={`${entry.date}-${index}`} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          meta.className
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                    </div>
                    {entry.notes && <p className="mt-2 text-xs text-gray-600">{entry.notes}</p>}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">Sem histórico registrado.</p>
        )}
      </div>

      {/* Histórico */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-800">Últimos registros</h3>
        {childRecords.length > 0 ? (
          <div className="space-y-2">
            {childRecords.slice(0, 10).map(rec => (
              <div
                key={rec.id}
                className={cn(
                  'rounded-lg border-l-4 p-3',
                  rec.attendance === 'present'
                    ? 'border-green-500 bg-green-50'
                    : rec.attendance === 'late'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-red-500 bg-red-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{formatDate(rec.date)}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      rec.attendance === 'present'
                        ? 'bg-green-200 text-green-800'
                        : rec.attendance === 'late'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                    )}
                  >
                    {rec.attendance === 'present'
                      ? 'Presente'
                      : rec.attendance === 'late'
                      ? 'Atrasado'
                      : 'Ausente'}
                  </span>
                </div>
                {rec.attendance !== 'absent' && rec.mood && (
                  <p className="mt-1 text-xs text-gray-600">
                    {moodLabels[rec.mood] || rec.mood}
                  </p>
                )}
                {rec.notes && (
                  <p className="mt-1 text-xs italic text-gray-500">"{rec.notes}"</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">Nenhum registro</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-gray-400" />
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value || 'N/A'}</p>
      </div>
    </div>
  );
}

function ChildDetailDesktop({ child, dailyRecords, onUpdateChild }) {
  const childRecords = dailyRecords
    .filter(r => r.childInternalId === child.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const rate = calculateAttendanceRate(childRecords);
  const present = childRecords.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  const absent = childRecords.filter(r => r.attendance === 'absent').length;

  const statusMeta = getStatusMeta(child);
  const enrollmentHistory = parseEnrollmentHistory(child.enrollmentHistory);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [nextStatus, setNextStatus] = useState(statusMeta.status);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusFormData, setStatusFormData] = useState(() => buildStatusFormData(child));

  useEffect(() => {
    setStatusFormData(buildStatusFormData(child));
  }, [child]);

  const requiresTriage = ['em_triagem', 'aprovado', 'lista_espera', 'recusado', 'matriculado']
    .includes(nextStatus);
  const requiresMatricula = nextStatus === 'matriculado';
  const missingTriage = requiresTriage ? getMissingTriageFields(statusFormData) : [];
  const missingMatricula = requiresMatricula ? getMissingMatriculaFields(statusFormData) : [];

  const missingSet = new Set([...missingTriage, ...missingMatricula]);
  const fieldClass = field =>
    cn(
      'w-full rounded-lg border px-3 py-2 text-sm',
      missingSet.has(field) ? 'border-rose-300 focus:ring-rose-300' : 'border-gray-200'
    );

  const updateStatusField = (field, value) => {
    setStatusFormData(prev => ({ ...prev, [field]: value }));
  };

  const allowedStatusOptions = [
        { value: 'em_triagem', label: 'Em triagem' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'lista_espera', label: 'Lista de espera' },
    { value: 'matriculado', label: 'Matriculado' },
    { value: 'recusado', label: 'Não atendida' },
    { value: 'desistente', label: 'Desistente' },
    { value: 'inativo', label: 'Inativo' },
  ];

  const validateStatusTransition = status => {
    if (status === statusMeta.status) return 'Escolha um status diferente.';
    const missing = getMissingFieldsForStatus(status, statusFormData);
    if (missing.length) {
      return `Complete os campos obrigatórios: ${missing.join(', ')}.`;
    }
    if (status === 'recusado' && !statusNotes.trim()) {
      return 'Informe o motivo do não atendimento.';
    }
    if (status === 'desistente' && !statusNotes.trim()) {
      return 'Informe o motivo da desistência.';
    }
    return '';
  };

  const applyStatusChange = () => {
    const error = validateStatusTransition(nextStatus);
    if (error) {
      setStatusError(error);
      return;
    }
    setStatusError('');
    const now = new Date().toISOString();
    const updatedHistory = [
      ...enrollmentHistory,
      { date: now, action: nextStatus, notes: statusNotes.trim() || 'Atualização de status' },
    ];

    const updates = {
      enrollmentStatus: nextStatus,
      enrollmentHistory: updatedHistory,
    };

    if (requiresTriage) {
      updates.name = statusFormData.name.trim();
      updates.birthDate = statusFormData.birthDate;
      updates.guardianName = statusFormData.guardianName.trim();
      updates.guardianPhone = statusFormData.guardianPhone.trim();
      updates.neighborhood = statusFormData.neighborhood.trim();
      updates.school = statusFormData.school.trim();
      updates.schoolShift = statusFormData.schoolShift;
      updates.referralSource = statusFormData.referralSource;
      updates.schoolCommuteAlone = statusFormData.schoolCommuteAlone;
    }

    if (!child.enrollmentDate) updates.enrollmentDate = now;
    if (requiresTriage && !child.triageDate) updates.triageDate = now;

    if (requiresMatricula) {
      updates.startDate = statusFormData.startDate;
      updates.entryDate = statusFormData.startDate;
      updates.participationDays = statusFormData.participationDays;
      updates.authorizedPickup = statusFormData.authorizedPickup.trim();
      updates.canLeaveAlone = statusFormData.canLeaveAlone;
      updates.leaveAloneConsent =
        statusFormData.canLeaveAlone === 'sim' ? statusFormData.leaveAloneConsent : false;
      updates.leaveAloneConfirmation =
        statusFormData.canLeaveAlone === 'sim' ? statusFormData.leaveAloneConfirmation.trim() : '';
      updates.responsibilityTerm = statusFormData.termsAccepted;
      updates.consentTerm = statusFormData.termsAccepted;
      if (!child.matriculationDate) updates.matriculationDate = now;
    }

    if (onUpdateChild) onUpdateChild(child.id, updates);
    setShowStatusForm(false);
    setStatusNotes('');
  };

  return (
    <div className="grid grid-cols-[minmax(0,360px)_1fr] gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-indigo-100">
            <User size={40} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{child.name}</h2>
          <p className="text-gray-500">
            {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-indigo-50 p-3 text-center">
            <p className="text-xl font-bold text-indigo-600">{rate}%</p>
            <p className="text-xs text-indigo-600">Frequência</p>
          </div>
          <div className="rounded-xl bg-green-50 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{present}</p>
            <p className="text-xs text-green-600">Presenças</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3 text-center">
            <p className="text-xl font-bold text-red-600">{absent}</p>
            <p className="text-xs text-red-600">Faltas</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-gray-400">Status da matrícula</p>
              <span
                className={cn(
                  'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                  statusMeta.className
                )}
              >
                {statusMeta.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowStatusForm(prev => !prev);
                setStatusError('');
                setNextStatus(statusMeta.status);
                setStatusFormData(buildStatusFormData(child));
              }}
              className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
            >
              Alterar status
            </button>
          </div>

          {showStatusForm && (
            <div className="mt-4 space-y-3">
              <select
                value={nextStatus}
                onChange={e => setNextStatus(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                {allowedStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <textarea
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Notas da mudança de status"
              />
              {(requiresTriage || requiresMatricula) && (
                <div className="space-y-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">Dados obrigatórios</p>
                    {missingSet.size > 0 && (
                      <span className="text-xs font-semibold text-rose-600">
                        {missingSet.size} pendente(s)
                      </span>
                    )}
                  </div>

                  {requiresTriage && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500">Triagem</p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Nome completo</label>
                        <input
                          type="text"
                          value={statusFormData.name}
                          onChange={e => updateStatusField('name', e.target.value)}
                          className={fieldClass('name')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Data de nascimento</label>
                        <input
                          type="date"
                          value={statusFormData.birthDate}
                          onChange={e => updateStatusField('birthDate', e.target.value)}
                          className={fieldClass('birthDate')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Nome do responsável</label>
                        <input
                          type="text"
                          value={statusFormData.guardianName}
                          onChange={e => updateStatusField('guardianName', e.target.value)}
                          className={fieldClass('guardianName')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Telefone (WhatsApp)</label>
                        <input
                          type="tel"
                          value={statusFormData.guardianPhone}
                          onChange={e => updateStatusField('guardianPhone', e.target.value)}
                          className={fieldClass('guardianPhone')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Bairro/Comunidade</label>
                        <input
                          type="text"
                          value={statusFormData.neighborhood}
                          onChange={e => updateStatusField('neighborhood', e.target.value)}
                          className={fieldClass('neighborhood')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Escola</label>
                        <input
                          type="text"
                          value={statusFormData.school}
                          onChange={e => updateStatusField('school', e.target.value)}
                          className={fieldClass('school')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Turno escolar</label>
                        <select
                          value={statusFormData.schoolShift}
                          onChange={e => updateStatusField('schoolShift', e.target.value)}
                          className={fieldClass('schoolShift')}
                        >
                          <option value="">Selecione</option>
                          <option value="manhã">Manhã</option>
                          <option value="tarde">Tarde</option>
                          <option value="integral">Integral</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Como conheceu o Lumine?</label>
                        <select
                          value={statusFormData.referralSource}
                          onChange={e => updateStatusField('referralSource', e.target.value)}
                          className={fieldClass('referralSource')}
                        >
                          <option value="">Selecione</option>
                          <option value="igreja">Igreja</option>
                          <option value="escola">Escola</option>
                          <option value="CRAS">CRAS</option>
                          <option value="indicação">Indicação</option>
                          <option value="redes_sociais">Redes sociais</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Vai e volta desacompanhada da escola?
                        </label>
                        <select
                          value={statusFormData.schoolCommuteAlone}
                          onChange={e => updateStatusField('schoolCommuteAlone', e.target.value)}
                          className={fieldClass('schoolCommuteAlone')}
                        >
                          <option value="">Selecione</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {requiresMatricula && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500">Matrícula</p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Data de início</label>
                        <input
                          type="date"
                          value={statusFormData.startDate}
                          onChange={e => updateStatusField('startDate', e.target.value)}
                          className={fieldClass('startDate')}
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-700">Dias de participação</p>
                        <div className="flex flex-wrap gap-2">
                          {PARTICIPATION_DAYS.map(day => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() =>
                                updateStatusField(
                                  'participationDays',
                                  statusFormData.participationDays.includes(day.value)
                                    ? statusFormData.participationDays.filter(item => item !== day.value)
                                    : [...statusFormData.participationDays, day.value]
                                )
                              }
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium',
                                statusFormData.participationDays.includes(day.value)
                                  ? 'bg-indigo-600 text-white'
                                  : missingSet.has('participationDays')
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-gray-200 text-gray-600'
                              )}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Pessoas autorizadas a retirar
                        </label>
                        <input
                          type="text"
                          value={statusFormData.authorizedPickup}
                          onChange={e => updateStatusField('authorizedPickup', e.target.value)}
                          className={fieldClass('authorizedPickup')}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Pode sair desacompanhada?
                        </label>
                        <select
                          value={statusFormData.canLeaveAlone}
                          onChange={e => updateStatusField('canLeaveAlone', e.target.value)}
                          className={fieldClass('canLeaveAlone')}
                        >
                          <option value="">Selecione</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                      {statusFormData.canLeaveAlone === 'sim' && (
                        <div className="space-y-2 rounded-lg bg-white p-2">
                          <label className="flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={statusFormData.leaveAloneConsent}
                              onChange={e => updateStatusField('leaveAloneConsent', e.target.checked)}
                              className="h-4 w-4 rounded"
                            />
                            Autorizo a saída desacompanhada
                          </label>
                          <input
                            type="text"
                            value={statusFormData.leaveAloneConfirmation}
                            onChange={e => updateStatusField('leaveAloneConfirmation', e.target.value)}
                            placeholder="Confirmação da autorização"
                            className={fieldClass('leaveAloneConfirmation')}
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={statusFormData.termsAccepted}
                          onChange={e => updateStatusField('termsAccepted', e.target.checked)}
                          className="h-4 w-4 rounded"
                        />
                        Termo de Responsabilidade e Consentimento
                      </label>
                    </div>
                  )}
                </div>
              )}
              {statusError && <p className="text-pretty text-xs text-rose-600">{statusError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatusForm(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyStatusChange}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800">Informações</h3>
          <InfoRow icon={User} label="Responsável" value={child.guardianName} />
          <InfoRow icon={Phone} label="Telefone" value={child.guardianPhone} />
            {child.school && (
            <InfoRow
              icon={School}
              label="Escola"
              value={`${child.school}${child.grade ? ` - ${child.grade}` : ''}`}
            />
          )}
          <InfoRow icon={Clock} label="Entrada" value={formatDate(child.entryDate)} />
        </div>

              </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Histórico da matrícula</h3>
          <span className="text-xs text-gray-500">{enrollmentHistory.length} eventos</span>
        </div>
        <div className="mt-4 space-y-2">
          {enrollmentHistory.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
              Sem histórico registrado.
            </div>
          )}
          {enrollmentHistory
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((entry, index) => {
              const meta = ENROLLMENT_STATUS_META[entry.action] || {
                label: entry.action || 'Status',
                className: 'bg-gray-100 text-gray-600',
              };
              return (
                <div key={`${entry.date}-${index}`} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        meta.className
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                  </div>
                  {entry.notes && <p className="mt-2 text-xs text-gray-600">{entry.notes}</p>}
                </div>
              );
            })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Histórico</h3>
          <span className="text-xs text-gray-500">{childRecords.length} registros</span>
        </div>
        <div className="mt-4 max-h-[520px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Presença</th>
                <th className="px-3 py-2">Humor</th>
                <th className="px-3 py-2">Observações</th>
              </tr>
            </thead>
            <tbody>
              {childRecords.map(record => (
                <tr key={record.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{formatDate(record.date)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-semibold',
                        record.attendance === 'present'
                          ? 'bg-green-100 text-green-700'
                          : record.attendance === 'late'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      {record.attendance === 'present'
                        ? 'Presente'
                        : record.attendance === 'late'
                        ? 'Atrasado'
                        : 'Ausente'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {record.mood ? moodLabels[record.mood] || record.mood : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {record.notes ? record.notes : '—'}
                  </td>
                </tr>
              ))}
              {childRecords.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={4}>
                    Nenhum registro ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// REGISTRO DIÁRIO
// ============================================
function DailyRecordView({ children, dailyRecords, addDailyRecord }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [step, setStep] = useState('select');
  const [editingRecordId, setEditingRecordId] = useState('');
  const [form, setForm] = useState(getRecordFormDefaults());
  const [toastMessage, setToastMessage] = useState('');

  const activeChildren = children.filter(isMatriculated);
  const dateRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = dateRecords.map(r => r.childInternalId);
  const pending = activeChildren.filter(c => !recordedIds.includes(c.id));
  const selectedChild =
    children.find(c => c.id === selectedChildId) ||
    activeChildren.find(c => c.id === selectedChildId);

  const showToast = message => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 1500);
  };

  const clearEditing = () => {
    setEditingRecordId('');
    setSelectedChildId('');
    setStep('select');
    setForm(getRecordFormDefaults());
  };

  useEffect(() => {
    clearEditing();
  }, [date]);

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
    setTimeout(() => {
      clearEditing();
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Toast de sucesso */}
      {toastMessage && (
        <div
          className="fixed left-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-white shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 5rem)' }}
        >
          <CheckCircle size={20} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Seletor de data */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">Data do registro</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Status do dia */}
      <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-4">
        <div>
          <p className="text-sm font-medium text-indigo-800">Registros hoje</p>
          <p className="text-2xl font-bold text-indigo-600">
            {dateRecords.length}/{activeChildren.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-indigo-600">{pending.length} pendentes</p>
        </div>
      </div>

      {step === 'select' && (
        <>
          {dateRecords.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Registros do dia</h3>
                <span className="text-xs text-gray-500">{dateRecords.length} registros</span>
              </div>
              <div className="space-y-2">
                {dateRecords.map(record => {
                  const child = children.find(c => c.id === record.childInternalId);
                  const label = child?.name || 'Criança';
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleEditRecord(record)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left"
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
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-800">Registro rápido</h3>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {pending.map(child => (
                  <div key={child.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
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
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-800">Registro detalhado</h3>
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="mb-3 w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
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
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:bg-gray-300"
            >
              Continuar
            </button>
          </div>
        </>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          {/* Criança selecionada */}
          <div className="flex items-center justify-between rounded-xl bg-indigo-100 p-4">
            <div>
              <p className="text-sm text-indigo-600">Registrando para</p>
              <p className="font-bold text-indigo-800">{selectedChild?.name || 'Criança'}</p>
              {editingRecordId && (
                <span className="mt-1 inline-flex rounded-full bg-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-700">
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
              className="text-indigo-600"
              aria-label="Voltar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Bloco 1: Presença */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h4 className="mb-3 font-medium text-gray-800">Presença</h4>
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
                    'rounded-xl py-3 text-sm font-medium transition-all',
                    form.attendance === opt.value
                      ? opt.color === 'green'
                        ? 'bg-green-500 text-white'
                        : opt.color === 'yellow'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bloco 2: Detalhes (só se presente/atrasado) */}
          {form.attendance !== 'absent' && (
            <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
              <h4 className="font-medium text-gray-800">Detalhes</h4>

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
                        'rounded-xl py-3 text-2xl transition-all',
                        form.mood === opt.value
                          ? 'bg-indigo-100 ring-2 ring-indigo-500'
                          : 'bg-gray-100'
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
                  className="w-full rounded-xl border px-4 py-3"
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
                  className="w-full rounded-xl border px-4 py-3"
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
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Ex: Leitura, Arte, Jogo..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600">Desempenho</label>
                <select
                  value={form.performance}
                  onChange={e => setForm({ ...form, performance: e.target.value })}
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
            </div>
          )}

          {/* Bloco 3: Observações */}
          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <h4 className="font-medium text-gray-800">Observações</h4>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Algo importante..."
              className="w-full rounded-xl border px-4 py-3"
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
                className="w-full rounded-xl border px-4 py-3"
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
            className="w-full rounded-xl bg-green-600 py-4 font-semibold text-white shadow-lg"
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
  const [selectedChildId, setSelectedChildId] = useState('');
  const [editingRecordId, setEditingRecordId] = useState('');
  const [form, setForm] = useState(getRecordFormDefaults());
  const [toastMessage, setToastMessage] = useState('');

  const activeChildren = children.filter(isMatriculated);
  const dateRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = dateRecords.map(r => r.childInternalId);
  const pending = activeChildren.filter(c => !recordedIds.includes(c.id));
  const selectedChild =
    children.find(c => c.id === selectedChildId) ||
    activeChildren.find(c => c.id === selectedChildId);

  const showToast = message => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 1200);
  };

  const clearEditing = () => {
    setEditingRecordId('');
    setSelectedChildId('');
    setForm(getRecordFormDefaults());
  };

  useEffect(() => {
    clearEditing();
  }, [date]);

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
    setTimeout(() => {
      clearEditing();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div
          className="fixed right-10 z-50 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 6rem)' }}
        >
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase text-gray-400">Registro diário</p>
          <p className="text-sm text-gray-600">
            {dateRecords.length}/{activeChildren.length} registrados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500">Data</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,360px)_1fr] gap-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Pendentes</h3>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
              {pending.length} pendentes
            </span>
          </div>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-auto">
            {pending.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                Nenhuma pendência para esta data.
              </div>
            )}
            {pending.map(child => (
              <div
                key={child.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2',
                  selectedChildId === child.id ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'
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
                <h4 className="text-sm font-semibold text-gray-800">Registros do dia</h4>
                <span className="text-xs text-gray-500">{dateRecords.length} registros</span>
              </div>
              <div className="max-h-[260px] space-y-2 overflow-auto">
                {dateRecords.map(record => {
                  const child = children.find(c => c.id === record.childInternalId);
                  const label = child?.name || 'Criança';
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleEditRecord(record)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-left"
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

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-400">Detalhes</p>
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedChild ? selectedChild.name : 'Selecione uma criança'}
              </h3>
              {editingRecordId && (
                <span className="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                  Editando registro
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {editingRecordId && (
                <button
                  type="button"
                  onClick={clearEditing}
                  className="text-xs font-semibold text-indigo-600"
                >
                  Cancelar edição
                </button>
              )}
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
              <label className="text-xs font-semibold text-gray-500">Presença</label>
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
                      'rounded-xl py-2 text-xs font-semibold',
                      form.attendance === option.value
                        ? option.color === 'green'
                          ? 'bg-green-500 text-white'
                          : option.color === 'yellow'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
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
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
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
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:bg-gray-300"
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
    <div className={cn('space-y-3 rounded-xl bg-white p-4 shadow-sm', className)}>
      <div>
        <h3 className="text-balance text-base font-semibold text-gray-800">Guia rápida (3 passos)</h3>
        <p className="text-pretty mt-1 text-sm text-gray-500">
          Reabra o checklist sempre que tiver dúvida.
        </p>
      </div>
      <ol className="space-y-2 text-pretty text-sm text-gray-600">
        <li className="flex gap-2">
          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold tabular-nums text-indigo-700">
            1
          </span>
          <span className="text-pretty">Triagem: cadastre o básico e defina o status da criança.</span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold tabular-nums text-indigo-700">
            2
          </span>
          <span className="text-pretty">Matrícula: preencha início, dias de participação e responsável.</span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold tabular-nums text-indigo-700">
            3
          </span>
          <span className="text-pretty">Sincronização: baixe antes se o servidor estiver mais recente.</span>
        </li>
      </ol>
      <button
        onClick={handleOnboardingOpen}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white"
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
                <button className="flex-1 rounded-xl bg-gray-100 py-3 font-medium">
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                onClick={() => confirmAction?.()}
                className="flex-1 rounded-xl bg-indigo-600 py-3 font-medium text-white"
              >
                Confirmar
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="space-y-4 lg:hidden">
        {/* Sincronização */}
      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn('size-3 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-500')} />
          <h3 className="font-semibold text-gray-800">Sincronização</h3>
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
            className="flex items-center justify-center gap-2 rounded-xl bg-green-100 py-3 font-medium text-green-700 disabled:opacity-50"
          >
            <Upload size={18} />
            Enviar
          </button>
          <button
            onClick={downloadFromServer}
            disabled={!isOnline}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-100 py-3 font-medium text-blue-700 disabled:opacity-50"
          >
            <Download size={18} />
            Baixar
          </button>
        </div>
      </div>

      {/* Modo revisão */}
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Modo revisão</h3>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={reviewMode}
              onChange={e => setReviewMode(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600"
            />
          </label>
        </div>
        <p className="text-sm text-gray-500">
          Quando ativo, o app não faz overwrite automático. Use o botão Sync quando estiver pronto.
        </p>
      </div>

      {renderOnboardingCard()}

      {/* Backup */}
      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800">Backup Local</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportJSON}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-100 py-3 font-medium text-indigo-700"
          >
            <Download size={18} />
            Exportar
          </button>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-medium text-gray-700">
            <Upload size={18} />
            Importar
            <input type="file" accept=".json" onChange={importJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Segurança */}
      <div className="space-y-3 rounded-xl bg-rose-50 p-4 shadow-sm">
        <h3 className="font-semibold text-rose-700">Segurança</h3>
        <p className="text-sm text-rose-600">Remove todas as crianças e registros deste dispositivo.</p>
        <ClearLocalDataDialog
          onConfirm={clearLocalData}
          triggerClassName="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white"
        />
      </div>

      {/* Relatório Mensal em Cards */}
      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800">Relatório Mensal</h3>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
        />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-indigo-50 p-3">
            <p className="text-lg font-bold text-indigo-600">{activeChildren.length}</p>
            <p className="text-xs text-indigo-600">Crianças</p>
          </div>
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-lg font-bold text-green-600">
              {[...new Set(monthRecords.map(r => r.date?.split('T')[0]))].length}
            </p>
            <p className="text-xs text-green-600">Dias</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-lg font-bold text-amber-600">
              {monthRecords.filter(r => r.attendance !== 'absent').length}
            </p>
            <p className="text-xs text-amber-600">Refeições</p>
          </div>
        </div>

        {/* Cards por criança */}
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {childStats.map(child => (
            <div key={child.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
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
                      child.rate >= 80
                        ? 'bg-green-500'
                        : child.rate >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                    style={{ width: `${child.rate}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'w-10 text-right text-sm font-bold',
                    child.rate >= 80
                      ? 'text-green-600'
                      : child.rate >= 60
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
      <div className="rounded-xl bg-gray-100 p-4 text-center">
        <p className="text-sm text-gray-500">
          {children.length} crianças • {dailyRecords.length} registros
        </p>
        <p className="mt-1 text-xs text-gray-400">Instituto Lumine v3.0</p>
      </div>
      </div>

      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-500')} />
                <h3 className="font-semibold text-gray-800">Sincronização</h3>
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
                className="flex items-center justify-center gap-2 rounded-xl bg-green-100 py-2 text-sm font-semibold text-green-700 disabled:opacity-50"
              >
                <Upload size={16} />
                Enviar
              </button>
              <button
                onClick={downloadFromServer}
                disabled={!isOnline}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-100 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
              >
                <Download size={16} />
                Baixar
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800">Backup Local</h3>
            <p className="mt-2 text-sm text-gray-500">Exporte ou restaure um arquivo JSON.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={exportJSON}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-100 py-2 text-sm font-semibold text-indigo-700"
              >
                <Download size={16} />
                Exportar
              </button>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700">
                <Upload size={16} />
                Importar
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800">Relatório Mensal</h3>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-indigo-50 p-3">
                <p className="text-lg font-bold text-indigo-600">{activeChildren.length}</p>
                <p className="text-xs text-indigo-600">Crianças</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-lg font-bold text-green-600">{monthDays}</p>
                <p className="text-xs text-green-600">Dias</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-lg font-bold text-amber-600">{monthMeals}</p>
                <p className="text-xs text-amber-600">Refeições</p>
              </div>
            </div>
          </div>
        </div>

        {renderOnboardingCard('rounded-2xl p-5')}

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Modo revisão</h3>
              <p className="mt-1 text-sm text-gray-500">
                Quando ativo, o app não faz overwrite automático. Use o botão Sync quando estiver pronto.
              </p>
            </div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={reviewMode}
                onChange={e => setReviewMode(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-rose-700">Segurança</h3>
              <p className="mt-1 text-sm text-rose-600">
                Remove todas as crianças e registros deste dispositivo.
              </p>
            </div>
            <ClearLocalDataDialog
              onConfirm={clearLocalData}
              triggerClassName="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
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
                        child.rate >= 80
                          ? 'bg-green-100 text-green-700'
                          : child.rate >= 60
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
                    Nenhum dado disponível para este mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl bg-gray-100 p-4 text-center text-sm text-gray-500">
          {children.length} crianças • {dailyRecords.length} registros
          <p className="mt-1 text-xs text-gray-400">Instituto Lumine v3.0</p>
        </div>
      </div>
    </div>
  );
}

function ClearLocalDataDialog({ onConfirm, triggerClassName }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button className={triggerClassName}>Sair e limpar dados deste dispositivo</button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6">
          <AlertDialog.Title className="text-lg font-bold">Confirmar</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600">
            Isso vai apagar todos os dados locais. Os dados no servidor não serão afetados.
          </AlertDialog.Description>
          <div className="mt-6 flex gap-3">
            <AlertDialog.Cancel asChild>
              <button className="flex-1 rounded-xl bg-gray-100 py-3 font-medium">
                Cancelar
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-rose-600 py-3 font-medium text-white"
              >
                Confirmar e limpar
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export { DailyRecordView, DailyRecordDesktop, ConfigView };
