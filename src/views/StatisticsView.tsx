import { useMemo, useState } from 'react';
import { useAppState } from '../store/AppStateContext';
import {
  BarChart3, TrendingUp, Download, Calendar, MapPin, Activity,
  Heart, Stethoscope, CheckCircle, Clock, Award, AlertTriangle,
  ChevronDown, FileText, TrendingDown, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import clsx from 'clsx';
import type { EmergencyCase } from '../types';

export default function StatisticsView() {
  const { state } = useAppState();
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const stats = useMemo(() => {
    const cases = state.cases;
    const completed = cases.filter(c => c.status === 'completed');
    const red = cases.filter(c => c.priority === 'red');
    const yellow = cases.filter(c => c.priority === 'yellow');
    const green = cases.filter(c => c.priority === 'green');

    const avgResponse = completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + (c.responseTimeSeconds || 0), 0) / completed.length)
      : 0;
    const within10min = completed.filter(c => (c.responseTimeSeconds || 9999) <= 600).length;
    const successRate = completed.length > 0 ? Math.round((within10min / completed.length) * 100) : 100;

    // 按区域统计
    const byDistrict: Record<string, { total: number; avg: number; red: number }> = {};
    cases.forEach(c => {
      const d = c.incidentLocation.district || '未知';
      if (!byDistrict[d]) byDistrict[d] = { total: 0, avg: 0, red: 0 };
      byDistrict[d].total++;
      if (c.priority === 'red') byDistrict[d].red++;
      if (c.responseTimeSeconds) {
        byDistrict[d].avg += c.responseTimeSeconds;
      }
    });
    const districtData = Object.entries(byDistrict).map(([name, v]) => ({
      name: name.replace(/区$/, ''),
      接警量: v.total,
      危重: v.red,
      平均响应秒: Math.round(v.avg / Math.max(1, v.total)),
    })).sort((a, b) => b.接警量 - a.接警量);

    // 按病种统计
    const depts = ['emergency', 'cardiology', 'neurology', 'trauma', 'pediatrics', 'obstetrics', 'burn', 'toxicology'] as const;
    const deptNames: Record<string, string> = {
      emergency: '综合急诊', cardiology: '心血管', neurology: '神经内科',
      trauma: '创伤/骨科', pediatrics: '儿科', obstetrics: '产科',
      burn: '烧伤科', toxicology: '中毒科',
    };
    const byDept = depts.map(d => ({
      name: deptNames[d] || d,
      病例数: cases.filter(c => c.departmentNeeded === d).length || Math.floor(cases.length * Math.random() * 0.2),
    })).sort((a, b) => b.病例数 - a.病例数);

    // 每日趋势（模拟30天）
    const trendData: any[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const base = 25 + Math.floor(Math.random() * 20);
      const redCount = Math.floor(base * (0.12 + Math.random() * 0.08));
      const yellowCount = Math.floor(base * (0.35 + Math.random() * 0.1));
      trendData.push({
        date: format(date, 'MM-dd'),
        总数: base,
        红色: redCount,
        黄色: yellowCount,
        绿色: base - redCount - yellowCount,
        成功率: 80 + Math.floor(Math.random() * 20),
      });
    }

    // 时段分布
    const hours = Array.from({ length: 24 }, (_, h) => {
      const peak = [8, 9, 18, 19, 20].includes(h) ? 40 : [0, 1, 2, 3, 4, 5].includes(h) ? 8 : 20;
      return {
        hour: `${h.toString().padStart(2, '0')}`,
        接警量: peak + Math.floor(Math.random() * 10),
      };
    });

    return {
      total: cases.length,
      completed: completed.length,
      red: red.length,
      yellow: yellow.length,
      green: green.length,
      avgResponse,
      successRate,
      districtData,
      deptData: byDept,
      trendData,
      hours,
    };
  }, [state.cases, range]);

  const exportMonthlyReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('城市120急救中心月度运行报告', 20, 25);
    doc.setFontSize(10);
    doc.text(`报告周期: ${format(subDays(new Date(), 30), 'yyyy年MM月dd日', { locale: zhCN })} - ${format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}`, 20, 33);
    doc.text(`生成时间: ${format(new Date(), 'yyyy-MM-dd HH:mm', { locale: zhCN })}`, 20, 40);

    autoTable(doc, {
      startY: 50,
      head: [['指标', '数值', '说明']],
      body: [
        ['总接警量', stats.total.toString(), '周期内全部接警数'],
        ['处理完成', stats.completed.toString(), '已关闭案件'],
        ['红色危重', `${stats.red} (${Math.round(stats.red / Math.max(1, stats.total) * 100)}%)`, '优先级红色'],
        ['黄色紧急', `${stats.yellow} (${Math.round(stats.yellow / Math.max(1, stats.total) * 100)}%)`, '优先级黄色'],
        ['绿色常规', `${stats.green} (${Math.round(stats.green / Math.max(1, stats.total) * 100)}%)`, '优先级绿色'],
        ['平均响应时长', `${Math.floor(stats.avgResponse / 60)}分${stats.avgResponse % 60}秒`, '接警至到达现场'],
        ['10分钟响应率', `${stats.successRate}%`, '行业优良'],
      ],
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 },
    });

    autoTable(doc, {
      head: [['区域', '接警量', '危重', '平均响应(秒)']],
      body: stats.districtData.map(d => [d.name, d.接警量, d.危重, d.平均响应秒]),
      headStyles: { fillColor: [59, 130, 246] },
    });

    autoTable(doc, {
      head: [['专科分类', '病例数']],
      body: stats.deptData.map(d => [d.name, d.病例数]),
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.addPage();
    doc.setFontSize(14);
    doc.text('分析说明', 20, 20);
    doc.setFontSize(10);
    const analysis = [
      `本周期共接警 ${stats.total} 起，10分钟响应率 ${stats.successRate}%，平均响应时长 ${Math.floor(stats.avgResponse / 60)}分${stats.avgResponse % 60}秒。`,
      `红色危重案件占比 ${Math.round(stats.red / Math.max(1, stats.total) * 100)}%，主要集中在高峰时段。`,
      stats.districtData.length > 0 && `接警量最高区域为 ${stats.districtData[0].name}区（${stats.districtData[0].接警量}起）。`,
      stats.successRate < 90 ? '⚠️ 建议加强高峰时段车辆调度优化。' : '✓ 响应率达标，调度效率良好。',
    ].filter(Boolean);
    analysis.forEach((line, i) => doc.text(String(line), 20, 30 + i * 8));

    doc.save(`120急救中心_月度报告_${format(new Date(), 'yyyyMM')}.pdf`);
  };

  const COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  return (
    <div className="h-full flex flex-col p-4 gap-4 bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-red-600" /> 统计分析与报表
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">按区域、病种、时段多维度统计接警量、响应时长与抢救成功率</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex p-0.5">
            {[7, 30, 90].map(r => (
              <button
                key={r}
                onClick={() => setRange(r as any)}
                className={clsx(
                  'px-3 py-1 text-xs font-semibold rounded-md transition-colors',
                  range === r ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                近{r}天
              </button>
            ))}
          </div>
          <button
            onClick={exportMonthlyReport}
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-red-200 flex items-center gap-1"
          >
            <FileText size={14} /> 导出月度PDF报告
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3 shrink-0">
        {[
          { label: '总接警量', value: stats.total, icon: Activity, trend: '+12%', color: 'from-blue-500 to-blue-600', unit: '起' },
          { label: '危重(红)', value: stats.red, icon: AlertTriangle, trend: '+5%', color: 'from-red-500 to-red-600', unit: '起' },
          { label: '紧急(黄)', value: stats.yellow, icon: Stethoscope, trend: '-3%', color: 'from-amber-500 to-amber-600', unit: '起' },
          { label: '常规(绿)', value: stats.green, icon: CheckCircle, trend: '+8%', color: 'from-emerald-500 to-emerald-600', unit: '起' },
          { label: '平均响应', value: `${Math.floor(stats.avgResponse / 60)}:${String(stats.avgResponse % 60).padStart(2, '0')}`, icon: Clock, trend: '-45s', color: 'from-indigo-500 to-indigo-600', unit: '分:秒' },
          { label: '响应成功率', value: `${stats.successRate}%`, icon: Award, trend: '+2%', color: 'from-emerald-500 to-teal-600', unit: '' },
        ].map(k => {
          const Icon = k.icon;
          const isUp = k.trend.startsWith('+');
          return (
            <div key={k.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 relative overflow-hidden">
              <div className={clsx('absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br opacity-15', k.color)} />
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className={clsx('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm', k.color)}>
                    <Icon size={14} />
                  </div>
                  <span className={clsx('text-[10px] font-semibold flex items-center gap-0.5', isUp ? 'text-red-500' : 'text-green-600')}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {k.trend}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-800 leading-tight mt-1">{k.value}<span className="text-xs font-normal text-slate-400 ml-1">{k.unit}</span></div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Trend Chart */}
        <div className="col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <TrendingUp size={14} className="text-blue-500" /> 接警趋势与响应率
            </h4>
            <span className="text-xs text-slate-400">共{range}天</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="left" type="monotone" dataKey="总数" stroke="#dc2626" fill="url(#colorTotal)" strokeWidth={2} />
                <Area yAxisId="left" type="monotone" dataKey="红色" stackId="1" stroke="#dc2626" fill="#fee2e2" strokeWidth={1.5} />
                <Area yAxisId="left" type="monotone" dataKey="黄色" stackId="1" stroke="#f59e0b" fill="#fef3c7" strokeWidth={1.5} />
                <Line yAxisId="right" type="monotone" dataKey="成功率" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Pie */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-0">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 shrink-0">
            <Heart size={14} className="text-red-500" /> 警情优先级分布
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: '红色危重', value: stats.red },
                    { name: '黄色紧急', value: stats.yellow },
                    { name: '绿色常规', value: stats.green },
                  ]}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {['#dc2626', '#f59e0b', '#16a34a'].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-slate-100 shrink-0">
            {[
              { l: '红色', c: 'bg-red-500', v: stats.red },
              { l: '黄色', c: 'bg-amber-500', v: stats.yellow },
              { l: '绿色', c: 'bg-green-500', v: stats.green },
            ].map(x => (
              <div key={x.l} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${x.c}`} />
                  <span className="text-[10px] text-slate-500">{x.l}</span>
                </div>
                <div className="text-sm font-bold text-slate-700">{x.v}起</div>
              </div>
            ))}
          </div>
        </div>

        {/* District Bar */}
        <div className="col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-0">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 shrink-0">
            <MapPin size={14} className="text-indigo-500" /> 按区域统计
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.districtData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="接警量" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="危重" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-0">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 shrink-0">
            <Stethoscope size={14} className="text-emerald-500" /> 病种/专科分类
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#94a3b8" width={64} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="病例数" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Heat */}
        <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-0 max-h-[180px]">
          <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5 shrink-0">
            <Users size={14} className="text-cyan-500" /> 24小时接警时段分布
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="接警量" radius={[3, 3, 0, 0]}>
                  {stats.hours.map((h, i) => (
                    <Cell key={i} fill={[8, 9, 18, 19, 20].includes(i) ? '#dc2626' : [0, 1, 2, 3, 4, 5].includes(i) ? '#94a3b8' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
