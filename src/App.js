// ============================================
// INSTITUTO LUMINE - SISTEMA DE ACOMPANHAMENTO
// Versão 2.0 com Sincronização Google Sheets
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Users,
  FileText,
  Settings,
  Plus,
  ChevronLeft,
  Search,
  Download,
  Upload,
  Cloud,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ============================================
// ⚠️ CONFIGURAÇÃO - ALTERE ESTA URL!
// ============================================
const API_URL = 'https://COLOQUE-SUA-URL-AQUI.vercel.app/api/sync';
// Após fazer deploy da API no Vercel, substitua pela URL correta
// Exemplo: https://lumine-api.vercel.app/api/sync
// ============================================

function calculateAge(birthDate) {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const safe = dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr;
  const date = new Date(safe);
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR');
}

function calculateAttendanceRate(records) {
  if (!records.length) return 0;
  const present = records.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  return Math.round((present / records.length) * 100);
}

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      setStoredValue(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  return [storedValue, setValue];
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'children', label: 'Crianças', icon: Users },
  { id: 'records', label: 'Registro', icon: Calendar },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'settings', label: 'Config', icon: Settings },
];

const attendanceLabels = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Atrasado',
};

const moodLabels = {
  happy: 'Feliz',
  neutral: 'Ok',
  sad: 'Triste',
};

const participationLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

const interactionLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

const performanceLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export default function LumineTracker() {
  const todayKey = new Date().toISOString().split('T')[0];

  const [view, setView] = useState('dashboard');
  const [children, setChildren] = useLocalStorage('lumine_children', []);
  const [dailyRecords, setDailyRecords] = useLocalStorage('lumine_records', []);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChildForm, setShowChildForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(true);

  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useLocalStorage('lumine_last_sync', null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);

  const [childForm, setChildForm] = useState({
    name: '',
    birthDate: '',
    entryDate: todayKey,
    guardianName: '',
    guardianPhone: '',
    guardianPhoneAlt: '',
    address: '',
    school: '',
    grade: '',
    initialObservations: '',
    status: 'active',
  });

  const [recordForm, setRecordForm] = useState({
    childId: '',
    date: todayKey,
    attendance: 'present',
    participation: 'medium',
    mood: 'neutral',
    interaction: 'medium',
    activity: '',
    performance: 'medium',
    notes: '',
    familyContact: 'no',
    contactReason: '',
  });

  const [reportMonth, setReportMonth] = useState(todayKey.slice(0, 7));
  const selectedChild = children.find(child => child.id === selectedChildId) || null;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncWithServer = useCallback(
    async (showFeedback = true) => {
      if (!isOnline) {
        if (showFeedback) {
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 2000);
        }
        return;
      }

      setSyncStatus('syncing');

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync',
            data: { children, records: dailyRecords },
          }),
        });

        if (!response.ok) throw new Error('Erro na sincronização');

        const result = await response.json();

        if (result.success) {
          setLastSync(new Date().toISOString());
          setPendingChanges(0);
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Erro na sincronização:', error);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    },
    [children, dailyRecords, isOnline, setLastSync]
  );

  const downloadFromServer = useCallback(async () => {
    if (!isOnline) return;

    setSyncStatus('syncing');

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Erro ao baixar dados');

      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.children && result.data.children.length > 0) {
          setChildren(result.data.children);
        }
        if (result.data.records && result.data.records.length > 0) {
          setDailyRecords(result.data.records);
        }
        setLastSync(new Date().toISOString());
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Erro ao baixar dados:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [isOnline, setChildren, setDailyRecords, setLastSync]);

  useEffect(() => {
    if (isOnline && (children.length > 0 || dailyRecords.length > 0)) {
      const interval = setInterval(() => {
        syncWithServer(false);
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }

    return undefined;
  }, [isOnline, children.length, dailyRecords.length, syncWithServer]);

  const addChild = async childData => {
    const newChild = {
      ...childData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: childData.status || 'active',
    };
    setChildren([...children, newChild]);
    setPendingChanges(prev => prev + 1);

    if (isOnline) {
      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addChild', data: newChild }),
        });
      } catch (error) {
        console.log('Salvo localmente');
      }
    }
  };

  const updateChild = (childId, updatedData) => {
    setChildren(children.map(c => (c.id === childId ? { ...c, ...updatedData } : c)));
    setPendingChanges(prev => prev + 1);
  };

  const addDailyRecord = async recordData => {
    const newRecord = {
      ...recordData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setDailyRecords([...dailyRecords, newRecord]);
    setPendingChanges(prev => prev + 1);

    if (isOnline) {
      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addRecord', data: newRecord }),
        });
      } catch (error) {
        console.log('Salvo localmente');
      }
    }
  };

  const filteredChildren = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return children;
    return children.filter(child => {
      return (
        child.name?.toLowerCase().includes(term) ||
        child.guardianName?.toLowerCase().includes(term) ||
        child.school?.toLowerCase().includes(term)
      );
    });
  }, [children, searchTerm]);

  const todayRecords = useMemo(() => {
    return dailyRecords.filter(record => record.date === todayKey);
  }, [dailyRecords, todayKey]);

  const presentToday = todayRecords.filter(
    record => record.attendance === 'present' || record.attendance === 'late'
  ).length;
  const absentToday = todayRecords.filter(record => record.attendance === 'absent').length;
  const mealsToday = presentToday;

  const monthRecords = useMemo(() => {
    return dailyRecords.filter(record => record.date?.startsWith(reportMonth));
  }, [dailyRecords, reportMonth]);

  const monthAttendanceRate = calculateAttendanceRate(monthRecords);

  const reportRows = useMemo(() => {
    return children.map(child => {
      const childRecords = monthRecords.filter(record => record.childId === child.id);
      const total = childRecords.length;
      const present = childRecords.filter(
        record => record.attendance === 'present' || record.attendance === 'late'
      ).length;
      return {
        ...child,
        total,
        present,
        rate: total ? Math.round((present / total) * 100) : 0,
      };
    });
  }, [children, monthRecords]);

  const recentRecords = useMemo(() => {
    return [...dailyRecords]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);
  }, [dailyRecords]);

  const handleChildSubmit = event => {
    event.preventDefault();
    if (!childForm.name.trim()) return;
    addChild(childForm);
    setChildForm({
      name: '',
      birthDate: '',
      entryDate: todayKey,
      guardianName: '',
      guardianPhone: '',
      guardianPhoneAlt: '',
      address: '',
      school: '',
      grade: '',
      initialObservations: '',
      status: 'active',
    });
    setShowChildForm(false);
  };

  const handleRecordSubmit = event => {
    event.preventDefault();
    if (!recordForm.childId || !recordForm.date) return;
    addDailyRecord(recordForm);
    setRecordForm({
      childId: '',
      date: todayKey,
      attendance: 'present',
      participation: 'medium',
      mood: 'neutral',
      interaction: 'medium',
      activity: '',
      performance: 'medium',
      notes: '',
      familyContact: 'no',
      contactReason: '',
    });
    setShowRecordForm(false);
  };

  const exportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      lastSync,
      children,
      records: dailyRecords,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lumine-backup-${todayKey}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.children)) {
          setChildren(data.children);
        }
        if (Array.isArray(data.records)) {
          setDailyRecords(data.records);
        }
        if (data.lastSync) {
          setLastSync(data.lastSync);
        }
      } catch (error) {
        console.error('Backup inválido', error);
      }
    };
    reader.readAsText(file);
  };

  const clearLocalData = () => {
    const confirmed = window.confirm('Tem certeza que deseja apagar os dados locais?');
    if (!confirmed) return;
    setChildren([]);
    setDailyRecords([]);
    setPendingChanges(0);
    setLastSync(null);
  };

  const syncStatusConfig = {
    idle: { label: 'Em espera', icon: Cloud, color: 'text-slate-500' },
    syncing: { label: 'Sincronizando', icon: RefreshCw, color: 'text-amber-600' },
    success: { label: 'Sincronizado', icon: CheckCircle, color: 'text-emerald-600' },
    error: { label: 'Falha na sync', icon: AlertTriangle, color: 'text-rose-600' },
  };

  const statusInfo = syncStatusConfig[syncStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(249, 250, 251, 0.9), rgba(239, 246, 255, 0.6)), radial-gradient(circle at 20% 20%, rgba(254, 243, 199, 0.55), transparent 55%), radial-gradient(circle at 90% 10%, rgba(186, 230, 253, 0.45), transparent 45%)',
      }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 right-[-80px] h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute top-40 left-[-120px] h-72 w-72 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute bottom-20 right-[-120px] h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 rounded-3xl bg-white/70 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Instituto Lumine</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Sistema de Acompanhamento
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Dashboard, registros diários e sincronização com Google Sheets
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-emerald-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-rose-500" />
                )}
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={() => syncWithServer(true)}
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                />
                Sincronizar
              </button>
            </div>
          </header>

          <section className="flex flex-col gap-3 rounded-3xl bg-white/70 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                {pendingChanges > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {pendingChanges} pendentes
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Última sync: {lastSync ? formatDateTime(lastSync) : 'Nenhuma'}</span>
                <span className="hidden sm:inline">API: {API_URL}</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:flex-row sm:justify-center sm:text-sm ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-transparent bg-white/70 text-slate-500 hover:border-slate-200 hover:bg-white'
                    }`}
                    onClick={() => setView(tab.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </section>

          {view === 'dashboard' && (
            <main className="grid gap-6">
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Presentes hoje',
                    value: presentToday,
                    icon: CheckCircle,
                    tone: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    label: 'Ausentes hoje',
                    value: absentToday,
                    icon: XCircle,
                    tone: 'bg-rose-50 text-rose-700',
                  },
                  {
                    label: 'Crianças ativas',
                    value: children.filter(child => child.status !== 'inactive').length,
                    icon: Users,
                    tone: 'bg-sky-50 text-sky-700',
                  },
                  {
                    label: 'Refeições hoje',
                    value: mealsToday,
                    icon: Cloud,
                    tone: 'bg-amber-50 text-amber-700',
                  },
                ].map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className="reveal rounded-3xl border border-white/50 bg-white/80 p-4 shadow-sm backdrop-blur"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${card.tone}`}>
                        <Icon className="h-4 w-4" />
                        {card.label}
                      </div>
                      <div className="mt-4 text-3xl font-semibold text-slate-900">{card.value}</div>
                      <p className="mt-1 text-xs text-slate-500">Atualizado hoje</p>
                    </div>
                  );
                })}
              </section>

              <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Atividade recente</h2>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      onClick={() => setView('records')}
                    >
                      Ver registros
                      <ChevronLeft className="h-4 w-4 rotate-180" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {recentRecords.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        Nenhum registro recente ainda.
                      </div>
                    )}
                    {recentRecords.map(record => {
                      const child = children.find(c => c.id === record.childId);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {child ? child.name : 'Criança removida'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(record.date)} · {attendanceLabels[record.attendance] || 'Sem status'}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {record.mood ? moodLabels[record.mood] || record.mood : 'Humor n/d'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                    <h2 className="text-lg font-semibold text-slate-900">Resumo mensal</h2>
                    <p className="mt-1 text-sm text-slate-500">Taxa média de presença</p>
                    <div className="mt-4 flex items-end gap-4">
                      <span className="text-4xl font-semibold text-slate-900">
                        {monthAttendanceRate}%
                      </span>
                      <span className="text-xs text-slate-500">
                        {reportMonth}
                      </span>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${monthAttendanceRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                    <h2 className="text-lg font-semibold text-slate-900">Ações rápidas</h2>
                    <div className="mt-3 grid gap-2 text-sm">
                      <button
                        type="button"
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:border-slate-300"
                        onClick={() => setView('children')}
                      >
                        Nova criança
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:border-slate-300"
                        onClick={() => setView('records')}
                      >
                        Novo registro
                        <Calendar className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:border-slate-300"
                        onClick={downloadFromServer}
                      >
                        Baixar do servidor
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </main>
          )}

          {view === 'children' && (
            <main className="grid gap-6">
              <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Cadastro de crianças</h2>
                    <p className="text-sm text-slate-500">Gerencie informações e status</p>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                    onClick={() => setShowChildForm(prev => !prev)}
                  >
                    <Plus className="h-4 w-4" />
                    {showChildForm ? 'Fechar' : 'Adicionar'}
                  </button>
                </div>

                {showChildForm && (
                  <form className="mt-5 grid gap-4" onSubmit={handleChildSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Nome completo"
                        value={childForm.name}
                        onChange={event =>
                          setChildForm({ ...childForm, name: event.target.value })
                        }
                        required
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        type="date"
                        value={childForm.birthDate}
                        onChange={event =>
                          setChildForm({ ...childForm, birthDate: event.target.value })
                        }
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        type="date"
                        value={childForm.entryDate}
                        onChange={event =>
                          setChildForm({ ...childForm, entryDate: event.target.value })
                        }
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Responsável"
                        value={childForm.guardianName}
                        onChange={event =>
                          setChildForm({ ...childForm, guardianName: event.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Telefone"
                        value={childForm.guardianPhone}
                        onChange={event =>
                          setChildForm({ ...childForm, guardianPhone: event.target.value })
                        }
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Telefone alternativo"
                        value={childForm.guardianPhoneAlt}
                        onChange={event =>
                          setChildForm({ ...childForm, guardianPhoneAlt: event.target.value })
                        }
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Endereço"
                        value={childForm.address}
                        onChange={event =>
                          setChildForm({ ...childForm, address: event.target.value })
                        }
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Escola"
                        value={childForm.school}
                        onChange={event =>
                          setChildForm({ ...childForm, school: event.target.value })
                        }
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Série"
                        value={childForm.grade}
                        onChange={event => setChildForm({ ...childForm, grade: event.target.value })}
                      />
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={childForm.status}
                        onChange={event => setChildForm({ ...childForm, status: event.target.value })}
                      >
                        <option value="active">Ativa</option>
                        <option value="inactive">Inativa</option>
                      </select>
                    </div>
                    <textarea
                      className="min-h-[110px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      placeholder="Observações iniciais"
                      value={childForm.initialObservations}
                      onChange={event =>
                        setChildForm({ ...childForm, initialObservations: event.target.value })
                      }
                    />
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Salvar criança
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Lista de crianças</h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full rounded-full border border-slate-200 bg-white px-9 py-2 text-sm"
                      placeholder="Buscar por nome"
                      value={searchTerm}
                      onChange={event => setSearchTerm(event.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredChildren.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      Nenhuma criança cadastrada ainda.
                    </div>
                  )}
                  {filteredChildren.map(child => (
                    <button
                      key={child.id}
                      type="button"
                      className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200"
                      onClick={() => setSelectedChildId(child.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{child.name}</p>
                          <p className="text-xs text-slate-500">
                            {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            child.status === 'inactive'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {child.status === 'inactive' ? 'Inativa' : 'Ativa'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <p>Responsável: {child.guardianName || 'N/D'}</p>
                        <p>Escola: {child.school || 'N/D'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </main>
          )}

          {view === 'records' && (
            <main className="grid gap-6">
              <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Registro diário</h2>
                    <p className="text-sm text-slate-500">Acompanhe presença e observações</p>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                    onClick={() => setShowRecordForm(prev => !prev)}
                  >
                    <Plus className="h-4 w-4" />
                    {showRecordForm ? 'Fechar' : 'Novo registro'}
                  </button>
                </div>

                {showRecordForm && (
                  <form className="mt-5 grid gap-4" onSubmit={handleRecordSubmit}>
                    <div className="grid gap-4 md:grid-cols-3">
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={recordForm.childId}
                        onChange={event =>
                          setRecordForm({ ...recordForm, childId: event.target.value })
                        }
                        required
                      >
                        <option value="">Selecione a criança</option>
                        {children.map(child => (
                          <option key={child.id} value={child.id}>
                            {child.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        type="date"
                        value={recordForm.date}
                        onChange={event =>
                          setRecordForm({ ...recordForm, date: event.target.value })
                        }
                        required
                      />
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={recordForm.attendance}
                        onChange={event =>
                          setRecordForm({ ...recordForm, attendance: event.target.value })
                        }
                      >
                        <option value="present">Presente</option>
                        <option value="late">Atrasado</option>
                        <option value="absent">Ausente</option>
                      </select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={recordForm.mood}
                        onChange={event => setRecordForm({ ...recordForm, mood: event.target.value })}
                      >
                        <option value="happy">Feliz</option>
                        <option value="neutral">Ok</option>
                        <option value="sad">Triste</option>
                      </select>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={recordForm.participation}
                        onChange={event =>
                          setRecordForm({ ...recordForm, participation: event.target.value })
                        }
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={recordForm.interaction}
                        onChange={event =>
                          setRecordForm({ ...recordForm, interaction: event.target.value })
                        }
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Atividade"
                        value={recordForm.activity}
                        onChange={event =>
                          setRecordForm({ ...recordForm, activity: event.target.value })
                        }
                      />
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={recordForm.performance}
                        onChange={event =>
                          setRecordForm({ ...recordForm, performance: event.target.value })
                        }
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        value={recordForm.familyContact}
                        onChange={event =>
                          setRecordForm({ ...recordForm, familyContact: event.target.value })
                        }
                      >
                        <option value="no">Sem contato familiar</option>
                        <option value="yes">Contato feito</option>
                      </select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Motivo do contato (se houver)"
                        value={recordForm.contactReason}
                        onChange={event =>
                          setRecordForm({ ...recordForm, contactReason: event.target.value })
                        }
                      />
                      <textarea
                        className="min-h-[110px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Observações"
                        value={recordForm.notes}
                        onChange={event =>
                          setRecordForm({ ...recordForm, notes: event.target.value })
                        }
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Salvar registro
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Registros do dia</h2>
                  <input
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
                    type="date"
                    value={recordForm.date}
                    onChange={event =>
                      setRecordForm({ ...recordForm, date: event.target.value })
                    }
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {dailyRecords
                    .filter(record => record.date === recordForm.date)
                    .map(record => {
                      const child = children.find(c => c.id === record.childId);
                      return (
                        <div
                          key={record.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {child ? child.name : 'Criança removida'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {attendanceLabels[record.attendance] || 'Sem status'} ·{' '}
                              {record.mood ? moodLabels[record.mood] : 'Humor n/d'}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {record.participation
                              ? participationLabels[record.participation]
                              : 'Participação n/d'}
                          </span>
                        </div>
                      );
                    })}
                  {dailyRecords.filter(record => record.date === recordForm.date).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      Nenhum registro para esta data.
                    </div>
                  )}
                </div>
              </section>
            </main>
          )}

          {view === 'reports' && (
            <main className="grid gap-6">
              <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Relatórios mensais</h2>
                    <p className="text-sm text-slate-500">Frequência por criança</p>
                  </div>
                  <input
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
                    type="month"
                    value={reportMonth}
                    onChange={event => setReportMonth(event.target.value)}
                  />
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Criança</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Presentes</th>
                        <th className="px-4 py-3">Frequência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map(child => (
                        <tr key={child.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">{child.name}</td>
                          <td className="px-4 py-3 text-slate-600">{child.total}</td>
                          <td className="px-4 py-3 text-slate-600">{child.present}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                              {child.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {reportRows.length === 0 && (
                        <tr>
                          <td className="px-4 py-4 text-sm text-slate-500" colSpan={4}>
                            Nenhum dado disponível para este mês.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          )}

          {view === 'settings' && (
            <main className="grid gap-6">
              <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Sincronização</h2>
                <p className="text-sm text-slate-500">Controle de conexão e backup</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
                    onClick={() => syncWithServer(true)}
                  >
                    Enviar para servidor
                    <Upload className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
                    onClick={downloadFromServer}
                  >
                    Baixar do servidor
                    <Download className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                  API atual: {API_URL}
                </div>
              </section>

              <section className="rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Backup local</h2>
                <p className="text-sm text-slate-500">Exporte ou restaure dados em JSON</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
                    onClick={exportBackup}
                  >
                    Exportar backup
                    <Download className="h-4 w-4" />
                  </button>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300">
                    Importar backup
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={importBackup}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                  onClick={clearLocalData}
                >
                  Limpar dados locais
                </button>
              </section>
            </main>
          )}
        </div>
      </div>

      {selectedChild && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
              onClick={() => setSelectedChildId(null)}
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{selectedChild.name}</h2>
                <p className="text-sm text-slate-500">
                  {selectedChild.birthDate ? `${calculateAge(selectedChild.birthDate)} anos` : 'Idade n/d'}
                  {selectedChild.school ? ` · ${selectedChild.school}` : ''}
                </p>
              </div>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                value={selectedChild.status}
                onChange={event => updateChild(selectedChild.id, { status: event.target.value })}
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-xs uppercase text-slate-400">Responsável</p>
                <p className="font-semibold text-slate-800">
                  {selectedChild.guardianName || 'Não informado'}
                </p>
                <p className="text-xs text-slate-500">{selectedChild.guardianPhone || 'Telefone n/d'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-xs uppercase text-slate-400">Endereço</p>
                <p className="font-semibold text-slate-800">
                  {selectedChild.address || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-900">Histórico</h3>
              <div className="mt-3 space-y-3">
                {dailyRecords
                  .filter(record => record.childId === selectedChild.id)
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .map(record => (
                    <div
                      key={record.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(record.date)}</p>
                        <p className="text-xs text-slate-500">
                          {attendanceLabels[record.attendance] || 'Sem status'} ·{' '}
                          {record.mood ? moodLabels[record.mood] : 'Humor n/d'}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {record.participation
                          ? participationLabels[record.participation]
                          : 'Participação n/d'}
                      </span>
                    </div>
                  ))}
                {dailyRecords.filter(record => record.childId === selectedChild.id).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    Nenhum registro para esta criança ainda.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
