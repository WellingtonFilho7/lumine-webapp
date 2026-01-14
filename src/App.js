// ============================================
// INSTITUTO LUMINE - SISTEMA DE ACOMPANHAMENTO
// Versão 3.0 - UX/UI Otimizada para Mobile
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
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
  MapPin,
  School,
  Clock,
} from 'lucide-react';

// ============================================
// CONFIGURAÇÃO
// ============================================
const API_URL = 'https://lumine-api-7qnj.vercel.app/api/sync';

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
      setStoredValue(value);
      localStorage.setItem(key, JSON.stringify(value));
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [showFABMenu, setShowFABMenu] = useState(false);

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

  // Sync com servidor
  const syncWithServer = useCallback(async (payload = null) => {
    if (!isOnline) {
      setSyncError('Sem conexão');
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }
    setSyncStatus('syncing');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
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
        const message = result?.error || result?.details || `Erro HTTP ${res.status}`;
        throw new Error(message);
      }
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
  }, [children, dailyRecords, isOnline, setLastSync]);

  // Download do servidor
  const downloadFromServer = useCallback(async () => {
    if (!isOnline) return;
    setSyncStatus('syncing');
    setSyncError('');
    try {
      const res = await fetch(API_URL);
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
        if (Array.isArray(result.data.children)) setChildren(result.data.children);
        if (Array.isArray(result.data.records)) setDailyRecords(result.data.records);
      }
      setLastSync(new Date().toISOString());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      const message = error?.message || 'Erro ao baixar dados';
      setSyncError(message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [isOnline, setChildren, setDailyRecords, setLastSync]);

  // Auto-sync a cada 5 min
  useEffect(() => {
    if (isOnline && (children.length > 0 || dailyRecords.length > 0)) {
      const interval = setInterval(() => syncWithServer(), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isOnline, children.length, dailyRecords.length, syncWithServer]);

  // Adicionar criança
  const addChild = async data => {
    const newChild = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    setChildren([...children, newChild]);
    setPendingChanges(p => p + 1);
    if (isOnline) {
      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addChild', data: newChild }),
        });
      } catch {
        return;
      }
    }
  };

  // Adicionar registro
  const addDailyRecord = async data => {
    const newRecord = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setDailyRecords([...dailyRecords, newRecord]);
    setPendingChanges(p => p + 1);
    if (isOnline) {
      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addRecord', data: newRecord }),
        });
      } catch {
        return;
      }
    }
  };

    const clearLocalData = useCallback(() => {
    setChildren([]);
    setDailyRecords([]);
    setPendingChanges(0);
    setLastSync(null);
    setSelectedChild(null);
    setSearchTerm('');
    setSyncError('');
  }, [setChildren, setDailyRecords, setLastSync]);

// Excluir criança e registros
  const deleteChild = async childId => {
    const confirmed = window.confirm(
      'Excluir este cadastro e todos os registros desta criança? Esta ação não pode ser desfeita.'
    );
    if (!confirmed) return;

    const nextChildren = children.filter(child => child.id !== childId);
    const nextRecords = dailyRecords.filter(record => record.childId !== childId);

    setChildren(nextChildren);
    setDailyRecords(nextRecords);
    setSelectedChild(null);
    setView('children');
    setPendingChanges(p => p + 1);

    if (isOnline) {
      await syncWithServer({ children: nextChildren, records: nextRecords });
    }
  };

  // Stats
  const getStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecs = dailyRecords.filter(r => r.date?.split('T')[0] === today);
    const present = todayRecs.filter(
      r => r.attendance === 'present' || r.attendance === 'late'
    ).length;
    const active = children.filter(c => c.status === 'active').length;
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
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    children
      .filter(c => c.status === 'active')
      .forEach(child => {
        const recent = dailyRecords
          .filter(r => r.childId === child.id && new Date(r.date) > last7)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        if (recent.slice(0, 3).filter(r => r.attendance === 'absent').length >= 3) {
          alerts.push({
            childId: child.id,
            childName: child.name,
            msg: '3+ faltas seguidas',
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
    <div className="min-h-screen bg-gray-100 pb-20 lg:flex lg:h-screen lg:overflow-hidden lg:pb-0">
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
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-lg font-bold">{viewTitles[view]}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Online/Offline */}
            <div
              className={`h-2 w-2 rounded-full ${
                isOnline ? 'bg-green-400' : 'bg-red-400'
              }`}
            />

            {/* Botão Sync */}
            <button
              onClick={syncWithServer}
              disabled={syncStatus === 'syncing'}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                syncStatus === 'syncing'
                  ? 'bg-indigo-500'
                  : syncStatus === 'success'
                  ? 'bg-green-500'
                  : syncStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
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
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Instituto Lumine</p>
          <h1 className="text-lg font-semibold text-gray-900">{viewTitles[view]}</h1>
          <p className="text-xs text-gray-500">
            Última sync:{" "}
            {lastSync ? `${formatDate(lastSync)} às ${formatTime(lastSync)}` : "Nenhuma"}
          </p>
          {syncStatus === 'error' && syncError && (
            <p className="text-xs text-rose-600">Sync: {syncError}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {isOnline ? "Online" : "Offline"}
          </div>
          <button
            onClick={syncWithServer}
            disabled={syncStatus === "syncing"}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
              syncStatus === "syncing"
                ? "bg-indigo-100 text-indigo-700"
                : syncStatus === "success"
                ? "bg-emerald-100 text-emerald-700"
                : syncStatus === "error"
                ? "bg-rose-100 text-rose-700"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            <RefreshCw size={14} className={syncStatus === "syncing" ? "animate-spin" : ""} />
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
              <ChildDetailView child={selectedChild} dailyRecords={dailyRecords} setView={setView} onDelete={deleteChild} />
            </div>
            <div className="hidden lg:block">
              <ChildDetailDesktop child={selectedChild} dailyRecords={dailyRecords} onDelete={deleteChild} />
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
            clearLocalData={clearLocalData}
          />
        )}
      </main>
    </div>

      {/* ========== FAB (Floating Action Button) ========== */}
      {(view === 'children' || view === 'daily' || view === 'dashboard') && (
        <div className="fixed bottom-24 right-4 z-40 lg:hidden">
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
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
              showFABMenu ? 'rotate-45 bg-gray-600' : 'bg-indigo-600'
            }`}
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>
      )}

      {/* ========== BOTTOM NAVIGATION ========== */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white shadow-lg lg:hidden">
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
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setShowFABMenu(false)} />
      )}
    </div>
  );
}

// ============================================
// BOTTOM NAV ITEM
// ============================================
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-full w-16 flex-col items-center justify-center transition-colors ${
        active ? 'text-indigo-600' : 'text-gray-400'
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className={`mt-1 text-xs ${active ? 'font-semibold' : ''}`}>{label}</span>
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
        <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">Instituto</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Lumine</h2>
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
            className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}
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
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-sm font-medium transition ${
        active ? 'bg-indigo-600 text-white' : 'text-indigo-100 hover:bg-white/10'
      }`}
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
  const activeChildren = children.filter(c => c.status === 'active');
  const pendingToday = activeChildren.filter(c => !todayRecords.find(r => r.childId === c.id));

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
            <span className="text-sm font-semibold text-amber-800">Alertas</span>
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
            <h3 className="font-semibold text-gray-800">Registrar hoje</h3>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
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
          <h3 className="mb-3 font-semibold text-gray-800">Registros de hoje</h3>
          <div className="space-y-2">
            {todayRecords.slice(0, 5).map(rec => {
              const child = children.find(c => c.id === rec.childId);
              return (
                <div key={rec.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      rec.attendance === 'present'
                        ? 'bg-green-500'
                        : rec.attendance === 'late'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
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
  const activeChildren = children.filter(c => c.status === 'active');
  const pendingToday = activeChildren.filter(c => !todayRecords.find(r => r.childId === c.id));

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
                <span className="text-sm font-semibold text-amber-800">Alertas recentes</span>
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
              <h3 className="font-semibold text-gray-800">Pendências de hoje</h3>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
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
            <h3 className="font-semibold text-gray-800">Registros de hoje</h3>
            <span className="text-xs text-gray-500">{todayRecords.length} registros</span>
          </div>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
            {todayRecords.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                Nenhum registro feito hoje.
              </div>
            )}
            {todayRecords.map(record => {
              const child = children.find(c => c.id === record.childId);
              return (
                <div key={record.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{child?.name || 'Criança'}</p>
                    <p className="text-xs text-gray-500">{formatDate(record.date)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      record.attendance === 'present'
                        ? 'bg-green-100 text-green-700'
                        : record.attendance === 'late'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
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
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
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
  const filtered = children.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

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

      {/* Contador */}
      <p className="text-sm text-gray-500">
        {filtered.length} criança{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map(child => (
          <div
            key={child.id}
            onClick={() => {
              setSelectedChild(child);
              setView('child-detail');
            }}
            className="flex cursor-pointer items-center gap-4 rounded-xl bg-white p-4 shadow-sm active:bg-gray-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <User size={24} className="text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-800">{child.name}</h3>
              <p className="text-sm text-gray-500">
                {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
              </p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm ? 'Nenhuma criança encontrada' : 'Nenhuma criança cadastrada'}
          </p>
        </div>
      )}
    </div>
  );
}


function ChildrenTable({ children, setSelectedChild, setView, searchTerm, setSearchTerm }) {
  const filtered = children.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Idade</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Escola</th>
              <th className="px-4 py-3">Status</th>
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
                <td className="px-4 py-3 text-gray-600">
                  {child.birthDate ? `${calculateAge(child.birthDate)} anos` : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">{child.guardianName || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{child.guardianPhone || '-'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {child.school ? `${child.school}${child.grade ? ` - ${child.grade}` : ''}` : '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      child.status === 'inactive'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {child.status === 'inactive' ? 'Inativa' : 'Ativa'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  {searchTerm ? 'Nenhuma criança encontrada' : 'Nenhuma criança cadastrada'}
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
    entryDate: new Date().toISOString().split('T')[0],
    guardianName: '',
    guardianPhone: '',
    guardianPhoneAlt: '',
    address: '',
    school: '',
    grade: '',
    initialObservations: '',
  });

  const handleSubmit = () => {
    if (!form.name) {
      alert('Informe o nome da criança');
      return;
    }
    addChild(form);
    setView('children');
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Step 1: Dados básicos */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Dados da criança</h2>

          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                placeholder="Nome da criança"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data de nascimento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={e => setForm({ ...form, birthDate: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data de entrada</label>
              <input
                type="date"
                value={form.entryDate}
                onChange={e => setForm({ ...form, entryDate: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!form.name}
            className="w-full rounded-xl bg-indigo-600 py-4 font-semibold text-white disabled:bg-gray-300"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step 2: Responsável */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Responsável</h2>

          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome do responsável</label>
              <input
                type="text"
                value={form.guardianName}
                onChange={e => setForm({ ...form, guardianName: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="tel"
                value={form.guardianPhone}
                onChange={e => setForm({ ...form, guardianPhone: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                placeholder="(83) 99999-9999"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone alternativo</label>
              <input
                type="tel"
                value={form.guardianPhoneAlt}
                onChange={e => setForm({ ...form, guardianPhoneAlt: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                placeholder="(83) 99999-9999"
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
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-indigo-600 py-4 font-semibold text-white"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complementares */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Informações adicionais</h2>

          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Endereço</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Escola</label>
                <input
                  type="text"
                  value={form.school}
                  onChange={e => setForm({ ...form, school: e.target.value })}
                  className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Série</label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={e => setForm({ ...form, grade: e.target.value })}
                  className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                  placeholder="2º ano"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={form.initialObservations}
                onChange={e => setForm({ ...form, initialObservations: e.target.value })}
                rows={3}
                className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                placeholder="Informações importantes..."
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl bg-gray-100 py-4 font-semibold text-gray-700"
            >
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-green-600 py-4 font-semibold text-white"
            >
              Cadastrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// DETALHES DA CRIANÇA
// ============================================
function ChildDetailView({ child, dailyRecords, onDelete }) {
  const childRecords = dailyRecords
    .filter(r => r.childId === child.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const rate = calculateAttendanceRate(childRecords);
  const present = childRecords.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  const absent = childRecords.filter(r => r.attendance === 'absent').length;

  const moodLabels = {
    happy: '😊 Feliz',
    neutral: '😐 Ok',
    sad: '😢 Triste',
  };

  return (
    <div className="space-y-4">
      {/* Avatar e nome */}
      <div className="rounded-xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
          <User size={40} className="text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{child.name}</h2>
        <p className="text-gray-500">
          {child.birthDate ? `${calculateAge(child.birthDate)} anos` : 'Idade n/d'}
        </p>
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
        {child.address && <InfoRow icon={MapPin} label="Endereço" value={child.address} />}
        {child.school && (
          <InfoRow
            icon={School}
            label="Escola"
            value={`${child.school}${child.grade ? ` - ${child.grade}` : ''}`}
          />
        )}
        <InfoRow icon={Clock} label="Entrada" value={formatDate(child.entryDate)} />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800">Ações</h3>
        <p className="mt-1 text-xs text-gray-500">Excluir remove também todos os registros desta criança.</p>
        <button
          type="button"
          onClick={() => onDelete && onDelete(child.id)}
          className="mt-3 w-full rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Excluir cadastro
        </button>
      </div>

      {/* Histórico */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-800">Últimos registros</h3>
        {childRecords.length > 0 ? (
          <div className="space-y-2">
            {childRecords.slice(0, 10).map(rec => (
              <div
                key={rec.id}
                className={`rounded-lg border-l-4 p-3 ${
                  rec.attendance === 'present'
                    ? 'border-green-500 bg-green-50'
                    : rec.attendance === 'late'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{formatDate(rec.date)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      rec.attendance === 'present'
                        ? 'bg-green-200 text-green-800'
                        : rec.attendance === 'late'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                    }`}
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

function ChildDetailDesktop({ child, dailyRecords, onDelete }) {
  const childRecords = dailyRecords
    .filter(r => r.childId === child.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const rate = calculateAttendanceRate(childRecords);
  const present = childRecords.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  const absent = childRecords.filter(r => r.attendance === 'absent').length;

  const moodLabels = {
    happy: 'Feliz',
    neutral: 'Ok',
    sad: 'Triste',
  };

  return (
    <div className="grid grid-cols-[minmax(0,360px)_1fr] gap-6">
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
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

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800">Informações</h3>
          <InfoRow icon={User} label="Responsável" value={child.guardianName} />
          <InfoRow icon={Phone} label="Telefone" value={child.guardianPhone} />
          {child.address && <InfoRow icon={MapPin} label="Endereço" value={child.address} />}
          {child.school && (
            <InfoRow
              icon={School}
              label="Escola"
              value={`${child.school}${child.grade ? ` - ${child.grade}` : ''}`}
            />
          )}
          <InfoRow icon={Clock} label="Entrada" value={formatDate(child.entryDate)} />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800">Ações</h3>
          <p className="mt-1 text-xs text-gray-500">Excluir remove também todos os registros desta criança.</p>
          <button
            type="button"
            onClick={() => onDelete && onDelete(child.id)}
            className="mt-3 w-full rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Excluir cadastro
          </button>
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
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        record.attendance === 'present'
                          ? 'bg-green-100 text-green-700'
                          : record.attendance === 'late'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
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
  const [step, setStep] = useState('select'); // select, details
  const [form, setForm] = useState({
    attendance: 'present',
    mood: 'neutral',
    participation: 'medium',
    interaction: 'medium',
    activity: '',
    performance: 'medium',
    notes: '',
    familyContact: 'no',
    contactReason: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const activeChildren = children.filter(c => c.status === 'active');
  const todayRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = todayRecords.map(r => r.childId);
  const pending = activeChildren.filter(c => !recordedIds.includes(c.id));

  const quickRecord = (childId, attendance) => {
    addDailyRecord({
      childId,
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
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  const handleDetailedRecord = () => {
    if (!selectedChildId) return;
    addDailyRecord({ childId: selectedChildId, date, ...form });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setStep('select');
      setSelectedChildId('');
      setForm({
        attendance: 'present',
        mood: 'neutral',
        participation: 'medium',
        interaction: 'medium',
        activity: '',
        performance: 'medium',
        notes: '',
        familyContact: 'no',
        contactReason: '',
      });
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Toast de sucesso */}
      {showSuccess && (
        <div className="fixed top-20 left-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-white shadow-lg animate-pulse">
          <CheckCircle size={20} />
          <span className="font-medium">Registro salvo!</span>
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
            {todayRecords.length}/{activeChildren.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-indigo-600">{pending.length} pendentes</p>
        </div>
      </div>

      {step === 'select' && (
        <>
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
              <p className="font-bold text-indigo-800">
                {activeChildren.find(c => c.id === selectedChildId)?.name}
              </p>
            </div>
            <button onClick={() => setStep('select')} className="text-indigo-600">
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
                  className={`rounded-xl py-3 text-sm font-medium transition-all ${
                    form.attendance === opt.value
                      ? opt.color === 'green'
                        ? 'bg-green-500 text-white'
                        : opt.color === 'yellow'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
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
                      className={`rounded-xl py-3 text-2xl transition-all ${
                        form.mood === opt.value
                          ? 'bg-indigo-100 ring-2 ring-indigo-500'
                          : 'bg-gray-100'
                      }`}
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
            Salvar Registro
          </button>
        </div>
      )}
    </div>
  );
}

function DailyRecordDesktop({ children, dailyRecords, addDailyRecord }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [form, setForm] = useState({
    attendance: 'present',
    mood: 'neutral',
    participation: 'medium',
    interaction: 'medium',
    activity: '',
    performance: 'medium',
    notes: '',
    familyContact: 'no',
    contactReason: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const activeChildren = children.filter(c => c.status === 'active');
  const todayRecords = dailyRecords.filter(r => r.date?.split('T')[0] === date);
  const recordedIds = todayRecords.map(r => r.childId);
  const pending = activeChildren.filter(c => !recordedIds.includes(c.id));
  const selectedChild = activeChildren.find(c => c.id === selectedChildId);

  const quickRecord = (childId, attendance) => {
    addDailyRecord({
      childId,
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
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1200);
  };

  const handleDetailedRecord = () => {
    if (!selectedChildId) return;
    addDailyRecord({ childId: selectedChildId, date, ...form });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1200);
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed right-10 top-24 z-50 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          Registro salvo!
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Registro diário</p>
          <p className="text-sm text-gray-600">
            {todayRecords.length}/{activeChildren.length} registrados
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
          <div className="mt-4 max-h-[520px] space-y-2 overflow-auto">
            {pending.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                Nenhuma pendência para esta data.
              </div>
            )}
            {pending.map(child => (
              <div
                key={child.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  selectedChildId === child.id ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'
                }`}
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
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Detalhes</p>
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedChild ? selectedChild.name : 'Selecione uma criança'}
              </h3>
            </div>
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Selecionar</option>
              {activeChildren.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
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
                    className={`rounded-xl py-2 text-xs font-semibold ${
                      form.attendance === option.value
                        ? option.color === 'green'
                          ? 'bg-green-500 text-white'
                          : option.color === 'yellow'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
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
              Salvar registro
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
  clearLocalData,
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
          setConfirmAction(() => () => {
            setChildren(data.children);
            setDailyRecords(importedRecords);
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
  const activeChildren = children.filter(c => c.status === 'active');
  const monthRecords = dailyRecords.filter(r => r.date?.startsWith(selectedMonth));
  const monthDays = [...new Set(monthRecords.map(r => r.date?.split('T')[0]))].length;
  const monthMeals = monthRecords.filter(r => r.attendance !== 'absent').length;

  const childStats = activeChildren
    .map(child => {
      const recs = monthRecords.filter(r => r.childId === child.id);
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

  return (
    <div className="space-y-4">
      {/* Modal confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-bold">Confirmar</h3>
            <p className="mb-6 text-gray-600">Substituir dados atuais pelos importados?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl bg-gray-100 py-3 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 rounded-xl bg-indigo-600 py-3 font-medium text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 lg:hidden">
        {/* Sincronização */}
      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="font-semibold text-gray-800">Sincronização</h3>
        </div>

        {lastSync && (
          <p className="text-sm text-gray-500">
            Última sync: {formatDate(lastSync)} às {formatTime(lastSync)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={syncWithServer}
            disabled={!isOnline}
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

      {/* Limpar dados locais */}
      <div className="space-y-3 rounded-xl bg-rose-50 p-4 shadow-sm">
        <h3 className="font-semibold text-rose-700">Limpar dados locais</h3>
        <p className="text-sm text-rose-600">Remove todas as crianças e registros deste dispositivo.</p>
        <button
          onClick={() => {
            if (window.confirm('Tem certeza que deseja apagar os dados locais?')) {
              clearLocalData();
            }
          }}
          className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white"
        >
          Apagar dados locais
        </button>
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
                    className={`h-full rounded-full ${
                      child.rate >= 80
                        ? 'bg-green-500'
                        : child.rate >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${child.rate}%` }}
                  />
                </div>
                <span
                  className={`w-10 text-right text-sm font-bold ${
                    child.rate >= 80
                      ? 'text-green-600'
                      : child.rate >= 60
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
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
                <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <h3 className="font-semibold text-gray-800">Sincronização</h3>
              </div>
              <span className="text-xs text-gray-400">
                {lastSync ? `${formatDate(lastSync)} ${formatTime(lastSync)}` : 'Sem sync'}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Envie e baixe dados da planilha.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={syncWithServer}
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

        <div className="rounded-2xl bg-rose-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-rose-700">Limpar dados locais</h3>
              <p className="mt-1 text-sm text-rose-600">
                Remove todas as crianças e registros deste dispositivo.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Tem certeza que deseja apagar os dados locais?')) {
                  clearLocalData();
                }
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Apagar dados
            </button>
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
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        child.rate >= 80
                          ? 'bg-green-100 text-green-700'
                          : child.rate >= 60
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
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
