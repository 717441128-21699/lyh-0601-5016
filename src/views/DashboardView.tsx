import { useMemo } from 'react';
import { useAppState } from '../store/AppStateContext';
import CityMapView from '../components/CityMapView';
import {
  PhoneCall, Clock, AlertTriangle, CheckCircle2, TrendingUp,
  Heart, Activity, Users, Truck, Star, ChevronRight,
} from 'lucide-react';
import { getPriorityLabel } from '../utils/priorityAssessment';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function DashboardView() {
  const { state, dispatch } = useAppState();

  const stats = useMemo(() => {
    const todayCases = state.cases;
    const activeCases = todayCases.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
    const redCases = todayCases.filter(c => c.priority === 'red');
    const yellowCases = todayCases.filter(c => c.priority === 'yellow');
    const greenCases = todayCases.filter(c => c.priority === 'green');
    const completed = todayCases.filter(c => c.status === 'completed');
    const avgResponse = completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + (c.responseTimeSeconds || 0), 0) / completed.length)
      : 0;
    const onTime = completed.filter(c => (c.responseTimeSeconds || 9999) <= 600).length;
    const successRate = completed.length > 0 ? Math.round((onTime / completed.length) * 100) : 100;

    return {
      total: todayCases.length,
      active: activeCases.length,
      completed: completed.length,
      red: redCases.length,
      yellow: yellowCases.length,
      green: greenCases.length,
      avgResponse,
      successRate,
      ambulancesTotal: state.ambulances.length,
      ambulancesBusy: state.ambulances.filter(a => a.status !== 'idle' && a.status !== 'maintenance').length,
      ambulancesIdle: state.ambulances.filter(a => a.status === 'idle').length,
      ambulancesMaintenance: state.ambulances.filter(a => a.status === 'maintenance').length,
    };
  }, [state.cases, state.ambulances]);

  const recentCases = useMemo(() => {
    return [...state.cases]
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 6);
  }, [state.cases]);

  const statCards = [
    { label: '今日接警数', value: stats.total, icon: PhoneCall, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: '进行中案件', value: stats.active, icon: Activity, color: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-600' },
    { label: '红色优先级', value: stats.red, icon: AlertTriangle, color: 'from-rose-600 to-red-700', bg: 'bg-rose-50', text: 'text-rose-600' },
    { label: '平均响应时长', value: `${Math.floor(stats.avgResponse / 60)}分${stats.avgResponse % 60}秒`, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: '抢救成功率', value: `${stats.successRate}%`, icon: CheckCircle2, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-600' },
    { label: '待命车辆', value: `${stats.ambulancesIdle}/${stats.ambulancesTotal}`, icon: Truck, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 gap-4 bg-slate-100">
      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-3 shrink-0">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className={clsx('w-10 h-10 rounded-xl', card.bg, 'flex items-center justify-center')}>
                  <Icon className={card.text} size={20} />
                </div>
                <TrendingUp size={14} className="text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-800 leading-tight">{card.value}</div>
              <div className="text-xs text-slate-500 mt-1">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        {/* Map */}
        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
          <div className="h-12 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-red-500 rounded-full" />
              <h3 className="font-bold text-slate-800">城市实时救援态势</h3>
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> 实时更新
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-slate-500"><Heart size={12} className="text-red-500" /> {stats.red}危重</span>
              <span className="flex items-center gap-1 text-slate-500"><Users size={12} className="text-amber-500" /> {stats.yellow}紧急</span>
              <span className="flex items-center gap-1 text-slate-500"><Star size={12} className="text-green-500" /> {stats.green}常规</span>
            </div>
          </div>
          <div className="flex-1 p-2 min-h-0">
            <CityMapView />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Priority Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-green-500 rounded-full" />
              <h3 className="font-bold text-slate-800 text-sm">警情分布</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { label: '红色 (危重)', count: stats.red, total: stats.total, color: 'bg-red-500', text: 'text-red-600' },
                { label: '黄色 (紧急)', count: stats.yellow, total: stats.total, color: 'bg-amber-500', text: 'text-amber-600' },
                { label: '绿色 (常规)', count: stats.green, total: stats.total, color: 'bg-green-500', text: 'text-green-600' },
              ].map(p => {
                const pct = p.total > 0 ? Math.round((p.count / p.total) * 100) : 0;
                return (
                  <div key={p.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={p.text}>{p.label}</span>
                      <span className="text-slate-500">{p.count}件 ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all duration-500', p.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Cases */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
            <div className="h-11 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <h3 className="font-bold text-slate-800 text-sm">最新警情</h3>
              </div>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'cases' })}
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
              >全部 <ChevronRight size={12} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {recentCases.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">暂无警情</div>
              )}
              {recentCases.map(c => {
                const isActive = c.status !== 'completed' && c.status !== 'cancelled';
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      dispatch({ type: 'SELECT_CASE', payload: c.id });
                      dispatch({ type: 'SET_VIEW', payload: 'dispatch' });
                    }}
                    className={clsx(
                      'p-3 cursor-pointer hover:bg-slate-50 transition-colors',
                      c.status === 'waiting' && c.priority === 'red' ? 'bg-red-50/70' : ''
                    )}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className={clsx(
                        'shrink-0 w-2 h-2 rounded-full mt-1.5 animate-pulse',
                        c.priority === 'red' ? 'bg-red-500' : c.priority === 'yellow' ? 'bg-amber-500' : 'bg-green-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-slate-800 truncate">{c.patientName} · {c.patientAge}岁</span>
                          <span className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium text-white shrink-0',
                            c.priority === 'red' ? 'bg-red-500' : c.priority === 'yellow' ? 'bg-amber-500' : 'bg-green-500'
                          )}>{getPriorityLabel(c.priority)}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{c.symptomDescription}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-slate-400">{c.caseNumber}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Clock size={9} />
                            {formatDistanceToNow(new Date(c.receivedAt), { addSuffix: true, locale: zhCN })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ambulance Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-emerald-500 rounded-full" />
              <h3 className="font-bold text-slate-800 text-sm">车辆状态概览</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '待命', count: stats.ambulancesIdle, color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
                { label: '出勤', count: stats.ambulancesBusy, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                { label: '维保', count: stats.ambulancesMaintenance, color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-100' },
                { label: '总数', count: stats.ambulancesTotal, color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
              ].map(s => (
                <div key={s.label} className={clsx('rounded-lg p-2 text-center', s.bg)}>
                  <div className={clsx('text-lg font-bold', s.text)}>{s.count}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
