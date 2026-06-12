import { useMemo, useState } from 'react';
import { useAppState } from '../store/AppStateContext';
import {
  Search, Filter, FileText, CheckCircle, XCircle, Clock, Truck,
  Download, Eye, FilePlus, Receipt, ChevronRight, Download as IconDownload,
} from 'lucide-react';
import { getPriorityLabel, getPriorityColor } from '../utils/priorityAssessment';
import clsx from 'clsx';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EmergencyCase } from '../types';

const statusLabel: Record<EmergencyCase['status'], { label: string; color: string }> = {
  waiting: { label: '待派车', color: 'bg-amber-100 text-amber-700' },
  dispatching: { label: '派车中', color: 'bg-blue-100 text-blue-700' },
  enroute: { label: '途中', color: 'bg-violet-100 text-violet-700' },
  arrived: { label: '已到达', color: 'bg-emerald-100 text-emerald-700' },
  transferred: { label: '已送达', color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: '已完成', color: 'bg-slate-100 text-slate-700' },
  cancelled: { label: '已取消', color: 'bg-slate-50 text-slate-500' },
};

export default function CasesView() {
  const { state, dispatch, generateMedicalRecord, generateBilling } = useAppState();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDetail, setShowDetail] = useState<EmergencyCase | null>(null);

  const filtered = useMemo(() => {
    return state.cases
      .filter(c => {
        if (search && !c.patientName.includes(search) && !c.caseNumber.includes(search)) return false;
        if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }, [state.cases, search, priorityFilter, statusFilter]);

  const exportCaseDetail = (c: EmergencyCase) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('120 EMS Report', 20, 20);
    doc.setFontSize(11);
    doc.text('Case: ' + c.caseNumber, 20, 32);
    doc.text('Generated: ' + new Date().toLocaleString('zh-CN'), 130, 32, { align: 'right' } as any);
    const rows: string[][] = [
      ['Patient', c.patientName + ' / ' + c.patientAge + ' / ' + (c.patientGender === 'male' ? 'M' : c.patientGender === 'female' ? 'F' : '?')],
      ['Caller', c.callerName + ' / ' + c.callerPhone],
      ['Location', (c.incidentLocation.district || '') + ' ' + (c.incidentLocation.address || '')],
      ['Priority', getPriorityLabel(c.priority)],
      ['Symptom', c.symptomDescription.substring(0, 60)],
      ['Diagnosis', c.suspectedCondition],
      ['Received', format(new Date(c.receivedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })],
      ['Dispatch', c.dispatchedAt ? format(new Date(c.dispatchedAt), 'HH:mm:ss') : '--'],
      ['On Scene', c.sceneArrivalTime ? format(new Date(c.sceneArrivalTime), 'HH:mm:ss') : '--'],
      ['Response', c.responseTimeSeconds ? (Math.floor(c.responseTimeSeconds / 60) + 'm' + (c.responseTimeSeconds % 60) + 's') : '--'],
      ['Status', statusLabel[c.status].label],
    ];
    autoTable(doc, {
      startY: 40,
      head: [['Item', 'Details']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] },
    });
    doc.save('Case_' + c.caseNumber + '.pdf');
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-100">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <FileText className="text-red-600" /> 案件管理
          <span className="text-sm font-normal text-slate-400 ml-1">共 {state.cases.length} 条记录</span>
        </h2>
        <button
          onClick={() => {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('120急救中心案件总览报表', 14, 20);
            const body = state.cases.slice(0, 30).map(c => [
              c.caseNumber,
              c.patientName,
              `${c.patientAge}岁`,
              getPriorityLabel(c.priority),
              statusLabel[c.status].label,
              c.responseTimeSeconds ? `${Math.floor(c.responseTimeSeconds / 60)}m` : '--',
            ]);
            autoTable(doc, {
              startY: 30,
              head: [['编号', '患者', '年龄', '优先级', '状态', '响应']],
              body,
              headStyles: { fillColor: [220, 38, 38], textColor: 255 },
            });
            doc.save('案件列表.pdf');
          }}
          className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-sm px-3 py-1.5 rounded-lg text-slate-700 shadow-sm"
        >
          <Download size={14} /> 导出报表
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-3 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400"
            placeholder="搜索案件编号 / 患者姓名"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Filter size={14} className="text-slate-400" />
          <span className="text-slate-500">优先级:</span>
          {[
            { k: 'all', l: '全部' },
            { k: 'red', l: '红' },
            { k: 'yellow', l: '黄' },
            { k: 'green', l: '绿' },
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setPriorityFilter(f.k)}
              className={clsx(
                'px-2.5 py-1 rounded-md font-medium',
                priorityFilter === f.k
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >{f.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500">状态:</span>
          <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-md px-2 py-1 bg-white outline-none"
        >
          <option value="all">全部</option>
          <option value="waiting">待派车</option>
          <option value="enroute">途中</option>
          <option value="completed">已完成</option>
        </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 font-medium">案件编号</th>
              <th className="px-3 py-2.5 font-medium">患者</th>
              <th className="px-3 py-2.5 font-medium">优先级</th>
              <th className="px-3 py-2.5 font-medium">症状描述</th>
              <th className="px-3 py-2.5 font-medium">事发地点</th>
              <th className="px-3 py-2.5 font-medium">状态</th>
              <th className="px-3 py-2.5 font-medium">响应时长</th>
              <th className="px-3 py-2.5 font-medium">接警时间</th>
              <th className="px-3 py-2.5 font-medium text-right pr-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-16 text-slate-400">暂无匹配案件</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-mono font-medium text-slate-800">{c.caseNumber}</div>
                  <div className="text-[10px] text-slate-400">{c.callerPhone}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-800">{c.patientName}</div>
                  <div className="text-[11px] text-slate-400">{c.patientAge}岁·{c.patientGender === 'male' ? '男' : c.patientGender === 'female' ? '女' : '-'}</div>
                </td>
                <td className="px-3 py-3">
                  <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-medium text-white', getPriorityColor(c.priority))}>
                    {getPriorityLabel(c.priority)}
                  </span>
                  {c.escalationLevel > 0 && <div className="text-[10px] text-amber-600 mt-1">↑L{c.escalationLevel}</div>}
                </td>
                <td className="px-3 py-3 max-w-[260px]">
                  <div className="text-slate-600 text-xs line-clamp-1">{c.symptomDescription}</div>
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {c.incidentLocation.district}
                </td>
                <td className="px-3 py-3">
                  <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-medium', statusLabel[c.status].color)}>
                  {statusLabel[c.status].label}
                </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {c.responseTimeSeconds ? `${Math.floor(c.responseTimeSeconds / 60)}分${c.responseTimeSeconds % 60}秒` : '--'}
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {format(new Date(c.receivedAt), 'MM-dd HH:mm', { locale: zhCN })}
                </td>
                <td className="px-3 py-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        dispatch({ type: 'SELECT_CASE', payload: c.id });
                        dispatch({ type: 'SET_VIEW', payload: 'dispatch' });
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-blue-600"
                      title="查看派车"
                    >
                      <Truck size={14} />
                    </button>
                    <button
                      onClick={() => setShowDetail(c)}
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-indigo-600"
                      title="查看详情"
                    >
                      <Eye size={14} />
                    </button>
                    {c.status === 'completed' && !c.medicalRecordId && (
                      <button
                        onClick={() => generateMedicalRecord(c.id)}
                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-emerald-600"
                        title="生成病历"
                      >
                        <FilePlus size={14} />
                      </button>
                    )}
                    {c.status === 'completed' && !c.billingId && (
                      <button
                        onClick={() => generateBilling(c.id)}
                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-amber-600"
                        title="生成账单"
                      >
                        <Receipt size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => exportCaseDetail(c)}
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-red-600"
                      title="导出"
                    >
                      <IconDownload size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <FileText size={18} className="text-red-600" />
                案件详情 - {showDetail.caseNumber}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportCaseDetail(showDetail)}
                  className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                >
                  <Download size={12} /> 导出PDF
                </button>
                <button onClick={() => setShowDetail(null)} className="p-1.5 hover:bg-slate-200 rounded-lg">
                  <XCircle size={18} className="text-slate-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <h4 className="text-xs text-slate-500 font-semibold mb-1.5">患者信息</h4>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                    <div><span className="text-slate-500">姓名:</span> <b>{showDetail.patientName}</b></div>
                    <div><span className="text-slate-500">年龄:</span> {showDetail.patientAge}岁</div>
                    <div><span className="text-slate-500">性别:</span> {showDetail.patientGender === 'male' ? '男' : '女'}</div>
                    <div>
                      <span className="text-slate-500">优先级:</span>
                      <span className={clsx('ml-1 px-1.5 py-0.5 rounded text-xs font-medium text-white', getPriorityColor(showDetail.priority))}>
                        {getPriorityLabel(showDetail.priority)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-slate-500 font-semibold mb-1.5">报警信息</h4>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                    <div><span className="text-slate-500">报警人:</span> {showDetail.callerName}</div>
                    <div><span className="text-slate-500">电话:</span> {showDetail.callerPhone}</div>
                    <div><span className="text-slate-500">时间:</span> {format(new Date(showDetail.receivedAt), 'HH:mm:ss', { locale: zhCN })}</div>
                    <div>
                      <span className="text-slate-500">状态:</span>
                      <span className={clsx('ml-1 px-1.5 py-0.5 rounded text-xs font-medium', statusLabel[showDetail.status].color)}>
                        {statusLabel[showDetail.status].label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs text-slate-500 font-semibold mb-1.5">事发地点</h4>
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  {showDetail.incidentLocation.district} {showDetail.incidentLocation.address || ''}
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    [{showDetail.incidentLocation.lat.toFixed(4)}, {showDetail.incidentLocation.lng.toFixed(4)}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs text-slate-500 font-semibold mb-1.5">临床信息</h4>
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <div><b>主诉症状:</b> {showDetail.symptomDescription}</div>
                  <div className="mt-1"><b>疑似诊断:</b> {showDetail.suspectedCondition}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs text-slate-500 font-semibold mb-2">派车记录 ({showDetail.assignments.length})</h4>
                <div className="space-y-2">
                  {showDetail.assignments.map(a => {
                    const amb = state.ambulances.find(x => x.id === a.ambulanceId);
                    return (
                      <div key={a.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-lg shadow-sm">🚑</div>
                            <div>
                              <div className="font-semibold text-slate-800">{amb?.plateNumber || a.ambulanceId}</div>
                              <div className="text-[11px] text-slate-500">
                                {amb?.crew.doctorName} / {amb?.driver.name}</div>
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <div>派车 {format(new Date(a.assignedAt), 'HH:mm:ss', { locale: zhCN })}</div>
                            {a.acceptedAt && <div>接单 {format(new Date(a.acceptedAt), 'HH:mm:ss', { locale: zhCN })}</div>}
                            <div>评分: {a.score}分</div>
                          </div>
                        </div>
                        {a.reinforecementRequested && (
                          <div className="mt-2 text-[11px] bg-white rounded px-2 p-1.5 border border-amber-200 text-amber-700">
                            增援请求: {a.notes || '未说明原因'} ·
                            {a.reinforecementApproved ? ' ✓ 已批准' : ' 待审批'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {showDetail.assignments.length === 0 && (
                    <div className="text-slate-400 text-sm text-center py-4 bg-slate-50 rounded-lg">尚未派车</div>
                  )}
                </div>
              </div>

              {showDetail.vitalSigns && showDetail.vitalSigns.length > 0 && (
                <div>
                  <h4 className="text-xs text-slate-500 font-semibold mb-2">生命体征记录</h4>
                  <div className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto">
                    <table className="w-full">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium">时间</th>
                          <th className="px-2 py-1">心率</th>
                          <th className="px-2 py-1">血压</th>
                          <th className="px-2 py-1">血氧</th>
                          <th className="px-2 py-1">呼吸</th>
                          <th className="px-2 py-1">体温</th>
                          <th className="px-2 py-1">意识</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showDetail.vitalSigns.slice(-10).map((v, i) => (
                          <tr key={i} className="border-t border-slate-200">
                            <td className="px-2 py-1">{format(new Date(v.timestamp), 'HH:mm:ss', { locale: zhCN })}</td>
                            <td className="px-2 py-1 text-center">{v.heartRate}</td>
                            <td className="px-2 py-1 text-center">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</td>
                            <td className="px-2 py-1 text-center">{v.oxygenSaturation}%</td>
                            <td className="px-2 py-1 text-center">{v.respiratoryRate}</td>
                            <td className="px-2 py-1 text-center">{v.temperature}</td>
                            <td className="px-2 py-1 text-center">
                              {v.consciousness === 'alert' ? '清醒' : v.consciousness === 'verbal' ? '对语言有反应' : v.consciousness === 'painful' ? '对疼痛有反应' : '无反应'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {showDetail.medicalRecordId && (
                <div>
                  <h4 className="text-xs text-slate-500 font-semibold mb-1.5">电子病历</h4>
                  {(() => {
                    const mr = state.medicalRecords.find(m => m.id === showDetail.medicalRecordId);
                    if (mr) return (
                      <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs space-y-1.5 font-serif">
                        <div><b>初步诊断:</b> {mr.preliminaryDiagnosis}</div>
                        <div><b>现病史:</b> {mr.presentIllness}</div>
                        <div><b>既往史:</b> {mr.pastHistory}</div>
                        <div><b>现场处理:</b> {mr.treatmentOnScene}</div>
                        <div><b>签名:</b> {mr.doctorSignature}</div>
                      </div>
                    );
                    return <div className="text-xs text-slate-400 p-3">暂无病历详情</div>;
                  })()}
                </div>
              )}
              {showDetail.billingId && (
                <div>
                  <h4 className="text-xs text-slate-500 font-semibold mb-1.5">收费结算</h4>
                  {(() => {
                    const bill = state.billings.find(b => b.id === showDetail.billingId);
                    if (!bill) return null;
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="space-y-1 text-xs mb-3">
                          {bill.items.map(it => (
                            <div key={it.id} className="flex justify-between">
                              <span>{it.name} x {it.quantity}</span>
                              <span className="font-mono">¥{(it.quantity * it.unitPrice)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-amber-200 pt-2 text-xs space-y-1">
                          <div className="flex justify-between"><span>合计:</span><b>¥{bill.totalAmount}</b></div>
                          <div className="flex justify-between text-slate-500"><span>医保报销:</span>-¥{bill.insuranceCoverage}</div>
                          <div className="flex justify-between text-amber-700 font-bold"><span>个人支付:</span>¥{bill.patientPayable}</div>
                          <div className="flex justify-between"><span>状态:</span>
                            <span className={bill.paymentStatus === 'paid' ? 'text-green-600' : bill.paymentStatus === 'partial' ? 'text-amber-600' : 'text-red-600'}>
                              {bill.paymentStatus === 'paid' ? '已付' : bill.paymentStatus === 'partial' ? '部分支付' : '待支付'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex justify-end">
              <button onClick={() => setShowDetail(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
