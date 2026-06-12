import { useMemo, useState } from 'react';
import { useAppState } from '../store/AppStateContext';
import {
  Building2, BedDouble, Users, Phone, AlertTriangle, Star,
  Search, MapPin, TrendingUp, Heart, Activity, Stethoscope, Eye, XCircle,
} from 'lucide-react';
import clsx from 'clsx';

const deptNames: Record<string, string> = {
  emergency: '急诊科', cardiology: '心内科', neurology: '神经内科',
  trauma: '创伤骨科', pediatrics: '儿科', obstetrics: '产科',
  burn: '烧伤科', toxicology: '中毒科',
};

const levelNames: Record<string, string> = {
  tertiary: '三级甲等', secondary: '二级甲等', primary: '一级医院',
};

export default function HospitalsView() {
  const { state } = useAppState();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any | null>(null);

  const filtered = useMemo(() => state.hospitals.filter(h => !search || h.name.includes(search)), [state.hospitals, search]);

  const stats = useMemo(() => {
    const totalBeds = state.hospitals.reduce((s, h) => s + h.emergencyCapacity.totalBeds, 0);
    const availBeds = state.hospitals.reduce((s, h) => s + h.emergencyCapacity.availableBeds, 0);
    const waiting = state.hospitals.reduce((s, h) => s + h.emergencyCapacity.waitingPatients, 0);
    const overload = state.hospitals.filter(h => h.emergencyCapacity.triageLevel >= 3).length;
    return { totalBeds, availBeds, waiting, overload, total: state.hospitals.length };
  }, [state.hospitals]);

  const busyLevelColor = (b: number) => {
    if (b >= 0.85) return { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', label: '爆满' };
    if (b >= 0.65) return { text: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', label: '繁忙' };
    return { text: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', label: '正常' };
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-100 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-indigo-600" /> 医院资源调度
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">实时监控各医院急诊床位、科室忙闲度与分诊级别</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 shrink-0">
        {[
          { label: '入网医院', value: stats.total, icon: Building2, color: 'from-indigo-500 to-indigo-600', unit: '家' },
          { label: '急诊床位总数', value: stats.totalBeds, icon: BedDouble, color: 'from-blue-500 to-blue-600', unit: '张' },
          { label: '当前可用', value: stats.availBeds, icon: Star, color: 'from-emerald-500 to-emerald-600', unit: '张' },
          { label: '候诊人数', value: stats.waiting, icon: Users, color: 'from-amber-500 to-amber-600', unit: '人' },
          { label: '超负荷预警', value: stats.overload, icon: AlertTriangle, color: 'from-red-500 to-red-600', unit: '家' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <div className={clsx('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm', s.color)}>
                  <Icon size={14} />
                </div>
                <TrendingUp size={12} className="text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{s.value}<span className="text-xs font-normal text-slate-400 ml-1">{s.unit}</span></div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
            placeholder="搜索医院名称..."
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 ml-auto">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />正常</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" />繁忙</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />超负荷</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-auto custom-scrollbar p-1 content-start">
        {filtered.map(h => {
          const avgBusy = h.departments.reduce((s, d) => s + d.busyLevel, 0) / Math.max(h.departments.length, 1);
          const busyStatus = busyLevelColor(avgBusy);
          const bedPct = h.emergencyCapacity.totalBeds > 0 ? (h.emergencyCapacity.availableBeds / h.emergencyCapacity.totalBeds) * 100 : 0;
          const bedStatus = h.emergencyCapacity.availableBeds === 0
            ? busyLevelColor(1)
            : bedPct < 15 ? busyLevelColor(0.9)
            : bedPct < 30 ? busyLevelColor(0.7) : busyLevelColor(0.5);

          return (
            <div
              key={h.id}
              onClick={() => setDetail(h)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer"
            >
              <div className={clsx('h-2', avgBusy >= 0.85 ? 'bg-gradient-to-r from-red-400 to-red-600' : avgBusy >= 0.65 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-green-400 to-emerald-600')} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border-2', bedStatus.bg, 'border-current opacity-80')}>
                      🏥
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-base leading-tight">{h.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                        <span className="text-slate-500 flex items-center gap-0.5"><Star size={10} /> {levelNames[h.level]}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500 flex items-center gap-0.5"><MapPin size={10} /> {h.location.district}</span>
                      </div>
                    </div>
                  </div>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0', busyStatus.bg, busyStatus.text)}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', busyStatus.dot)} />
                    {busyStatus.label}
                  </span>
                </div>

                <div className={clsx('rounded-xl p-3 mb-3 border', bedStatus.bg, 'border-current opacity-80')}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={clsx('text-xs font-semibold flex items-center gap-1', bedStatus.text)}>
                      <Activity size={12} /> 急诊科容量
                    </span>
                    <span className={clsx('text-[10px] font-bold',
                      h.emergencyCapacity.triageLevel >= 3 ? 'text-red-700' :
                      h.emergencyCapacity.triageLevel >= 2 ? 'text-amber-700' : 'text-green-700'
                    )}>分诊 {h.emergencyCapacity.triageLevel} 级</span>
                  </div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="flex items-baseline">
                      <span className={clsx('text-2xl font-bold', bedStatus.text)}>{h.emergencyCapacity.availableBeds}</span>
                      <span className="text-xs text-slate-500 ml-0.5">/ {h.emergencyCapacity.totalBeds} 张</span>
                    </div>
                    <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full', bedStatus.dot)} style={{ width: `${100 - bedPct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-12 text-right">{bedPct.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-0.5"><Users size={10} />候诊: <b>{h.emergencyCapacity.waitingPatients}</b>人</span>
                    <span className="flex items-center gap-0.5"><Stethoscope size={10} />值班: <b>{h.departments.reduce((s, d) => s + d.onCallDoctors, 0)}</b>人</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-[11px] text-slate-500 font-semibold mb-1.5 flex items-center gap-1">
                    <Heart size={10} /> 重点科室忙闲
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {h.departments.slice(0, 4).map(d => {
                      const ds = busyLevelColor(d.busyLevel);
                      return (
                        <div key={d.type} className={clsx('rounded-lg p-1.5 text-[10px]', ds.bg)}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-slate-700">{deptNames[d.type] || d.name}</span>
                            <span className={ds.text}>{ds.label}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>床{d.availableBeds}/{d.totalBeds}</span>
                            <span>医{d.onCallDoctors}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="flex items-center gap-0.5"><Phone size={10} /> {h.contact.emergencyHotline}</span>
                  <button className="text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
                    <Eye size={11} /> 查看详情
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏥</div>
                <div>
                  <h3 className="font-bold text-lg">{detail.name}</h3>
                  <p className="text-xs text-indigo-100">{levelNames[detail.level]} · {detail.location.district}</p>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 hover:bg-white/20 rounded-lg"><XCircle size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { l: '急诊床位', v: `${detail.emergencyCapacity.availableBeds}/${detail.emergencyCapacity.totalBeds}`, icon: <BedDouble size={12} /> },
                  { l: '候诊患者', v: detail.emergencyCapacity.waitingPatients, icon: <Users size={12} /> },
                  { l: '分诊级别', v: `${detail.emergencyCapacity.triageLevel} 级`, icon: <AlertTriangle size={12} /> },
                  { l: '值班医生', v: detail.departments.reduce((s: number, d: any) => s + d.onCallDoctors, 0), icon: <Stethoscope size={12} /> },
                ].map((x: any) => (
                  <div key={x.l} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mb-1">{x.icon} {x.l}</div>
                    <div className="text-lg font-bold text-slate-800">{x.v}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">各科室资源</h4>
                <div className="space-y-1.5">
                  {detail.departments.map((d: any) => {
                    const ds = busyLevelColor(d.busyLevel);
                    return (
                      <div key={d.type} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs', ds.bg, ds.text)}>{d.name.slice(0, 2)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="font-semibold text-slate-700">{d.name}</span>
                            <span className={clsx('font-semibold', ds.text)}>{ds.label} ({(d.busyLevel * 100).toFixed(0)}%)</span>
                          </div>
                          <div className="h-1.5 bg-white rounded-full overflow-hidden">
                            <div className={clsx('h-full rounded-full', ds.dot)} style={{ width: `${d.busyLevel * 100}%` }} />
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 text-right w-28 shrink-0">
                          <div>床位 {d.availableBeds}/{d.totalBeds}</div>
                          <div className="text-slate-400">医生 {d.onCallDoctors}人</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">地址</div>
                  <div className="text-slate-800 flex items-start gap-1"><MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" /> {detail.location.address}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">联系电话</div>
                  <div className="text-slate-800 flex items-center gap-1"><Phone size={14} className="text-slate-400" /> {detail.contact.phone}</div>
                  <div className="text-red-600 font-semibold text-sm mt-0.5">急诊: {detail.contact.emergencyHotline}</div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex justify-end">
              <button onClick={() => setDetail(null)} className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
