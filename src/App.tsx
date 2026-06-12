import React, { useState } from 'react';
import { useAppState } from './store/AppStateContext';
import {
  LayoutDashboard, PhoneCall, FileText, Truck, BarChart3,
  Wrench, Building2, Bell, AlertTriangle,
  Search, Settings, User, ChevronDown, Menu, X, Radio,
} from 'lucide-react';
import DashboardView from './views/DashboardView';
import DispatchView from './views/DispatchView';
import CasesView from './views/CasesView';
import AmbulanceTerminalView from './views/AmbulanceTerminalView';
import StatisticsView from './views/StatisticsView';
import MaintenanceView from './views/MaintenanceView';
import HospitalsView from './views/HospitalsView';
import NotificationPanel from './components/NotificationPanel';
import clsx from 'clsx';

type ViewKey = 'dashboard' | 'dispatch' | 'cases' | 'ambulance-terminal' | 'statistics' | 'maintenance' | 'hospitals';

const NAV_ITEMS: { key: ViewKey; label: string; icon: React.ComponentType<any>; badge?: string }[] = [
  { key: 'dashboard', label: '调度总览', icon: LayoutDashboard },
  { key: 'dispatch', label: '派车中心', icon: PhoneCall },
  { key: 'cases', label: '案件管理', icon: FileText },
  { key: 'ambulance-terminal', label: '救护车终端', icon: Radio },
  { key: 'hospitals', label: '医院资源', icon: Building2 },
  { key: 'maintenance', label: '车辆维保', icon: Wrench },
  { key: 'statistics', label: '统计报表', icon: BarChart3 },
];

export default function App() {
  const { state, dispatch } = useAppState();
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);

  const unreadCount = state.notifications.filter(n => !n.read).length;
  const activeRed = state.cases.filter(c => c.priority === 'red' && c.status !== 'completed' && c.status !== 'cancelled').length;
  const activeAmbulances = state.ambulances.filter(a => a.status !== 'idle' && a.status !== 'maintenance').length;

  const renderView = () => {
    switch (state.currentView) {
      case 'dashboard': return <DashboardView />;
      case 'dispatch': return <DispatchView />;
      case 'cases': return <CasesView />;
      case 'ambulance-terminal': return <AmbulanceTerminalView />;
      case 'statistics': return <StatisticsView />;
      case 'maintenance': return <MaintenanceView />;
      case 'hospitals': return <HospitalsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white flex items-center justify-between px-4 shadow-lg z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-red-800/50 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md">
              <Truck className="text-red-600" size={22} />
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-base tracking-wide">城市120急救调度与智能派车系统</h1>
              <p className="text-[11px] text-red-100">Emergency Medical Service Dispatch Platform v1.0</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 mr-4 text-sm">
            <div className="flex items-center gap-1.5 bg-red-800/40 px-3 py-1 rounded-full">
              <AlertTriangle size={14} className="text-amber-300" />
              <span className="font-semibold">{activeRed}</span>
              <span className="text-red-100 text-xs">红色警情</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-800/40 px-3 py-1 rounded-full">
              <Truck size={14} />
              <span className="font-semibold">{activeAmbulances}/{state.ambulances.length}</span>
              <span className="text-red-100 text-xs">出勤车辆</span>
            </div>
          </div>

          {/* Simulate call button */}
          <div className="relative">
            <button
              onClick={() => setSimulateOpen(!simulateOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-700 rounded-lg font-semibold text-sm hover:bg-red-50 transition-colors shadow-sm"
            >
              <PhoneCall size={16} />
              <span className="hidden sm:inline">模拟新来电</span>
            </button>
            {simulateOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 w-72 p-4 z-50">
                <p className="text-sm text-slate-600 mb-3">点击下方按钮模拟急救电话接入，系统将自动评估优先级并生成派车方案。</p>
                <button
                  onClick={() => {
                    dispatch({ type: 'TRIGGER_NEW_CALL' });
                    setSimulateOpen(false);
                    dispatch({ type: 'SET_VIEW', payload: 'dispatch' });
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-2.5 rounded-lg font-bold hover:from-red-700 hover:to-red-600 transition-all shadow-md flex items-center justify-center gap-2 animate-pulse"
                >
                  <Radio size={16} /> 立即模拟急救来电
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="hidden lg:flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 w-56">
            <Search size={14} className="text-red-100" />
            <input
              placeholder="搜索案件号 / 车牌号..."
              className="bg-transparent outline-none text-sm placeholder:text-red-100/70 w-full"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 hover:bg-red-800/50 rounded-lg transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-400 text-red-900 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-red-700">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationPanel onClose={() => setNotifOpen(false)} />
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/20 ml-1">
            <button className="p-1.5 hover:bg-red-800/50 rounded-lg">
              <Settings size={16} />
            </button>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-white/20">
              <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center text-red-900 font-bold text-sm">
                调
              </div>
              <div className="text-xs leading-tight hidden sm:block">
                <div className="font-semibold">调度长</div>
                <div className="text-red-100">张主任</div>
              </div>
              <ChevronDown size={12} className="text-red-100" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={clsx(
            'bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-sm z-20',
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-52 shrink-0'
          )}
        >
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = state.currentView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => dispatch({ type: 'SET_VIEW', payload: item.key })}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.key === 'dispatch' && activeRed > 0 && !isActive && (
                    <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{activeRed}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom status */}
          <div className="p-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center justify-between mb-1">
              <span>系统运行状态</span>
              <span className="flex items-center gap-1 text-green-600">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                正常
              </span>
            </div>
            <div className="text-slate-400">
              {new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
