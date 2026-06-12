import { useMemo, useState } from 'react';
import { useAppState } from '../store/AppStateContext';
import {
  Wrench, AlertTriangle, CheckCircle, Clock, FilePlus, Search,
  Truck, Calendar, ChevronRight, Eye, XCircle, AlertCircle,
  Filter, Check, Ban, Package,
} from 'lucide-react';
import clsx from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { MaintenanceWorkOrder, Ambulance } from '../types';

const typeLabel: Record<MaintenanceWorkOrder['type'], { label: string; color: string }> = {
  routine: { label: '例行保养', color: 'bg-blue-100 text-blue-700' },
  repair: { label: '故障维修', color: 'bg-red-100 text-red-700' },
  inspection: { label: '年检审验', color: 'bg-purple-100 text-purple-700' },
};

const statusLabel: Record<MaintenanceWorkOrder['status'], { label: string; dot: string; color: string }> = {
  pending: { label: '待处理', dot: 'bg-amber-500', color: 'text-amber-700 bg-amber-50' },
  in_progress: { label: '进行中', dot: 'bg-blue-500', color: 'text-blue-700 bg-blue-50' },
  completed: { label: '已完成', dot: 'bg-green-500', color: 'text-green-700 bg-green-50' },
};

export default function MaintenanceView() {
  const { state, dispatch } = useAppState();
  const [tab, setTab] = useState<'orders' | 'vehicles'>('orders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detail, setDetail] = useState<MaintenanceWorkOrder | null>(null);

  const orders = useMemo(() => {
    return state.maintenanceOrders.filter(o => {
      const amb = state.ambulances.find(a => a.id === o.ambulanceId);
      if (search && amb && !amb.plateNumber.includes(search)) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.maintenanceOrders, state.ambulances, search, statusFilter]);

  const vehicles = useMemo(() => {
    return state.ambulances.map(a => {
      const distToNext = a.nextMaintenanceMileage - a.mileage;
      const threshold = a.status === 'maintenance' ? 'in_service' : distToNext <= 500 ? 'urgent' : distToNext <= 2000 ? 'warning' : 'normal';
      const pendingOrders = state.maintenanceOrders.filter(o => o.ambulanceId === a.id && o.status !== 'completed').length;
      return { ...a, distToNext, threshold, pendingOrders };
    });
  }, [state.ambulances, state.maintenanceOrders]);

  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const urgent = vehicles.filter(v => v.threshold === 'urgent').length;
    const totalCost = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.cost || 0), 0);
    return { pending, inProgress, completed, urgent, total: orders.length, totalCost };
  }, [orders, vehicles]);

  return (
    <div className="h-full flex flex-col p-4 bg-slate-100 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-orange-600" /> 救护车维保管理
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">按里程自动生成维保工单 · 追踪维修进度 · 记录保养历史</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-0.5 flex">
          <button
            onClick={() => setTab('orders')}
            className={clsx(
              'px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1',
              tab === 'orders' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'
            )}
          ><Wrench size={12} /> 工单列表</button>
          <button
            onClick={() => setTab('vehicles')}
            className={clsx(
              'px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1',
              tab === 'vehicles' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'
            )}
          ><Truck size={12} /> 车辆状态</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 shrink-0">
        {[
          { label: '总工单', value: stats.total, color: 'from-blue-500 to-blue-600', icon: FilePlus, unit: '张' },
          { label: '待处理', value: stats.pending, color: 'from-amber-500 to-amber-600', icon: Clock, unit: '张' },
          { label: '进行中', value: stats.inProgress, color: 'from-indigo-500 to-indigo-600', icon: Wrench, unit: '张' },
          { label: '急需维保', value: stats.urgent, color: 'from-red-500 to-red-600', icon: AlertTriangle, unit: '辆' },
          { label: '累计费用', value: `¥${stats.totalCost.toLocaleString()}`, color: 'from-emerald-500 to-teal-600', icon: CheckCircle, unit: '' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className={clsx('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', s.color)}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-2">{s.value}<span className="text-xs font-normal text-slate-400 ml-1">{s.unit}</span></div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {tab === 'orders' ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-400"
                placeholder="搜索车牌号..."
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Filter size={14} className="text-slate-400" />
              <span className="text-slate-500">状态:</span>
              {[
                { k: 'all', l: '全部' },
                { k: 'pending', l: '待处理' },
                { k: 'in_progress', l: '进行中' },
                { k: 'completed', l: '已完成' },
              ].map(f => (
                <button
                  key={f.k}
                  onClick={() => setStatusFilter(f.k)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md font-medium transition-colors',
                    statusFilter === f.k ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >{f.l}</button>
              ))}
            </div>
            <button className="ml-auto flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm shadow-orange-200">
              <FilePlus size={14} /> 新建工单
            </button>
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">工单号</th>
                    <th className="px-3 py-2.5 font-medium">车牌号</th>
                    <th className="px-3 py-2.5 font-medium">类型</th>
                    <th className="px-3 py-2.5 font-medium">触发里程</th>
                    <th className="px-3 py-2.5 font-medium">维保内容</th>
                    <th className="px-3 py-2.5 font-medium">计划日期</th>
                    <th className="px-3 py-2.5 font-medium">状态</th>
                    <th className="px-3 py-2.5 font-medium">费用</th>
                    <th className="px-3 py-2.5 font-medium">创建</th>
                    <th className="px-3 py-2.5 font-medium text-right pr-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-16 text-slate-400">暂无维保工单</td></tr>
                  )}
                  {orders.map(o => {
                    const amb = state.ambulances.find(a => a.id === o.ambulanceId);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors" onClick={() => setDetail(o)}>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-semibold text-slate-700">{o.id}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">🚑</span>
                            <span className="font-medium text-slate-800">{amb?.plateNumber || o.ambulanceId}</span>
                          </div>
                          {amb && <div className="text-[10px] text-slate-400">{amb.vehicleType === 'advanced' ? '重症监护型' : amb.vehicleType === 'standard' ? '标准型' : '转运型'} · {amb.mileage.toLocaleString()}km</div>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-medium', typeLabel[o.type].color)}>
                            {typeLabel[o.type].label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {o.triggerMileage.toLocaleString()} km
                          {amb && amb.nextMaintenanceMileage > 0 && (
                            <div className="text-[10px] text-slate-400">下次 {amb.nextMaintenanceMileage.toLocaleString()}km</div>
                          )}
                        </td>
                        <td className="px-3 py-3 max-w-[280px]">
                          <div className="text-xs text-slate-600 line-clamp-1">{o.description}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="text-slate-400" />
                            {o.scheduledDate || '--'}
                          </div>
                          {o.completedDate && <div className="text-[10px] text-green-600 mt-0.5">完成: {o.completedDate}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={clsx('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit', statusLabel[o.status].color)}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', statusLabel[o.status].dot)} />
                            {statusLabel[o.status].label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                          {o.cost ? `¥${o.cost.toLocaleString()}` : '--'}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-400">
                          {formatDistanceToNow(new Date(o.createdAt), { addSuffix: true, locale: zhCN })}
                        </td>
                        <td className="px-3 py-3 pr-4">
                          <div className="flex justify-end gap-1">
                            {o.status === 'pending' && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  dispatch({ type: 'UPDATE_MAINTENANCE_ORDER', payload: { id: o.id, updates: { status: 'in_progress' } } });
                                }}
                                className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                                title="开始处理"
                              >
                                <Wrench size={14} />
                              </button>
                            )}
                            {o.status === 'in_progress' && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  dispatch({ type: 'UPDATE_MAINTENANCE_ORDER', payload: { id: o.id, updates: { status: 'completed', completedDate: format(new Date(), 'yyyy-MM-dd') } } });
                                }}
                                className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                title="完成"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="查看">
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4 min-h-0 overflow-auto custom-scrollbar">
          <div className="grid grid-cols-3 gap-4">
            {vehicles.map(v => {
              const thresholdColors: Record<string, { bar: string; badge: string; text: string; icon: any }> = {
                urgent: { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', text: '紧急', icon: <AlertCircle size={14} className="text-red-500" /> },
                warning: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', text: '注意', icon: <AlertTriangle size={14} className="text-amber-500" /> },
                normal: { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700', text: '正常', icon: <CheckCircle size={14} className="text-green-500" /> },
                in_service: { bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700', text: '维保中', icon: <Ban size={14} className="text-slate-500" /> },
              };
              const t = thresholdColors[v.threshold];
              const progress = Math.min(100, ((v.mileage - v.lastMaintenanceMileage) / (v.nextMaintenanceMileage - v.lastMaintenanceMileage)) * 100);
              return (
                <div key={v.id} className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                        🚑
                      </div>
                      <div>
                        <div className="font-bold text-lg text-slate-800">{v.plateNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          {v.vehicleType === 'advanced' ? '🚨 重症监护型' : v.vehicleType === 'standard' ? '🚑 标准型' : '🚐 转运型'}
                        </div>
                      </div>
                    </div>
                    <span className={clsx('text-[10px] px-2 py-1 rounded-full font-semibold', t.badge)}>
                      {t.icon} {t.text}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1"><Package size={10} /> 维保进度</span>
                      <span className={clsx('font-bold', v.threshold === 'urgent' ? 'text-red-600' : 'text-slate-700')}>
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', t.bar)}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-slate-400">总里程</div>
                      <div className="font-bold text-slate-700">{(v.mileage / 10000).toFixed(1)}万</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-slate-400">距下次</div>
                      <div className={clsx('font-bold', v.distToNext < 500 ? 'text-red-600' : 'text-slate-700')}>
                        {v.distToNext > 0 ? v.distToNext.toLocaleString() : 0}km
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-slate-400">待工</div>
                      <div className={clsx('font-bold', v.pendingOrders > 0 ? 'text-amber-600' : 'text-slate-700')}>
                        {v.pendingOrders}张
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div>
                      <span className="flex items-center gap-0.5"><Truck size={10} />{v.status === 'idle' ? '待命' : v.status === 'maintenance' ? '维保中' : '出勤'}</span>
                      <span className="mx-1.5">·</span>
                      <span>⛽ {v.fuelLevel}%</span>
                    </div>
                    <button className="text-orange-600 font-medium hover:text-orange-700 flex items-center gap-0.5">
                      查看详情 <ChevronRight size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2"><Wrench size={18} /> 维保工单详情</h3>
                <p className="text-xs text-orange-100 font-mono mt-0.5">{detail.id}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 hover:bg-orange-700/40 rounded-lg">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">关联车辆</div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="font-bold text-slate-800">🚑 {state.ambulances.find(a => a.id === detail.ambulanceId)?.plateNumber || detail.ambulanceId}</div>
                    <div className="text-xs text-slate-500 mt-0.5">触发里程: {detail.triggerMileage.toLocaleString()} km</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">工单状态</div>
                  <div className="flex gap-2">
                    <span className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium flex-1 justify-center', statusLabel[detail.status].color)}>
                      <span className={clsx('w-2 h-2 rounded-full animate-pulse', statusLabel[detail.status].dot)} />
                      {statusLabel[detail.status].label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">类型</div>
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', typeLabel[detail.type].color)}>
                    {typeLabel[detail.type].label}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">计划日期</div>
                  <div className="font-semibold text-slate-800 text-sm">{detail.scheduledDate || '--'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">费用</div>
                  <div className="font-bold text-orange-600">{detail.cost ? `¥${detail.cost}` : '待结算'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1.5">维保内容</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                  {detail.description}
                </div>
              </div>

              {detail.notes && (
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">备注</div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{detail.notes}</div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setDetail(null)} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-sm">关闭</button>
              {detail.status === 'pending' && (
                <button
                  onClick={() => {
                    dispatch({ type: 'UPDATE_MAINTENANCE_ORDER', payload: { id: detail.id, updates: { status: 'in_progress' } } });
                    setDetail(null);
                  }}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1"
                >
                  <Wrench size={14} /> 开始处理
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
