import { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../store/AppStateContext';
import CityMapView from '../components/CityMapView';
import {
  Phone, PhoneCall, User, MapPin, AlertTriangle, Clock, ShieldCheck,
  ChevronRight, Send, CheckCircle, XCircle, Truck, Activity,
  Heart, Thermometer, Wind, Eye, Users, Wrench, Map,
} from 'lucide-react';
import { assessPriority, getPriorityLabel, getPriorityColor } from '../utils/priorityAssessment';
import { generateDispatchPlan } from '../utils/dispatchAlgorithm';
import clsx from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { EmergencyCase } from '../types';

const statusLabel: Record<EmergencyCase['status'], { label: string; color: string }> = {
  waiting: { label: '待派车', color: 'bg-amber-500' },
  dispatching: { label: '派车中', color: 'bg-blue-500' },
  enroute: { label: '途中', color: 'bg-violet-500' },
  arrived: { label: '已到达', color: 'bg-emerald-500' },
  transferred: { label: '已送达', color: 'bg-indigo-500' },
  completed: { label: '已完成', color: 'bg-slate-400' },
  cancelled: { label: '已取消', color: 'bg-slate-300' },
};

export default function DispatchView() {
  const { state, dispatch, createNewCase, confirmDispatch, approveReinforcement } = useAppState();
  const [showNewCall, setShowNewCall] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'all'>('active');

  const [form, setForm] = useState({
    callerName: '',
    callerPhone: '',
    patientName: '',
    patientAge: 50,
    patientGender: 'male' as 'male' | 'female',
    symptomDesc: '',
    district: '东城区',
    address: '',
  });

  const assessment = useMemo(() => {
    if (!form.symptomDesc) return null;
    return assessPriority(form.symptomDesc, form.patientAge);
  }, [form.symptomDesc, form.patientAge]);

  const filteredCases = useMemo(() => {
    let list = [...state.cases];
    if (selectedTab === 'active') {
      list = list.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
    }
    return list.sort((a, b) => {
      const priorityOrder = { red: 0, yellow: 1, green: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    });
  }, [state.cases, selectedTab]);

  const selectedCase = state.currentCaseId ? state.cases.find(c => c.id === state.currentCaseId) : filteredCases[0];
  const selectedAssessment = selectedCase ? state.priorityAssessments[selectedCase.id] : undefined;
  const selectedPlan = selectedCase ? state.dispatchPlans[selectedCase.id] : undefined;
  const selectedAssignment = selectedCase?.currentAssignmentId
    ? selectedCase.assignments.find(a => a.id === selectedCase.currentAssignmentId)
    : undefined;
  const assignedAmbulance = selectedAssignment
    ? state.ambulances.find(a => a.id === selectedAssignment.ambulanceId)
    : undefined;

  useEffect(() => {
    if (!state.currentCaseId && filteredCases.length > 0) {
      dispatch({ type: 'SELECT_CASE', payload: filteredCases[0].id });
    }
  }, [filteredCases, state.currentCaseId]);

  const handleSubmit = () => {
    if (!form.symptomDesc || !form.patientName) return;
    const loc = {
      lat: 39.9042 + (Math.random() - 0.5) * 0.15,
      lng: 116.4074 + (Math.random() - 0.5) * 0.3,
      district: form.district,
      address: `${form.district}${form.address}`,
    };
    createNewCase({
      symptomDesc: form.symptomDesc,
      patientAge: form.patientAge,
      patientGender: form.patientGender,
      patientName: form.patientName,
      location: loc,
      callerName: form.callerName,
      callerPhone: form.callerPhone,
    });
    setForm({
      callerName: '', callerPhone: '', patientName: '', patientAge: 50, patientGender: 'male',
      symptomDesc: '', district: '东城区', address: '',
    });
    setShowNewCall(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-100">
      {/* Top Bar */}
      <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Phone className="text-red-600" size={18} />
            派车调度中心
          </h2>
          <div className="h-5 w-px bg-slate-200 mx-2" />
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setSelectedTab('active')}
              className={clsx('px-2.5 py-1 rounded-md font-medium', selectedTab === 'active' ? 'bg-red-50 text-red-700' : 'text-slate-500 hover:bg-slate-100')}
            >
              进行中 ({filteredCases.filter(c => c.status !== 'completed' && c.status !== 'cancelled').length})
            </button>
            <button
              onClick={() => setSelectedTab('all')}
              className={clsx('px-2.5 py-1 rounded-md font-medium', selectedTab === 'all' ? 'bg-red-50 text-red-700' : 'text-slate-500 hover:bg-slate-100')}
            >
              全部 ({state.cases.length})
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowNewCall(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold shadow-sm shadow-red-200 transition-all"
        >
          <PhoneCall size={14} />
          接入新来电
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0">
        {/* Cases List */}
        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-2">案件列表 (按优先级排序)</div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />红色</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" />黄色</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />绿色</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {filteredCases.length === 0 && <div className="p-12 text-center text-slate-400 text-sm">暂无案件</div>}
            {filteredCases.map(c => {
              const isSelected = c.id === selectedCase?.id;
              const elapsed = Math.floor((Date.now() - new Date(c.receivedAt).getTime()) / 1000);
              return (
                <div
                  key={c.id}
                  onClick={() => dispatch({ type: 'SELECT_CASE', payload: c.id })}
                  className={clsx(
                    'p-3 cursor-pointer transition-all',
                    isSelected ? 'bg-red-50/80 ring-1 ring-red-200' : 'hover:bg-slate-50',
                    c.status === 'waiting' && c.priority === 'red' && !isSelected ? 'flash-red' : ''
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={clsx(
                      'w-1.5 h-10 rounded-full shrink-0 mt-1',
                      c.priority === 'red' ? 'bg-red-500 animate-pulse' : c.priority === 'yellow' ? 'bg-amber-500' : 'bg-green-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-sm text-slate-800 truncate">{c.patientName}·{c.patientAge}岁</span>
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium text-white shrink-0', statusLabel[c.status].color)}>
                          {statusLabel[c.status].label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{c.symptomDescription}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400">{c.caseNumber}</span>
                        <span className={clsx(
                          'text-[10px] font-semibold',
                          c.status === 'waiting' && elapsed > 120 ? 'text-red-600 animate-pulse' :
                          c.status === 'waiting' && elapsed > 60 ? 'text-amber-600' : 'text-slate-400'
                        )}>
                          <Clock size={9} className="inline mr-0.5" />
                          {elapsed > 60 ? `${Math.floor(elapsed / 60)}分${elapsed % 60}秒` : `${elapsed}秒`}
                        </span>
                      </div>
                      {c.escalationLevel > 0 && (
                        <div className="mt-1 text-[10px] flex items-center gap-0.5 text-amber-600">
                          <AlertTriangle size={10} />
                          升级至 {c.escalationLevel === 1 ? '值班组长' : '调度长'}
                          {c.autoReassigned && <span className="text-red-600 ml-1">自动重派</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Case Detail */}
        <div className="col-span-5 flex flex-col gap-3 min-h-0">
          {selectedCase && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-bold text-white', getPriorityColor(selectedCase.priority))}>
                        {getPriorityLabel(selectedCase.priority)}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{selectedCase.caseNumber}</span>
                      {selectedCase.escalationLevel > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          升级 L{selectedCase.escalationLevel}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1.5">
                      {selectedCase.patientName} · {selectedCase.patientAge}岁 · {selectedCase.patientGender === 'male' ? '男' : selectedCase.patientGender === 'female' ? '女' : '未知'}
                    </h3>
                  </div>
                  <div className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold text-white', statusLabel[selectedCase.status].color)}>
                    {statusLabel[selectedCase.status].label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User size={14} className="text-slate-400" />
                      <span className="text-slate-500">报警人:</span> {selectedCase.callerName} / {selectedCase.callerPhone}
                    </div>
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin size={14} className="text-slate-400 mt-0.5" />
                      <div>
                        <span className="text-slate-500">地址:</span> {selectedCase.incidentLocation.district} {selectedCase.incidentLocation.address}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-slate-500">接警:</span> {format(new Date(selectedCase.receivedAt), 'MM-dd HH:mm:ss')}
                    </div>
                    {selectedCase.responseTimeSeconds && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-slate-500">响应:</span> {Math.floor(selectedCase.responseTimeSeconds / 60)}分{selectedCase.responseTimeSeconds % 60}秒
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">症状描述 / 主诉</div>
                  <p className="text-sm text-slate-800 font-medium">{selectedCase.symptomDescription}</p>
                  {selectedAssessment && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1 text-amber-700">
                        <ShieldCheck size={12} /> AI优先级评估 (得分: <b>{selectedAssessment.score}</b>)
                      </div>
                      <div>{selectedAssessment.rationale}</div>
                      {selectedAssessment.departmentNeeded && (
                        <div>推荐专科: <b className="text-indigo-700">{selectedAssessment.departmentNeeded}</b></div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dispatch Plan */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {(selectedCase.status === 'waiting' || selectedCase.status === 'dispatching') && selectedPlan ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Truck size={16} className="text-blue-600" />
                        智能派车方案
                      </h4>
                      <span className="text-xs text-slate-400">综合评分排序</span>
                    </div>

                    {selectedPlan.routingNotes.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {selectedPlan.routingNotes.map((n, i) => (
                          <div key={i} className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100">
                            {n}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {/* Primary */}
                      <div className="border-2 border-blue-500 bg-blue-50/60 rounded-xl p-3 relative overflow-hidden">
                        <div className="absolute top-2 right-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
                          推荐方案 #{selectedPlan.primary?.totalScore || 0}分
                        </div>
                        {selectedPlan.primary ? (
                          <div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl border border-blue-100">🚑</div>
                              <div className="flex-1">
                                <div className="font-bold text-slate-800">{selectedPlan.primary.ambulance.plateNumber}</div>
                                <div className="text-xs text-slate-500">
                                  {selectedPlan.primary.ambulance.crew.doctorName}/{selectedPlan.primary.ambulance.crew.nurseName}
                                  · 司机{selectedPlan.primary.ambulance.driver.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {selectedPlan.primary.ambulance.vehicleType === 'advanced' ? '重症监护型' :
                                    selectedPlan.primary.ambulance.vehicleType === 'standard' ? '标准型' : '转运型'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">{selectedPlan.primary.etaToScene}<span className="text-xs font-normal">分</span></div>
                                <div className="text-xs text-slate-400">预计到达</div>
                                <div className="text-xs text-slate-400 mt-0.5">{selectedPlan.primary.distanceToScene} km</div>
                              </div>
                            </div>
                            {selectedPlan.primary.reasons.length > 0 && (
                              <div className="mt-2 text-[11px] text-slate-600 bg-white/70 rounded-lg p-2">
                                <b>选择理由:</b> {selectedPlan.primary.reasons.join('；')}
                              </div>
                            )}
                            {selectedPlan.recommendedHospital && (
                              <div className="mt-2 text-xs bg-white rounded-lg p-2 border border-indigo-100">
                                <span className="text-indigo-600 font-semibold">🏥 推荐送院:</span>
                                <span className="ml-1">{selectedPlan.recommendedHospital.name}</span>
                                <span className="text-slate-400 ml-2">({selectedPlan.recommendedHospital.level === 'tertiary' ? '三级' : '二级'})</span>
                              </div>
                            )}
                            {selectedCase.status === 'waiting' && (
                              <button
                                onClick={() => confirmDispatch(selectedCase.id)}
                                className="mt-3 w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2.5 rounded-lg font-bold shadow-sm shadow-blue-200 transition-all flex items-center justify-center gap-1.5"
                              >
                                <Send size={14} /> 确认派车 (120秒超时自动重派)
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-400 text-sm">暂无可用救护车</div>
                        )}
                      </div>

                      {/* Alternatives */}
                      {selectedPlan.alternatives.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                            <Users size={12} /> 备选方案
                          </div>
                          <div className="space-y-2">
                            {selectedPlan.alternatives.slice(0, 2).map((alt, i) => (
                              <div key={i} className="border border-slate-200 rounded-lg p-2.5 hover:border-slate-300 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl">🚑</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                      {alt.ambulance.plateNumber}
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{alt.totalScore}分</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">{alt.ambulance.crew.doctorName}·{alt.ambulance.driver.name}</div>
                                  </div>
                                  <div className="text-right text-xs">
                                    <div className="font-semibold text-slate-700">{alt.etaToScene}分</div>
                                    <div className="text-slate-400">{alt.distanceToScene}km</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : selectedAssignment && assignedAmbulance ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                        <Truck size={16} className="text-blue-600" /> 当前执行车辆
                      </h4>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-3xl border border-blue-100">🚑</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="text-lg font-bold text-slate-800">{assignedAmbulance.plateNumber}</h5>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                                {statusLabel[selectedCase.status].label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {assignedAmbulance.vehicleType === 'advanced' ? '🚨重症监护型' : assignedAmbulance.vehicleType === 'standard' ? '🚑标准型' : '🚐转运型'}
                              · 油量 {assignedAmbulance.fuelLevel}% · 里程 {assignedAmbulance.mileage}km
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                            <div className="text-slate-400 mb-1">医师</div>
                            <div className="font-semibold text-slate-700">{assignedAmbulance.crew.doctorName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{assignedAmbulance.crew.doctorPhone}</div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                            <div className="text-slate-400 mb-1">护士</div>
                            <div className="font-semibold text-slate-700">{assignedAmbulance.crew.nurseName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{assignedAmbulance.crew.nursePhone}</div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                            <div className="text-slate-400 mb-1">司机</div>
                            <div className="font-semibold text-slate-700">{assignedAmbulance.driver.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{assignedAmbulance.driver.phone}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              dispatch({ type: 'SET_VIEW', payload: 'ambulance-terminal' });
                              dispatch({ type: 'SET_TERMINAL_CASE', payload: selectedCase.id });
                            }}
                            className="flex-1 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye size={14} /> 查看车载终端
                          </button>
                          {selectedAssignment.reinforecementRequested && selectedAssignment.reinforecementApproved === undefined && (
                            <>
                              <button
                                onClick={() => approveReinforcement(selectedCase.id, selectedAssignment.id, true)}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                              >
                                <CheckCircle size={14} /> 调度长批准
                              </button>
                              <button
                                onClick={() => approveReinforcement(selectedCase.id, selectedAssignment.id, false)}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                              >
                                <XCircle size={14} /> 驳回
                              </button>
                            </>
                          )}
                          {!selectedAssignment.reinforecementRequested && ['enroute', 'arrived'].includes(selectedCase.status) && (
                            <button
                              className="flex-1 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1 cursor-not-allowed"
                              disabled
                            >
                              <ShieldCheck size={14} /> 无增援请求
                            </button>
                          )}
                        </div>
                        {selectedAssignment.reinforecementRequested && (
                          <div className={'mt-3 text-xs border rounded-lg p-3 flex items-start gap-2 ' + (
                            selectedAssignment.reinforecementApproved === true ? 'bg-green-50 border-green-200' :
                            selectedAssignment.reinforecementApproved === false ? 'bg-red-50 border-red-200' :
                            'bg-amber-50 border-amber-200'
                          )}>
                            <AlertTriangle size={16} className={clsx(
                              selectedAssignment.reinforecementApproved === true ? 'text-green-600' :
                              selectedAssignment.reinforecementApproved === false ? 'text-red-600' :
                              'text-amber-600',
                              'mt-0.5 shrink-0'
                            )} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <b className={
                                  selectedAssignment.reinforecementApproved === true ? 'text-green-700' :
                                  selectedAssignment.reinforecementApproved === false ? 'text-red-700' :
                                  'text-amber-700'
                                }>
                                  {selectedAssignment.reinforecementApproved === true ? '✓ 增援请求已批准 · 已自动补派备选救护车' :
                                   selectedAssignment.reinforecementApproved === false ? '✗ 增援请求已驳回' :
                                   '⏳ 增援请求待调度长审批'}
                                </b>
                                {selectedAssignment.approvedAt && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {format(new Date(selectedAssignment.approvedAt), 'HH:mm:ss')}
                                  </span>
                                )}
                              </div>
                              <div>请求原因: {selectedAssignment.notes || '未注明原因'}</div>
                              {selectedAssignment.reinforecementApproved === true && (
                                <div className="mt-1 text-[11px] text-green-700 font-medium">
                                  审批人: 调度长（自动生成补派车辆assignment）
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 增援派车列表（如果有） */}
                        {selectedCase.assignments.length > 1 && (
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1 font-medium">
                              <Users size={12} /> 本次案件全部派出车辆 ({selectedCase.assignments.length})
                            </div>
                            <div className="space-y-2">
                              {selectedCase.assignments.map((a, idx) => {
                                const amb = state.ambulances.find(x => x.id === a.ambulanceId);
                                return (
                                  <div key={a.id} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/60">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="text-lg">{a.reinforecementAssignment ? '🚨' : idx === 0 ? '🚑' : '🚐'}</div>
                                        <div>
                                          <div className="text-sm font-semibold text-slate-800">
                                            {amb?.plateNumber || a.ambulanceId}
                                            {idx === 0 && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">主派</span>}
                                            {a.reinforecementAssignment && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">增援补派</span>}
                                          </div>
                                          <div className="text-[11px] text-slate-500">
                                            {amb?.crew.doctorName} · 司机{amb?.driver.name}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right text-[11px] text-slate-500">
                                        {a.assignedAt && <div>派车 {format(new Date(a.assignedAt), 'HH:mm:ss')}</div>}
                                        {a.acceptedAt && <div>接单 {format(new Date(a.acceptedAt), 'HH:mm:ss')}</div>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                        <Clock size={16} className="text-indigo-600" /> 案件时间线
                      </h4>
                      <div className="relative pl-6 space-y-4">
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                        {[
                          { label: '接警', time: selectedCase.receivedAt, done: true, icon: <PhoneCall size={12} />, color: 'bg-slate-500' },
                          { label: '派车', time: selectedCase.dispatchedAt, done: !!selectedCase.dispatchedAt, icon: <Send size={12} />, color: 'bg-blue-500' },
                          { label: '到达现场', time: selectedCase.sceneArrivalTime, done: !!selectedCase.sceneArrivalTime, icon: <MapPin size={12} />, color: 'bg-violet-500' },
                          { label: '送达医院', time: selectedCase.hospitalArrivalTime, done: !!selectedCase.hospitalArrivalTime, icon: <CheckCircle size={12} />, color: 'bg-emerald-500' },
                          { label: '完成/关闭', time: selectedCase.closedAt, done: !!selectedCase.closedAt, icon: <XCircle size={12} />, color: 'bg-slate-400' },
                        ].map((s, i) => (
                          <div key={i} className="relative">
                            <div className={clsx(
                              'absolute -left-5 top-0 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm',
                              s.done ? s.color : 'bg-slate-200 text-slate-400'
                            )}>
                              {s.icon}
                            </div>
                            <div>
                              <div className={clsx('text-sm font-semibold', s.done ? 'text-slate-800' : 'text-slate-400')}>
                                {s.label}
                              </div>
                              <div className="text-xs text-slate-400">
                                {s.time ? format(new Date(s.time), 'HH:mm:ss') : '--:--:--'}
                                {s.time && i > 0 && i < 4 && (
                                  <span className="ml-2 text-green-600">
                                    +{formatDistanceToNow(new Date(s.time), { locale: zhCN })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vital signs */}
                    {selectedCase.vitalSigns && selectedCase.vitalSigns.length > 0 ? (
                      <div>
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                          <Activity size={16} className="text-red-500" /> 实时生命体征
                          <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            ● 实时传输中
                          </span>
                        </h4>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { label: '心率', value: selectedCase.vitalSigns.at(-1)?.heartRate, unit: 'bpm', icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
                            { label: '血压', value: `${selectedCase.vitalSigns.at(-1)?.bloodPressureSystolic}/${selectedCase.vitalSigns.at(-1)?.bloodPressureDiastolic}`, unit: 'mmHg', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
                            { label: '血氧', value: selectedCase.vitalSigns.at(-1)?.oxygenSaturation, unit: '%', icon: Wind, color: 'text-sky-500', bg: 'bg-sky-50' },
                            { label: '呼吸', value: selectedCase.vitalSigns.at(-1)?.respiratoryRate, unit: '次/分', icon: Wind, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                            { label: '体温', value: selectedCase.vitalSigns.at(-1)?.temperature, unit: '℃', icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50' },
                          ].map(v => {
                            const Icon = v.icon;
                            return (
                              <div key={v.label} className={clsx('rounded-lg p-2.5 border', v.bg, 'border-white shadow-sm')}>
                                <div className={clsx('text-[10px] flex items-center gap-0.5', v.color)}>
                                  <Icon size={10} /> {v.label}
                                </div>
                                <div className="text-lg font-bold text-slate-800 mt-0.5">{v.value ?? '--'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">{v.unit}</span></div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Mini ECG */}
                        <div className="mt-2 h-14 bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg overflow-hidden relative">
                          <div className="absolute inset-0 flex items-center px-2 opacity-80">
                            <svg className="w-full h-8" viewBox="0 0 400 32" preserveAspectRatio="none">
                              <polyline
                                fill="none"
                                stroke="#22d3ee"
                                strokeWidth="1.5"
                                points={Array.from({ length: 100 }, (_, i) => `${i * 4},${16 + (selectedCase.vitalSigns?.at(-1)?.ecgData?.[i % 50] || Math.random() - 0.5) * 12}`).join(' ')}
                              />
                            </svg>
                          </div>
                          <div className="absolute top-1 right-2 text-[9px] text-cyan-300 font-mono">ECG Lead II</div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-slate-200 py-4 px-4 text-center">
                        <Activity size={24} className="mx-auto text-slate-300 mb-1.5" />
                        <div className="text-sm text-slate-500">
                          {selectedCase.status === 'dispatching' ? '等待救护车接单后开始监测' :
                           selectedCase.status === 'waiting' ? '案件尚未派车' :
                           '生命体征数据连接中...'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          包含心率、血压、血氧、呼吸、体温 5 项参数
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedCase.status === 'completed' ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-3">
                      <CheckCircle className="text-green-500" size={32} />
                    </div>
                    <h4 className="font-bold text-slate-800">案件已完成</h4>
                    <p className="text-sm text-slate-500 mt-1">可前往案件管理查看详情</p>
                    <div className="mt-4 flex gap-2 justify-center">
                      <button
                        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'cases' })}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
                      >查看全部案件</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0">
          <div className="h-10 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Map size={14} className="text-red-500" />
              实时救援态势
            </h4>
            <span className="text-[10px] text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> LIVE
            </span>
          </div>
          <div className="flex-1 p-2 min-h-0">
            <CityMapView />
          </div>
        </div>
      </div>

      {/* New Call Modal */}
      {showNewCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="h-14 bg-gradient-to-r from-red-600 to-red-500 text-white px-5 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PhoneCall /> 急救电话接入
              </h3>
              <button onClick={() => setShowNewCall(false)} className="p-1.5 hover:bg-red-800/40 rounded-lg">
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><User size={12} /> 报警人姓名</label>
                  <input value={form.callerName} onChange={e => setForm(p => ({ ...p, callerName: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100" placeholder="请输入报警人姓名" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Phone size={12} /> 联系电话</label>
                  <input value={form.callerPhone} onChange={e => setForm(p => ({ ...p, callerPhone: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100" placeholder="13XXXXXXXXX" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1"><Heart size={12} className="text-red-500" /> 患者信息</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="text-xs font-semibold text-slate-600">患者姓名</label>
                    <input value={form.patientName} onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">年龄</label>
                    <input type="number" value={form.patientAge} onChange={e => setForm(p => ({ ...p, patientAge: +e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">性别</label>
                    <select value={form.patientGender} onChange={e => setForm(p => ({ ...p, patientGender: e.target.value as any }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 bg-white">
                      <option value="male">男</option><option value="female">女</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="text-xs font-semibold text-slate-600">所在区域</label>
                    <select value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 bg-white">
                      {['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-semibold text-slate-600">详细地址</label>
                    <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" placeholder="例如：XX路XX号XX小区X号楼" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Activity size={12} /> 症状描述 / 主诉 <span className="text-red-500">*</span></label>
                <textarea value={form.symptomDesc} onChange={e => setForm(p => ({ ...p, symptomDesc: e.target.value }))} rows={3} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100" placeholder="请详细描述患者症状，例如：突发胸痛伴大汗，持续约30分钟，既往有冠心病史..." />
              </div>

              {assessment && (
                <div className={clsx(
                  'rounded-xl p-4 border-2',
                  assessment.priority === 'red' ? 'bg-red-50 border-red-200' : assessment.priority === 'yellow' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className={assessment.priority === 'red' ? 'text-red-600' : assessment.priority === 'yellow' ? 'text-amber-600' : 'text-green-600'} />
                    <span className="font-bold text-slate-800">AI 优先级评估</span>
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-bold text-white', getPriorityColor(assessment.priority))}>
                      {getPriorityLabel(assessment.priority)} · {assessment.score}分
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{assessment.rationale}</p>
                  {assessment.keySymptoms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {assessment.keySymptoms.map(s => (
                        <span key={s} className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-end gap-2">
              <button onClick={() => setShowNewCall(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button
                onClick={handleSubmit}
                disabled={!form.symptomDesc || !form.patientName}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <ChevronRight size={16} /> 创建案件并生成派车方案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
