import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { useAppState } from '../store/AppStateContext';
import { CITY_CENTER } from '../data/mockData';
import type { EmergencyCase } from '../types';
import { getPriorityLabel } from '../utils/priorityAssessment';

const ambulanceIcon = (status: string, priority?: string) => {
  const colorMap: Record<string, string> = {
    idle: '#22c55e',
    enroute_to_scene: '#3b82f6',
    on_scene: '#8b5cf6',
    enroute_to_hospital: '#ec4899',
    at_hospital: '#06b6d4',
    returning: '#f59e0b',
    maintenance: '#94a3b8',
  };
  const priColor = priority === 'red' ? '#ef4444' : priority === 'yellow' ? '#f59e0b' : '#22c55e';
  const bg = colorMap[status] || '#64748b';

  return L.divIcon({
    className: 'custom-ambulance-marker',
    html: `
      <div style="position:relative">
        ${priority ? `
          <div style="
            position:absolute;top:-4px;right:-4px;width:8px;height:8px;
            background:${priColor};border-radius:50%;
            box-shadow:0 0 0 2px white, 0 0 10px ${priColor};
            animation: pulse 1.5s infinite;
          "></div>
        ` : ''}
        <div style="
          width: 32px;height:32px;background:${bg};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          color:white;font-size:16px;
          box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 0 0 3px white;
          border: 2px solid ${bg};
        ">🚑</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const caseIcon = (priority: string) => {
  const bg = priority === 'red' ? '#dc2626' : priority === 'yellow' ? '#f59e0b' : '#16a34a';
  const border = priority === 'red' ? '#7f1d1d' : priority === 'yellow' ? '#92400e' : '#14532d';
  return L.divIcon({
    className: 'custom-case-marker',
    html: `
      <div style="
        width: 28px;height: 28px;background:${bg};
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        box-shadow: 0 0 20px ${bg};
        animation: pulse 2s infinite;
        border: 2px solid ${border};
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const hospitalIcon = (busyLevel: number) => {
  const color = busyLevel > 0.85 ? '#dc2626' : busyLevel > 0.65 ? '#f59e0b' : '#16a34a';
  return L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="position:relative">
        <div style="
          width: 34px;height:34px;background:white;border-radius:6px;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 10px rgba(0,0,0,0.2);
          border:3px solid ${color};
          font-size:20px;
        ">🏥</div>
        <div style="
          position:absolute;bottom:-3px;right:-3px;
          width:12px;height:12px;background:${color};
          border-radius:50%;border:2px solid white;
        "></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
  });
};

function AutoFit({ cases, ambulances, hospitals }: { cases: EmergencyCase[]; ambulances: any[]; hospitals: any[] }) {
  const map = useMap();
  useEffect(() => {
    const activePoints: [number, number][] = [];
    cases.filter(c => c.status !== 'completed' && c.status !== 'cancelled').forEach(c => {
      activePoints.push([c.incidentLocation.lat, c.incidentLocation.lng]);
    });
    ambulances.forEach(a => {
      activePoints.push([a.location.lat, a.location.lng]);
    });
    hospitals.forEach(h => {
      activePoints.push([h.location.lat, h.location.lng]);
    });
    if (activePoints.length > 1) {
      const bounds = L.latLngBounds(activePoints);
      map.fitBounds(bounds.pad(0.15));
    }
  }, []);
  return null;
}

export default function CityMapView() {
  const { state, dispatch } = useAppState();
  const activeCases = state.cases.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
  const idleAmbs = state.ambulances.filter(a => a.status === 'idle');
  const busyAmbs = state.ambulances.filter(a => a.status !== 'idle' && a.status !== 'maintenance');

  const hotspots = state.hospitals.map(h => {
    const avgBusy = h.departments.reduce((s, d) => s + d.busyLevel, 0) / Math.max(h.departments.length, 1);
    return { lat: h.location.lat, lng: h.location.lng, busy: avgBusy };
  });

  const routes: { from: [number, number]; to: [number, number]; color: string }[] = [];
  busyAmbs.forEach(a => {
    const c = state.cases.find(
      x => x.currentAssignmentId && a.currentCaseId === x.id && x.status !== 'completed'
    );
    if (c && a.status === 'enroute_to_scene') {
      routes.push({
        from: [a.location.lat, a.location.lng],
        to: [c.incidentLocation.lat, c.incidentLocation.lng],
        color: c.priority === 'red' ? '#dc2626' : c.priority === 'yellow' ? '#f59e0b' : '#3b82f6',
      });
    }
  });

  const statusLabel: Record<string, string> = {
    idle: '待命', enroute_to_scene: '出警途中', on_scene: '救治现场',
    enroute_to_hospital: '送院途中', at_hospital: '到达医院', returning: '返程中',
    maintenance: '维保中',
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner">
      <MapContainer
        center={[CITY_CENTER.lat, CITY_CENTER.lng]}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFit cases={state.cases} ambulances={state.ambulances} hospitals={state.hospitals} />

        {hotspots.map((h, i) => (
          <Circle
            key={`heat-${i}`}
            center={[h.lat, h.lng]}
            radius={400 + h.busy * 900}
            pathOptions={{
              color: h.busy > 0.8 ? '#dc2626' : h.busy > 0.6 ? '#f59e0b' : '#22c55e',
              fillColor: h.busy > 0.8 ? '#dc2626' : h.busy > 0.6 ? '#f59e0b' : '#22c55e',
              fillOpacity: 0.08 + h.busy * 0.15,
              weight: 0,
            }}
          />
        ))}

        {routes.map((r, i) => (
          <Polyline
            key={`route-${i}`}
            positions={[r.from, r.to]}
            pathOptions={{ color: r.color, weight: 4, opacity: 0.8, dashArray: '10, 8' }}
          />
        ))}

        {state.hospitals.map(h => {
          const avgBusy = h.departments.reduce((s, d) => s + d.busyLevel, 0) / Math.max(h.departments.length, 1);
          return (
            <Marker
              key={h.id}
              position={[h.location.lat, h.location.lng]}
              icon={hospitalIcon(avgBusy)}
              eventHandlers={{ click: () => dispatch({ type: 'SET_VIEW', payload: 'hospitals' }) }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold flex items-center gap-1">🏥 {h.name}</div>
                  <div className="text-xs text-slate-500">{h.level === 'tertiary' ? '三级' : h.level === 'secondary' ? '二级' : '一级'}医院</div>
                  <div className="mt-2 space-y-0.5 text-xs">
                    <div>急诊床位: <b>{h.emergencyCapacity.availableBeds}/{h.emergencyCapacity.totalBeds}</b></div>
                    <div>候诊患者: <b>{h.emergencyCapacity.waitingPatients}</b>人</div>
                    <div>分诊级别: <b className={h.emergencyCapacity.triageLevel >= 3 ? 'text-red-600' : h.emergencyCapacity.triageLevel >= 2 ? 'text-amber-600' : 'text-green-600'}>{h.emergencyCapacity.triageLevel}级</b></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {activeCases.map(c => (
          <Marker
            key={c.id}
            position={[c.incidentLocation.lat, c.incidentLocation.lng]}
            icon={caseIcon(c.priority)}
            eventHandlers={{
              click: () => {
                dispatch({ type: 'SELECT_CASE', payload: c.id });
                dispatch({ type: 'SET_VIEW', payload: 'dispatch' });
              },
            }}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold text-white ${
                    c.priority === 'red' ? 'bg-red-500' : c.priority === 'yellow' ? 'bg-amber-500' : 'bg-green-500'
                  }`}>
                    {getPriorityLabel(c.priority)}
                  </span>
                  <span className="text-xs text-slate-500">{c.caseNumber}</span>
                </div>
                <div className="font-semibold">{c.patientName} · {c.patientAge}岁{c.patientGender === 'male' ? '男' : c.patientGender === 'female' ? '女' : ''}</div>
                <div className="text-xs text-slate-600 mt-1 line-clamp-2">{c.symptomDescription}</div>
                <div className="text-xs text-slate-500 mt-1">📍 {c.incidentLocation.district || ''} {c.incidentLocation.address || ''}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {[...idleAmbs, ...busyAmbs].map(a => {
          const assignedCase = state.cases.find(c => c.currentAssignmentId && a.currentCaseId === c.id);
          return (
            <Marker
              key={a.id}
              position={[a.location.lat, a.location.lng]}
              icon={ambulanceIcon(a.status, assignedCase?.priority)}
              eventHandlers={{ click: () => dispatch({ type: 'SELECT_AMBULANCE', payload: a.id }) }}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">🚑 {a.plateNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${
                      a.status === 'idle' ? 'bg-green-500' :
                      a.status === 'maintenance' ? 'bg-slate-500' : 'bg-blue-500'
                    }`}>
                      {statusLabel[a.status] || a.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">医师: {a.crew.doctorName}</div>
                  <div className="text-xs text-slate-600">护士: {a.crew.nurseName}</div>
                  <div className="text-xs text-slate-500 mt-1">司机: {a.driver.name}</div>
                  {assignedCase && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="text-slate-500 mb-1">当前任务:</div>
                      <div className="font-medium">{assignedCase.patientName} · {assignedCase.patientAge}岁</div>
                      <div className="text-slate-500 truncate">{assignedCase.suspectedCondition}</div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 text-xs space-y-1.5 border border-slate-200">
        <div className="font-semibold text-slate-700 mb-2 border-b pb-1">图例说明</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />红色危重</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />黄色紧急</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />绿色常规</div>
          <div className="flex items-center gap-1.5">🏥 医院</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-full" />待命车辆</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded-full" />出勤车辆</div>
        </div>
      </div>
    </div>
  );
}
