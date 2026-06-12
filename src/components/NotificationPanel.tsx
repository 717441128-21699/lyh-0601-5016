import { useAppState } from '../store/AppStateContext';
import { Bell, AlertCircle, AlertTriangle, XCircle, CheckCircle2, X, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppState();
  const sorted = [...state.notifications].slice(0, 30);

  const getIcon = (type: string) => {
    switch (type) {
      case 'danger': return <XCircle className="text-red-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'success': return <CheckCircle2 className="text-green-500" size={16} />;
      default: return <AlertCircle className="text-blue-500" size={16} />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'danger': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-[420px bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-slate-600" />
          <h3 className="font-bold text-slate-800">通知中心</h3>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
            {state.notifications.filter(n => !n.read).length} 未读
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: 'READ_ALL_NOTIFICATIONS' })}
            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-200"
          >全部已读</button>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">暂无通知</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sorted.map(n => (
              <li
                key={n.id}
                onClick={() => {
                  dispatch({ type: 'READ_NOTIFICATION', payload: n.id });
                  if (n.relatedCaseId) {
                    dispatch({ type: 'SELECT_CASE', payload: n.relatedCaseId });
                    dispatch({ type: 'SET_VIEW', payload: 'dispatch' });
                  }
                }}
                className={clsx(
                  'p-3 cursor-pointer transition-colors flex gap-3 border-l-4',
                  n.read ? 'border-transparent hover:bg-slate-50' : 'border-red-500 bg-slate-50 hover:bg-slate-100'
                )}
              >
                <div className={clsx('mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border', getBg(n.type))}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={clsx('text-sm font-semibold', n.read ? 'text-slate-700' : 'text-slate-900')}>
                      {n.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-0.5">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
