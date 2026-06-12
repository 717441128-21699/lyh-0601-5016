import { useState, useEffect } from 'react';
import { useAppState } from '../store/AppStateContext';
import {
  Radio, PhoneCall, MapPin, Clock, ShieldCheck, AlertTriangle,
  CheckCircle, XCircle, Map, Heart, Activity, Thermometer, Wind, ChevronRight, Send,
  User, Truck as TruckIcon,
} from 'lucide-react';
import { getPriorityLabel, getPriorityColor } from '../utils/priorityAssessment';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import clsx from 'clsx';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { CITY_CENTER } from '../data/mockData';

const statusMap: Record<string, string> = {
  waiting: '待派车', dispatching: '待接单', enroute: '前往现场',
  arrived: '现场救治', transferred: '转运途中',
};

export default function AmbulanceTerminalView() {
  const { state, dispatch, acceptAssignment, requestReinforcement, updateCaseStatus } = useAppState();
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null);
  const [reinforceOpen, setReinforceOpen] = useState(false);
  const [reinforceReason, setReinforceReason] = useState('');

  const activeAssignments = state.cases
    .filter(c => c.status !== 'completed' && c.status !== 'cancelled' && c.currentAssignmentId)
    .map(c => {
      const a = c.assignments.find(x => x.id === c.currentAssignmentId);
      const amb = state.ambulances.find(x => x.id === a?.ambulanceId);
      return { case: c, assignment: a, ambulance: amb };
    })
    .filter(x => x.ambulance);

  const selected = selectedAmbulanceId
    ? activeAssignments.find(x => x.ambulance?.id === selectedAmbulanceId)
    : activeAssignments[0];

  useEffect(() => {
    if (!selectedAmbulanceId && activeAssignments.length > 0 && !selected) {
      setSelectedAmbulanceId(activeAssignments[0]?.ambulance?.id || null);
    }
  }, [activeAssignments, selectedAmbulanceId, selected]);

  const terminalCase = state.activeTerminalCaseId
    ? state.cases.find(c => c.id === state.activeTerminalCaseId)
    : selected?.case;
  const terminalAssignment = terminalCase?.currentAssignmentId
    ? terminalCase.assignments.find(a => a.id === terminalCase.currentAssignmentId)
    : selected?.assignment;
  const terminalAmbulance = terminalAssignment
    ? state.ambulances.find(a => a.id === terminalAssignment.ambulanceId)
    : selected?.ambulance;

  const vitalSigns = terminalCase?.vitalSigns || [];
  const latestSigns = vitalSigns[vitalSigns.length - 1];

  const handleAccept = () => {
    if (!terminalCase || !terminalAmbulance) return;
    acceptAssignment(terminalCase.id, terminalAmbulance.id);
  };

  const handleReinforceSubmit = () => {
    if (!terminalCase || !reinforceReason) return;
    requestReinforcement(terminalCase.id, reinforceReason, false);
    setReinforceOpen(false);
    setReinforceReason('');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-900/50">
            <Radio className="text-white" size={22} />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">🚑 救护车车载终端</h2>
            <p className="text-xs text-slate-400">Emergency Medical Service On-board Terminal System</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">当前时间</div>
            <div className="font-mono text-white font-bold">{format(new Date(), 'HH:mm:ss')}</div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">在线</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Left: Vehicle selector + Case Info */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          {/* Vehicle Tabs */}
          <div className="shrink-0 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {activeAssignments.length === 0 && (
              <div className="flex-1 text-center text-slate-400 text-sm py-2">暂无执行任务的车辆</div>
            )}
            {activeAssignments.map(x => (
              <button
                key={x.ambulance!.id}
                onClick={() => setSelectedAmbulanceId(x.ambulance!.id)}
                className={clsx(
                  'shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  selectedAmbulanceId === x.ambulance!.id
                    ? 'bg-red-500 text-white shadow-lg shadow-red-900/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                )}
              >
                🚑 {x.ambulance!.plateNumber}
                <span className="ml-2 text-[10px] opacity-80">{statusMap[x.case.status] || ''}</span>
              </button>
            ))}
          </div>

          {/* Case Card */}
          {terminalCase && terminalAmbulance ? (
            <div className="flex-1 bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50 p-5 overflow-y-auto custom-scrollbar min-h-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                  <span className={clsx(
                    'px-2.5 py-1 rounded-full text-[11px] font-bold text-white',
                    getPriorityColor(terminalCase.priority)
                  )}>
                    {getPriorityLabel(terminalCase.priority)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{terminalCase.caseNumber}</span>
                  {terminalCase.escalationLevel > 0 && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 rounded border border-amber-500/40">L{terminalCase.escalationLevel}</span>
                  )}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">
                {terminalCase.patientName} · {terminalCase.patientAge}岁 · {terminalCase.patientGender === 'male' ? '男' : '女'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{terminalCase.callerName} / {terminalCase.callerPhone}</p>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 mb-4">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <MapPin size={12} /> 事发地点
              </div>
              <div className="text-white font-semibold text-sm">{terminalCase.incidentLocation.district} {terminalCase.incidentLocation.address}</div>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 mb-4">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><PhoneCall size={12} /> 主诉症状</div>
              <div className="text-white text-sm">{terminalCase.symptomDescription}</div>
              <div className="text-[11px] text-amber-400 mt-1.5">疑似: {terminalCase.suspectedCondition}</div>
            </div>

            {/* Vehicle crew */}
            <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-xl p-4 border border-blue-500/30">
              <div className="text-xs text-blue-300 mb-2 font-semibold">🚑 {terminalAmbulance.plateNumber} 车辆信息</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-slate-400">医师</div>
                  <div className="text-white font-semibold">{terminalAmbulance.crew.doctorName}</div>
                  <div className="text-[10px] text-slate-500">{terminalAmbulance.crew.doctorPhone}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-slate-400">护士</div>
                  <div className="text-white font-semibold">{terminalAmbulance.crew.nurseName}</div>
                  <div className="text-[10px] text-slate-500">{terminalAmbulance.crew.nursePhone}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-slate-400">司机</div>
                  <div className="text-white font-semibold">{terminalAmbulance.driver.name}</div>
                  <div className="text-[10px] text-slate-500">换班 {terminalAmbulance.driver.shiftEnd}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-slate-400">车辆状态</div>
                  <div className="text-white font-semibold flex items-center gap-1">
                    <TruckIcon size={12} className="text-green-400" />
                    {terminalAmbulance.mileage.toLocaleString()} km
                  </div>
                  <div className="text-[10px] text-slate-500">油量 {terminalAmbulance.fuelLevel}%</div>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="flex-1 bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50 flex items-center justify-center text-slate-500 text-center">
              <div>
                <TruckIcon size={48} className="mx-auto mb-3 opacity-50" />
                <div>请选择执行任务的车辆</div>
                <div className="text-xs opacity-70 mt-1">或通过"派车中心"分配</div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Map + Actions */}
        <div className="col-span-5 flex flex-col gap-3 min-h-0">
          {/* Map */}
          <div className="flex-1 bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden min-h-0">
            {terminalCase && terminalAmbulance ? (
              <MapContainer
                center={[
                (terminalCase.incidentLocation.lat + terminalAmbulance.location.lat) / 2,
                (terminalCase.incidentLocation.lng + terminalAmbulance.location.lng) / 2,
              ]}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {terminalCase.status !== 'transferred' && terminalAssignment?.hospitalId && (
                  <Polyline
                    positions={[
                      [terminalAmbulance.location.lat, terminalAmbulance.location.lng],
                      [
                        state.hospitals.find(h => h.id === terminalAssignment.hospitalId)?.location.lat || 0,
                        state.hospitals.find(h => h.id === terminalAssignment.hospitalId)?.location.lng || 0,
                      ],
                    ]}
                    pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '10, 8' }}
                  />
                )}
                {terminalCase.status !== 'arrived' && terminalCase.status !== 'transferred' && (
                  <Polyline
                    positions={[
                      [terminalAmbulance.location.lat, terminalAmbulance.location.lng],
                      [terminalCase.incidentLocation.lat, terminalCase.incidentLocation.lng],
                    ]}
                    pathOptions={{ color: terminalCase.priority === 'red' ? '#dc2626' : terminalCase.priority === 'yellow' ? '#f59e0b' : '#3b82f6', weight: 5, dashArray: '12, 6' }}
                  />
                )}
                <Marker position={[terminalCase.incidentLocation.lat, terminalCase.incidentLocation.lng]}
                  icon={L.divIcon({
                    className: '',
                    html: `<div style="width:28px;height:28px;background:${terminalCase.priority === 'red' ? '#dc2626' : terminalCase.priority === 'yellow' ? '#f59e0b' : '#16a34a'};border-radius:50%;box-shadow:0 0 0 4px rgba(255,255,255,0.3),0 0 20px ${terminalCase.priority === 'red' ? '#dc2626' : terminalCase.priority === 'yellow' ? '#f59e0b' : '#16a34a'};display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                  })}
                >
                  <Popup><div className="text-sm font-bold">📍 事发地点</div></Popup>
                </Marker>
                {terminalAssignment?.hospitalId && (
                  <Marker
                    position={[
                      state.hospitals.find(h => h.id === terminalAssignment.hospitalId)?.location.lat || 0,
                      state.hospitals.find(h => h.id === terminalAssignment.hospitalId)?.location.lng || 0,
                    ]}
                    icon={L.divIcon({
                      className: '',
                      html: `<div style="width:32px;height:32px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:3px solid #16a34a;">🏥</div>`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 28],
                    })}
                  >
                    <Popup>{state.hospitals.find(h => h.id === terminalAssignment.hospitalId)?.name}</Popup>
                  </Marker>
                )}
                <Marker
                  position={[terminalAmbulance.location.lat, terminalAmbulance.location.lng]}
                  icon={L.divIcon({
                    className: '',
                    html: `<div style="width:36px;height:36px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 0 3px white,0 4px 12px rgba(0,0,0,0.3);border:2px solid #2563eb;">🚑</div>`,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                  })}
                >
                  <Popup>{terminalAmbulance.plateNumber}</Popup>
                </Marker>
              </MapContainer>
            ) : (
              <MapContainer center={[CITY_CENTER.lat, CITY_CENTER.lng]} zoom={11} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </MapContainer>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-400 font-semibold">案件进度</div>
              {terminalAssignment && (
                <div className="text-xs text-slate-400">
                接警后 {formatDistanceToNow(new Date(terminalCase!.receivedAt), { locale: zhCN })}
                {terminalAssignment.acceptedAt ? (' · 接单后 ' + formatDistanceToNow(new Date(terminalAssignment.acceptedAt), { locale: zhCN })) : ''}
              </div>
            )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { key: 'dispatching', label: '接单', icon: <CheckCircle size={16} /> },
                { key: 'enroute', label: '出发', icon: <Send size={16} /> },
                { key: 'arrived', label: '到达', icon: <MapPin size={16} /> },
                { key: 'transferred', label: '送达', icon: <CheckCircle size={16} /> },
              ].map((step, i) => {
                const statuses = ['dispatching', 'enroute', 'arrived', 'transferred'];
                const currentIdx = statuses.indexOf(terminalCase?.status || '');
                const done = currentIdx >= i || (terminalAssignment?.acceptedAt && i === 0);
                const current = statuses.indexOf(terminalCase?.status || '') === i - 1;
                return (
                  <button
                    key={step.key}
                    disabled={!terminalCase || (!done && !current)}
                    onClick={() => {
                      if (!terminalCase) return;
                      if (i === 0 && !terminalAssignment?.acceptedAt) {
                        handleAccept();
                      } else if (i === 1 && terminalCase.status === 'enroute') {
                        updateCaseStatus(terminalCase.id, 'arrived');
                      } else if (i === 2 && terminalCase.status === 'arrived') {
                        updateCaseStatus(terminalCase.id, 'transferred');
                      } else if (i === 3 && terminalCase.status === 'transferred') {
                        updateCaseStatus(terminalCase.id, 'completed');
                      }
                    }}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all',
                      done ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                      current ? 'bg-blue-500 text-white shadow-lg shadow-blue-900/40 animate-pulse' :
                      'bg-slate-700/60 text-slate-500 border border-slate-600/40 cursor-not-allowed'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-current opacity-90">{step.icon}</div>
                    {step.label}
                    {done && <div className="text-[9px] opacity-80">✓ 完成</div>}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2 pt-3 border-t border-slate-700/50">
              <button
                onClick={() => setReinforceOpen(true)}
                disabled={!terminalCase || terminalAssignment?.reinforecementRequested}
                className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-400 border border-amber-500/40 disabled:cursor-not-allowed rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck size={15} />
                {terminalAssignment?.reinforecementRequested ? '增援已请求' : '请求增援'}
              </button>
              <button className="flex-1 bg-slate-700/60 hover:bg-slate-600/80 text-slate-200 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
                <PhoneCall size={15} /> 联系调度中心
              </button>
            </div>
          </div>
        </div>

        {/* Right: Vital Signs */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Activity size={16} className="text-red-400" />
                实时生命体征
              </h4>
              {latestSigns && (
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            {latestSigns ? (
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar min-h-0">
                {/* ECG */}
                <div className="h-20 bg-gradient-to-r from-slate-900 to-black rounded-xl overflow-hidden relative shrink-0">
                  <div className="absolute inset-0 flex items-center px-1">
                    <svg className="w-full h-14" viewBox="0 0 400 56" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        points={Array.from({ length: 80 }, (_, i) => `${i * 5},${28 + (latestSigns.ecgData?.[i % 50] || Math.random() - 0.5) * 20}`).join(' ')}
                      />
                    </svg>
                  </div>
                  <div className="absolute top-1.5 right-2 text-[9px] text-cyan-400 font-mono">ECG Ⅱ</div>
                </div>
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  {[
                    { label: '心率 HR', value: latestSigns.heartRate, unit: 'bpm', color: 'text-red-400', icon: Heart, bg: 'bg-red-500/10', border: 'border-red-500/30' },
                    { label: '血氧 SpO2', value: `${latestSigns.oxygenSaturation}`, unit: '%', color: 'text-sky-400', icon: Wind, bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
                    { label: '血压 NIBP', value: `${latestSigns.bloodPressureSystolic}/${latestSigns.bloodPressureDiastolic}`, unit: 'mmHg', color: 'text-blue-400', icon: Activity, bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
                    { label: '呼吸 RR', value: latestSigns.respiratoryRate, unit: '/min', color: 'text-emerald-400', icon: Wind, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
                    { label: '体温 Temp', value: latestSigns.temperature, unit: '℃', color: 'text-amber-400', icon: Thermometer, bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
                    { label: '意识 GCS', value: latestSigns.consciousness === 'alert' ? '清醒' : latestSigns.consciousness === 'verbal' ? '语言' : latestSigns.consciousness === 'painful' ? '疼痛' : '无', unit: '', color: 'text-violet-400', icon: User, bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
                  ].map(v => {
                    const Icon = v.icon;
                    return (
                      <div key={v.label} className={clsx('rounded-xl p-2.5 border', v.bg, v.border)}>
                        <div className={clsx('text-[10px] flex items-center justify-between', v.color)}>
                          <span className="flex items-center gap-1"><Icon size={10} />{v.label}</span>
                        </div>
                        <div className={clsx('mt-0.5 font-bold', v.color)}>
                          <span className="text-xl">{v.value}</span>
                          <span className="text-[10px] font-normal ml-0.5 opacity-75">{v.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trend */}
                {vitalSigns.length > 1 && (
                  <div className="mt-2 shrink-0">
                  <div className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock size={10} /> 历史趋势 (最近 {Math.min(vitalSigns.length, 10)} 条)
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 overflow-x-auto custom-scrollbar">
                    <div className="flex gap-0.5 items-end h-14 min-w-[280px]">
                      {vitalSigns.slice(-14).map((v, i) => {
                        const normHR = Math.min(1, Math.max(0.1, (v.heartRate - 50) / 100));
                        return (
                          <div key={i} className="flex-1" style={{ height: `${normHR * 100}%` }}>
                            <div className="w-full h-full bg-gradient-to-t from-red-500/80 to-red-400 rounded-sm opacity-90" />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                      <span>{format(new Date(vitalSigns[0].timestamp), 'HH:mm:ss', { locale: zhCN })}</span>
                      <span>HR 趋势</span>
                      <span>{format(new Date(vitalSigns[vitalSigns.length - 1].timestamp), 'HH:mm:ss', { locale: zhCN })}</span>
                    </div>
                  </div>
                </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-center text-sm flex-col">
                <Activity size={40} className="mb-2 opacity-50" />
                <div>暂无生命体征数据</div>
                <div className="text-xs opacity-70 mt-1">到达现场后开始传输</div>
              </div>
            )}
          </div>

          {/* Destination Hospital */}
          {terminalAssignment?.hospitalId && (
            <div className="shrink-0 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur rounded-2xl border border-emerald-500/30 p-4">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-2">
                🏥 目的地医院
              </div>
              {(() => {
                const h = state.hospitals.find(x => x.id === terminalAssignment.hospitalId);
                if (!h) return null;
                return (
                  <div>
                    <div className="text-white font-bold">{h.name}</div>
                    <div className="text-xs text-slate-400">{h.level === 'tertiary' ? '三级甲等' : '二级'} · {h.location.district}</div>
                    <div className="mt-2 flex gap-2 text-[10px]">
                      <span className="bg-slate-800 px-2 py-1 rounded text-emerald-300">床位 {h.emergencyCapacity.availableBeds}/{h.emergencyCapacity.totalBeds}</span>
                      <span className="bg-slate-800 px-2 py-1 rounded text-amber-300">候诊 {h.emergencyCapacity.waitingPatients}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1.5">☎ {h.contact.emergencyHotline}</div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Reinforce Modal */}
      {reinforceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
            <div className="bg-amber-500/20 text-amber-400 px-5 py-3.5 flex items-center gap-2 border-b border-amber-500/30">
              <ShieldCheck />
              <h3 className="font-bold">请求增援 (需调度长审批)</h3>
              <button onClick={() => setReinforceOpen(false)} className="ml-auto"><XCircle size={18} /></button>
            </div>
            <div className="p-5">
              <div className="text-xs text-slate-400 mb-2">请说明增援原因</div>
              <select
                value={reinforceReason}
                onChange={e => setReinforceReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 mb-3"
              >
                <option value="">选择原因...</option>
                <option>病情加重，需要额外医护人员</option>
                <option>怀疑脊柱损伤，需要特殊担架</option>
                <option>现场伤员较多，需要多车支援</option>
                <option>交通事故，需要消防配合</option>
                <option>其他原因（请在下方备注</option>
              </select>
              <textarea
                rows={3}
                placeholder="详细说明情况..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              />
            </div>
            <div className="border-t border-slate-700 px-5 py-3 flex justify-end gap-2 bg-slate-900/50">
              <button onClick={() => setReinforceOpen(false)} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">取消</button>
              <button
                onClick={handleReinforceSubmit}
                disabled={!reinforceReason}
                className="px-5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-semibold rounded-lg flex items-center gap-1"
              >
                <Send size={14} /> 提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
