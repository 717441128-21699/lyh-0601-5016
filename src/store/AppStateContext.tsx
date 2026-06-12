import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type {
  EmergencyCase, Ambulance, Hospital, Doctor, Station,
  MaintenanceWorkOrder, Notification, MedicalRecord, Billing, VitalSigns,
} from '../types';
import {
  AMBULANCES, HOSPITALS, DOCTORS, STATIONS,
  generateMockCases, MAINTENANCE_ORDERS, generateRandomLocation, generateVitalSigns,
} from '../data/mockData';
import { assessPriority, type PriorityAssessment } from '../utils/priorityAssessment';
import { generateDispatchPlan, createAssignment, type DispatchPlan } from '../utils/dispatchAlgorithm';

interface AppState {
  cases: EmergencyCase[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  doctors: Doctor[];
  stations: Station[];
  maintenanceOrders: MaintenanceWorkOrder[];
  notifications: Notification[];
  medicalRecords: MedicalRecord[];
  billings: Billing[];
  dispatchPlans: Record<string, DispatchPlan>;
  priorityAssessments: Record<string, PriorityAssessment>;
  currentCaseId: string | null;
  currentAmbulanceId: string | null;
  currentView: 'dashboard' | 'dispatch' | 'cases' | 'ambulance-terminal' | 'statistics' | 'maintenance' | 'hospitals';
  activeTerminalCaseId: string | null;
}

type AppAction =
  | { type: 'SET_VIEW'; payload: AppState['currentView'] }
  | { type: 'SELECT_CASE'; payload: string | null }
  | { type: 'SELECT_AMBULANCE'; payload: string | null }
  | { type: 'ADD_CASE'; payload: EmergencyCase }
  | { type: 'UPDATE_CASE'; payload: { id: string; updates: Partial<EmergencyCase> } }
  | { type: 'UPDATE_AMBULANCE'; payload: { id: string; updates: Partial<Ambulance> } }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'createdAt' | 'read'> }
  | { type: 'READ_NOTIFICATION'; payload: string }
  | { type: 'READ_ALL_NOTIFICATIONS' }
  | { type: 'ADD_DISPATCH_PLAN'; payload: { caseId: string; plan: DispatchPlan } }
  | { type: 'ADD_PRIORITY_ASSESSMENT'; payload: { caseId: string; assessment: PriorityAssessment } }
  | { type: 'ADD_MAINTENANCE_ORDER'; payload: MaintenanceWorkOrder }
  | { type: 'UPDATE_MAINTENANCE_ORDER'; payload: { id: string; updates: Partial<MaintenanceWorkOrder> } }
  | { type: 'ADD_MEDICAL_RECORD'; payload: MedicalRecord }
  | { type: 'ADD_BILLING'; payload: Billing }
  | { type: 'SET_TERMINAL_CASE'; payload: string | null }
  | { type: 'SIMULATE_TICK' }
  | { type: 'ADD_VITAL_SIGNS'; payload: { caseId: string; signs: VitalSigns } }
  | { type: 'TRIGGER_NEW_CALL' };

const initialState: AppState = {
  cases: [],
  ambulances: AMBULANCES,
  hospitals: HOSPITALS,
  doctors: DOCTORS,
  stations: STATIONS,
  maintenanceOrders: MAINTENANCE_ORDERS,
  notifications: [],
  medicalRecords: [],
  billings: [],
  dispatchPlans: {},
  priorityAssessments: {},
  currentCaseId: null,
  currentAmbulanceId: null,
  currentView: 'dashboard',
  activeTerminalCaseId: null,
};

const SYMPTOM_POOL = [
  { desc: '突发胸痛伴大汗，持续约20分钟不缓解，既往冠心病史', caller: '家属' },
  { desc: '在家中摔倒后无法起身，右侧髋部剧烈疼痛，82岁老人', caller: '患者本人' },
  { desc: '车辆追尾事故，驾驶员被卡在车内，胸部撞击方向盘', caller: '目击者' },
  { desc: '意识不清，右侧肢体活动受限，说话含糊不清，发病约1小时', caller: '家属' },
  { desc: '哮喘持续状态，呼吸困难明显，嘴唇发紫', caller: '家属' },
  { desc: '发热39度伴咳嗽2天，今日出现呼吸急促', caller: '家长' },
  { desc: '急性剧烈腹痛，伴恶心呕吐，持续加重4小时', caller: '患者本人' },
  { desc: '工地高空坠落，约3米高度，腰部及下肢活动受限', caller: '同事' },
  { desc: '误服安眠药约20片，已洗胃初步处理', caller: '家属' },
  { desc: '孕期39周，规律宫缩，阴道少量出血', caller: '家属' },
  { desc: '大面积开水烫伤，双下肢及腹部，约25%体表面积', caller: '家属' },
  { desc: '头晕头痛血压180/110，既往高血压病史10年', caller: '患者本人' },
  { desc: '突发昏迷，呼吸急促，身旁有空药瓶', caller: '家属' },
  { desc: '急性心肌梗死发病，已含服硝酸甘油，胸痛未缓解', caller: '家属' },
];

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };

    case 'SELECT_CASE':
      return { ...state, currentCaseId: action.payload };

    case 'SELECT_AMBULANCE':
      return { ...state, currentAmbulanceId: action.payload };

    case 'ADD_CASE': {
      const newCases = [action.payload, ...state.cases];
      return { ...state, cases: newCases };
    }

    case 'UPDATE_CASE': {
      const cases = state.cases.map(c =>
        c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
      );
      return { ...state, cases };
    }

    case 'UPDATE_AMBULANCE': {
      const ambulances = state.ambulances.map(a =>
        a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
      );
      return { ...state, ambulances };
    }

    case 'ADD_NOTIFICATION': {
      const notif: Notification = {
        ...action.payload,
        id: `NOTIF${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      return { ...state, notifications: [notif, ...state.notifications] };
    }

    case 'READ_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case 'READ_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    case 'ADD_DISPATCH_PLAN':
      return {
        ...state,
        dispatchPlans: { ...state.dispatchPlans, [action.payload.caseId]: action.payload.plan },
      };

    case 'ADD_PRIORITY_ASSESSMENT':
      return {
        ...state,
        priorityAssessments: { ...state.priorityAssessments, [action.payload.caseId]: action.payload.assessment },
      };

    case 'ADD_MAINTENANCE_ORDER':
      return { ...state, maintenanceOrders: [action.payload, ...state.maintenanceOrders] };

    case 'UPDATE_MAINTENANCE_ORDER': {
      const orders = state.maintenanceOrders.map(o =>
        o.id === action.payload.id ? { ...o, ...action.payload.updates } : o
      );
      return { ...state, maintenanceOrders: orders };
    }

    case 'ADD_MEDICAL_RECORD':
      return { ...state, medicalRecords: [action.payload, ...state.medicalRecords] };

    case 'ADD_BILLING':
      return { ...state, billings: [action.payload, ...state.billings] };

    case 'SET_TERMINAL_CASE':
      return { ...state, activeTerminalCaseId: action.payload };

    case 'ADD_VITAL_SIGNS': {
      const cases = state.cases.map(c => {
        if (c.id !== action.payload.caseId) return c;
        const newVitals = [...(c.vitalSigns || []), action.payload.signs];
        return { ...c, vitalSigns: newVitals };
      });
      return { ...state, cases };
    }

    case 'SIMULATE_TICK': {
      return simulateTick(state);
    }

    case 'TRIGGER_NEW_CALL': {
      const { case: newCase, assessment } = generateEmergencyCall(state);
      const newCases = [newCase, ...state.cases];
      const newAssessments = { ...state.priorityAssessments, [newCase.id]: assessment };

      const notifType = assessment.priority === 'red' ? 'danger' : assessment.priority === 'yellow' ? 'warning' : 'info';
      const notif: Notification = {
        id: `NOTIF${Date.now()}`,
        type: notifType,
        title: `新急救呼叫 - ${assessment.priority === 'red' ? '红色优先级' : assessment.priority === 'yellow' ? '黄色优先级' : '绿色优先级'}`,
        message: `[${newCase.caseNumber}] ${newCase.patientName} ${newCase.patientAge}岁 - ${assessment.keySymptoms.slice(0, 2).join('、') || newCase.symptomDescription.slice(0, 30)}`,
        createdAt: new Date().toISOString(),
        read: false,
        relatedCaseId: newCase.id,
      };

      const plan = generateDispatchPlan(newCase, state.ambulances, state.hospitals);
      const newPlans = { ...state.dispatchPlans, [newCase.id]: plan };

      return {
        ...state,
        cases: newCases,
        priorityAssessments: newAssessments,
        dispatchPlans: newPlans,
        notifications: [notif, ...state.notifications],
        currentCaseId: newCase.id,
      };
    }

    default:
      return state;
  }
}

function generateEmergencyCall(state: AppState): { case: EmergencyCase; assessment: PriorityAssessment } {
  const now = new Date();
  const caseCount = state.cases.length;
  const poolItem = SYMPTOM_POOL[Math.floor(Math.random() * SYMPTOM_POOL.length)];
  const location = generateRandomLocation();
  const patientAge = Math.floor(Math.random() * 78 + 18);
  const patientGender = Math.random() > 0.5 ? 'male' : 'female';
  const patientNames = ['王建国', '李秀英', '张德华', '刘桂芳', '陈明志', '杨淑珍', '黄志强', '赵美华', '周文博', '吴晓燕', '孙嘉诚', '马慧敏', '胡大伟', '林秀兰'];
  const callerNames = ['家属', '患者本人', '目击者', '同事', '路人', '朋友'];

  const assessment = assessPriority(poolItem.desc, patientAge);

  const id = `CASE${Date.now()}`;
  const caseNumber = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(caseCount + 1001).padStart(4, '0')}`;

  return {
    case: {
      id,
      caseNumber,
      callerName: poolItem.caller || callerNames[Math.floor(Math.random() * callerNames.length)],
      callerPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      patientName: patientNames[Math.floor(Math.random() * patientNames.length)],
      patientAge,
      patientGender,
      incidentLocation: location,
      symptomDescription: poolItem.desc,
      suspectedCondition: poolItem.desc.split('，')[0],
      priority: assessment.priority,
      status: 'waiting',
      priorityScore: assessment.score,
      departmentNeeded: assessment.departmentNeeded,
      specialEquipmentNeeded: assessment.specialEquipmentNeeded,
      receivedAt: now.toISOString(),
      assignments: [],
      escalationLevel: assessment.score > 90 ? 2 : assessment.score > 70 ? 1 : 0,
      autoReassigned: false,
    },
    assessment,
  };
}

function simulateTick(state: AppState): AppState {
  let newState = { ...state };
  let newCases = [...newState.cases];
  let newAmbulances = [...newState.ambulances];
  let newNotifications = [...newState.notifications];
  let newSystemActions: Array<{ type: 'autoComplete'; caseId: string; runAt: number }> = [];

  for (let i = 0; i < newCases.length; i++) {
    const c = newCases[i];

    if (c.status === 'waiting') {
      const elapsed = (Date.now() - new Date(c.receivedAt).getTime()) / 1000;
      if (elapsed > 60 && c.escalationLevel < 1) {
        newCases[i] = { ...c, escalationLevel: 1 };
        newNotifications.push({
          id: `NOTIF${Date.now()}esc${i}`,
          type: 'warning',
          title: `案件升级通知 - ${c.caseNumber}`,
          message: `等待派车超过60秒，已升级至值班组长处理`,
          createdAt: new Date().toISOString(),
          read: false,
          relatedCaseId: c.id,
        });
      }
    }

    if (c.status === 'dispatching' && c.currentAssignmentId) {
      const assignment = c.assignments.find(a => a.id === c.currentAssignmentId);
      if (assignment && !assignment.acceptedAt) {
        const elapsed = (Date.now() - new Date(assignment.assignedAt).getTime()) / 1000;
        if (elapsed > 15 && Math.random() > 0.3) {
          assignment.acceptedAt = new Date().toISOString();
          newCases[i] = { ...c, status: 'enroute', dispatchedAt: assignment.assignedAt, assignments: [...c.assignments] };
          const ambIndex = newAmbulances.findIndex(a => a.id === assignment.ambulanceId);
          if (ambIndex >= 0) {
            newAmbulances[ambIndex] = { ...newAmbulances[ambIndex], status: 'enroute_to_scene', currentCaseId: c.id };
          }
        } else if (elapsed > 120 && c.escalationLevel < 2) {
          newCases[i] = { ...c, escalationLevel: 2, autoReassigned: true, status: 'waiting', currentAssignmentId: undefined };
          newNotifications.push({
            id: `NOTIF${Date.now()}re${i}`,
            type: 'danger',
            title: `超时自动重派 - ${c.caseNumber}`,
            message: `120秒未接单，已自动取消原派车并重新分配，同时通知调度长`,
            createdAt: new Date().toISOString(),
            read: false,
            relatedCaseId: c.id,
          });
          const plan = generateDispatchPlan(newCases[i], newAmbulances, newState.hospitals);
          if (plan.primary) {
            const newAssignment = createAssignment(c.id, plan.primary);
            newCases[i] = {
              ...newCases[i],
              status: 'dispatching',
              currentAssignmentId: newAssignment.id,
              assignments: [...newCases[i].assignments, newAssignment],
            };
            newState.dispatchPlans = { ...newState.dispatchPlans, [c.id]: plan };
          }
        }
      }
    }

    if (c.status === 'enroute' && c.sceneArrivalTime === undefined && c.currentAssignmentId) {
      const assignment = c.assignments.find(a => a.id === c.currentAssignmentId);
      if (assignment && assignment.acceptedAt) {
        const elapsed = (Date.now() - new Date(assignment.acceptedAt).getTime()) / 1000;
        const targetTime = (assignment.etaToScene || 8) * 60;
        if (elapsed > targetTime * 0.6 && Math.random() > 0.6) {
          const arrivalTime = new Date().toISOString();
          const responseTime = Math.floor((new Date(arrivalTime).getTime() - new Date(c.receivedAt).getTime()) / 1000);
          newCases[i] = { ...c, status: 'arrived', sceneArrivalTime: arrivalTime, responseTimeSeconds: responseTime };
          const ambIndex = newAmbulances.findIndex(a => a.id === assignment.ambulanceId);
          if (ambIndex >= 0) {
            newAmbulances[ambIndex] = { ...newAmbulances[ambIndex], status: 'on_scene', location: c.incidentLocation };
          }
          newNotifications.push({
            id: `NOTIF${Date.now()}arr${i}`,
            type: 'success',
            title: `到达现场 - ${c.caseNumber}`,
            message: `响应时长 ${Math.floor(responseTime / 60)}分${responseTime % 60}秒`,
            createdAt: new Date().toISOString(),
            read: false,
            relatedCaseId: c.id,
          });
        } else {
          const ambIndex = newAmbulances.findIndex(a => a.id === assignment.ambulanceId);
          if (ambIndex >= 0) {
            const progress = Math.min(1, elapsed / targetTime);
            const amb = newAmbulances[ambIndex];
            newAmbulances[ambIndex] = {
              ...amb,
              location: {
                ...amb.location,
                lat: amb.location.lat + (c.incidentLocation.lat - amb.location.lat) * 0.05,
                lng: amb.location.lng + (c.incidentLocation.lng - amb.location.lng) * 0.05,
              },
            };
          }
        }
      }
    }

    if (c.status === 'arrived' && c.hospitalArrivalTime === undefined && c.currentAssignmentId) {
      const assignment = c.assignments.find(a => a.id === c.currentAssignmentId);
      if (assignment) {
        const elapsed = (Date.now() - new Date(c.sceneArrivalTime!).getTime()) / 1000;
        if (elapsed > 600 && Math.random() > 0.7) {
          newCases[i] = { ...c, hospitalArrivalTime: new Date().toISOString(), status: 'transferred' };
          const ambIndex = newAmbulances.findIndex(a => a.id === assignment.ambulanceId);
          if (ambIndex >= 0) {
            const hospital = newState.hospitals.find(h => h.id === assignment.hospitalId) || newState.hospitals[0];
            newAmbulances[ambIndex] = { ...newAmbulances[ambIndex], status: 'at_hospital', location: hospital.location };
          }
        }
      }
    }

    // 需求4：从派车接单后（enroute / arrived / transferred 阶段）都持续生成生命体征
    const isVitalActive = c.status === 'enroute' || c.status === 'arrived' || c.status === 'transferred';
    if (isVitalActive) {
      const currentSigns = newCases[i].vitalSigns || [];
      if (currentSigns.length === 0) {
        // 如果还没有任何生命体征（比如系统自动转的enroute，还没手动点接单），立即初始化第一条
        const init = generateVitalSigns(c.priority);
        newCases[i] = { ...newCases[i], vitalSigns: [init] };
      } else if (currentSigns.length < 40 && Math.random() > 0.4) {
        // 有数据时，40%概率追加一条（5秒tick约12秒一条，约8分钟内持续）
        const lastSigns = currentSigns[currentSigns.length - 1];
        const signs = {
          timestamp: new Date().toISOString(),
          heartRate: Math.max(50, Math.min(130, lastSigns.heartRate + Math.floor(Math.random() * 10 - 5))),
          bloodPressureSystolic: Math.max(90, Math.min(170, lastSigns.bloodPressureSystolic + Math.floor(Math.random() * 10 - 5))),
          bloodPressureDiastolic: Math.max(50, Math.min(100, lastSigns.bloodPressureDiastolic + Math.floor(Math.random() * 6 - 3))),
          oxygenSaturation: Math.min(100, Math.max(85, lastSigns.oxygenSaturation + Math.floor(Math.random() * 4 - 2))),
          respiratoryRate: Math.max(12, Math.min(28, lastSigns.respiratoryRate + Math.floor(Math.random() * 4 - 2))),
          temperature: +(Math.max(36, Math.min(39.5, lastSigns.temperature + (Math.random() * 0.2 - 0.1)))).toFixed(1),
          consciousness: lastSigns.consciousness,
          ecgData: Array.from({ length: 50 }, () => Math.random() * 2 - 1),
        };
        newCases[i] = { ...newCases[i], vitalSigns: [...currentSigns, signs] };
      }
    }

    if (c.status === 'transferred') {
      const elapsed = (Date.now() - new Date(c.hospitalArrivalTime!).getTime()) / 1000;
      if (elapsed > 1200 && Math.random() > 0.8) {
        // 系统自动完成 - 通过updateCaseStatus走标准流程，确保自动生成病历和结算
        newCases[i] = { ...c, status: 'completed' };
        newSystemActions.push({
          type: 'autoComplete',
          caseId: c.id,
          runAt: Date.now() + 50, // 延后50ms在dispatch后执行
        });
        const assignment = c.assignments.find(a => a.id === c.currentAssignmentId);
        if (assignment) {
          const ambIndex = newAmbulances.findIndex(a => a.id === assignment.ambulanceId);
          if (ambIndex >= 0) {
            const station = newState.stations.find(s => s.id === newAmbulances[ambIndex].stationId);
            newAmbulances[ambIndex] = {
              ...newAmbulances[ambIndex],
              status: 'returning',
              currentCaseId: undefined,
              location: station ? station.location : newAmbulances[ambIndex].location,
              mileage: newAmbulances[ambIndex].mileage + Math.floor(Math.random() * 15 + 5),
            };
          }
        }
        newNotifications.push({
          id: `NOTIF${Date.now()}comp${i}`,
          type: 'success',
          title: `案件完成 - ${c.caseNumber}`,
          message: `${c.patientName} 已送达并完成交接，案件关闭`,
          createdAt: new Date().toISOString(),
          read: false,
          relatedCaseId: c.id,
        });
      }
    }
  }

  newAmbulances = newAmbulances.map(a => {
    if (a.status === 'returning' && Math.random() > 0.3) {
      const station = newState.stations.find(s => s.id === a.stationId);
      if (station) {
        return { ...a, status: 'idle' as const, location: station.location };
      }
    }
    return a;
  });

  const nearMaintenance = newAmbulances.filter(a => a.mileage >= a.nextMaintenanceMileage - 2000 && a.status === 'idle');
  for (const amb of nearMaintenance) {
    const exists = newState.maintenanceOrders.some(o => o.ambulanceId === amb.id && o.status !== 'completed');
    if (!exists) {
      newState.maintenanceOrders.push({
        id: `MO${Date.now()}${amb.id}`,
        ambulanceId: amb.id,
        type: 'routine',
        description: `按里程自动生成例行保养工单（里程${amb.mileage}km，下次保养${amb.nextMaintenanceMileage}km）`,
        triggerMileage: amb.mileage,
        createdAt: new Date().toISOString(),
        scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        status: 'pending',
      });
      newNotifications.push({
        id: `NOTIF${Date.now()}maint${amb.id}`,
        type: 'info',
        title: '自动生成维保工单',
        message: `车辆 ${amb.plateNumber} 里程达到阈值，已自动生成例行保养工单`,
        createdAt: new Date().toISOString(),
        read: false,
        relatedAmbulanceId: amb.id,
      });
    }
  }

  // 处理系统动作：系统自动完成的案件也需要自动生成病历和结算单
  for (const action of newSystemActions) {
    if (action.type === 'autoComplete') {
      const caseIdx = newCases.findIndex(cc => cc.id === action.caseId);
      if (caseIdx >= 0) {
        const cc = newCases[caseIdx];
        // 补全completed状态需要的字段
        const totalTime = cc.sceneArrivalTime && cc.hospitalArrivalTime
          ? Math.floor((new Date(cc.hospitalArrivalTime).getTime() - new Date(cc.sceneArrivalTime).getTime()) / 1000)
          : undefined;
        newCases[caseIdx] = {
          ...cc,
          closedAt: new Date().toISOString(),
          totalTimeSeconds: totalTime,
        };

        // 自动生成电子病历
        if (!cc.medicalRecordId) {
          const mr: MedicalRecord = {
            id: `MR${Date.now()}${cc.id.slice(-4)}`,
            caseId: cc.id,
            patientName: cc.patientName,
            patientAge: cc.patientAge,
            patientGender: cc.patientGender,
            chiefComplaint: cc.symptomDesc,
            presentIllness: `患者因${cc.symptomDesc}呼叫急救。现场查体：生命体征平稳，意识${cc.vitalSigns && cc.vitalSigns.length > 0 ? cc.vitalSigns[cc.vitalSigns.length - 1].consciousness : '清醒'}。初步处理：吸氧、心电监护、建立静脉通路。转运过程顺利。`,
            physicalExam: `T ${cc.vitalSigns && cc.vitalSigns.length > 0 ? cc.vitalSigns[cc.vitalSigns.length - 1].temperature : 36.5}℃，P ${cc.vitalSigns && cc.vitalSigns.length > 0 ? cc.vitalSigns[cc.vitalSigns.length - 1].heartRate : 80}次/分，R ${cc.vitalSigns && cc.vitalSigns.length > 0 ? cc.vitalSigns[cc.vitalSigns.length - 1].respiratoryRate : 18}次/分，BP ${cc.vitalSigns && cc.vitalSigns.length > 0 ? cc.vitalSigns[cc.vitalSigns.length - 1].bloodPressureSystolic : 120}/${cc.vitalSigns && cc.vitalSigns.length > 0 ? cc.vitalSigns[cc.vitalSigns.length - 1].bloodPressureDiastolic : 80}mmHg，SpO2 ${cc.vitalSigns && cc.vitalSigns.length > 0 ? cc.vitalSigns[cc.vitalSigns.length - 1].oxygenSaturation : 98}%`,
            diagnosis: cc.primaryDiagnosis || '待查',
            treatment: ['心电监护', '吸氧', '静脉通路', '对症处理'],
            vitalSignsHistory: cc.vitalSigns || [],
            createdAt: new Date().toISOString(),
            doctorName: '系统自动生成',
          };
          newState.medicalRecords = [...newState.medicalRecords, mr];
          newCases[caseIdx] = { ...newCases[caseIdx], medicalRecordId: mr.id };
          newNotifications.push({
            id: `NOTIF${Date.now()}mr${cc.id}`,
            type: 'success',
            title: '电子病历已自动生成',
            message: `案件 ${cc.caseNumber} 完成后系统已自动生成电子病历`,
            createdAt: new Date().toISOString(),
            read: false,
            relatedCaseId: cc.id,
          });
        }

        // 自动生成收费结算单
        if (!cc.billingId) {
          const distanceKm = cc.currentAssignment ? (cc.currentAssignment.distanceToScene / 1000) * 2 + 5 : 15;
          const items: BillingItem[] = [
            { name: '出诊费', quantity: 1, unitPrice: 150, amount: 150 },
            { name: '里程费', quantity: +distanceKm.toFixed(1), unitPrice: 8, amount: Math.round(distanceKm * 8) },
            { name: '治疗费', quantity: 1, unitPrice: 200, amount: 200 },
            { name: '氧气费', quantity: 1, unitPrice: 80, amount: 80 },
            { name: '心电监护', quantity: 1, unitPrice: 120, amount: 120 },
          ];
          const billing: Billing = {
            id: `BL${Date.now()}${cc.id.slice(-4)}`,
            caseId: cc.id,
            patientName: cc.patientName,
            items,
            totalAmount: items.reduce((s, x) => s + x.amount, 0),
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          newState.billings = [...newState.billings, billing];
          newCases[caseIdx] = { ...newCases[caseIdx], billingId: billing.id };
          newNotifications.push({
            id: `NOTIF${Date.now()}bl${cc.id}`,
            type: 'success',
            title: '收费结算单已自动生成',
            message: `案件 ${cc.caseNumber} 完成后系统已自动生成收费结算单`,
            createdAt: new Date().toISOString(),
            read: false,
            relatedCaseId: cc.id,
          });
        }
      }
    }
  }

  return {
    ...newState,
    cases: newCases,
    ambulances: newAmbulances,
    notifications: newNotifications,
  };
}

interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  createNewCase: (data: { symptomDesc: string; patientAge: number; patientGender: 'male' | 'female'; patientName: string; location: any; callerName: string; callerPhone: string }) => void;
  confirmDispatch: (caseId: string) => void;
  acceptAssignment: (caseId: string, ambulanceId: string) => void;
  requestReinforcement: (caseId: string, reason: string, approve?: boolean) => void;
  approveReinforcement: (caseId: string, assignmentId: string, approved: boolean) => void;
  advanceCaseStep: (caseId: string, ambulanceId: string, step: 0 | 1 | 2 | 3) => void;
  updateCaseStatus: (caseId: string, status: EmergencyCase['status']) => void;
  generateMedicalRecord: (caseId: string) => void;
  generateBilling: (caseId: string) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const mockCases = generateMockCases();
      for (const c of mockCases) {
        dispatch({ type: 'ADD_CASE', payload: c });
        const assessment = assessPriority(c.symptomDescription, c.patientAge);
        dispatch({ type: 'ADD_PRIORITY_ASSESSMENT', payload: { caseId: c.id, assessment } });
        if (c.status !== 'waiting' && c.status !== 'completed') {
          const plan = generateDispatchPlan(c, state.ambulances, state.hospitals);
          dispatch({ type: 'ADD_DISPATCH_PLAN', payload: { caseId: c.id, plan } });
        }
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'SIMULATE_TICK' });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const createNewCase = useCallback((data) => {
    const now = new Date();
    const assessment = assessPriority(data.symptomDesc, data.patientAge);
    const id = `CASE${Date.now()}`;

    const newCase: EmergencyCase = {
      id,
      caseNumber: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(state.cases.length + 1001).padStart(4, '0')}`,
      callerName: data.callerName,
      callerPhone: data.callerPhone,
      patientName: data.patientName,
      patientAge: data.patientAge,
      patientGender: data.patientGender,
      incidentLocation: data.location,
      symptomDescription: data.symptomDesc,
      suspectedCondition: data.symptomDesc.split('，')[0],
      priority: assessment.priority,
      status: 'waiting',
      priorityScore: assessment.score,
      departmentNeeded: assessment.departmentNeeded,
      specialEquipmentNeeded: assessment.specialEquipmentNeeded,
      receivedAt: now.toISOString(),
      assignments: [],
      escalationLevel: assessment.score > 90 ? 2 : assessment.score > 70 ? 1 : 0,
      autoReassigned: false,
    };

    dispatch({ type: 'ADD_CASE', payload: newCase });
    dispatch({ type: 'ADD_PRIORITY_ASSESSMENT', payload: { caseId: id, assessment } });

    const notifType = assessment.priority === 'red' ? 'danger' : assessment.priority === 'yellow' ? 'warning' : 'info';
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        type: notifType,
        title: `新急救呼叫 - ${assessment.priority === 'red' ? '红色优先级' : assessment.priority === 'yellow' ? '黄色优先级' : '绿色优先级'}`,
        message: `[${newCase.caseNumber}] ${data.patientName} ${data.patientAge}岁`,
        relatedCaseId: id,
      },
    });

    const plan = generateDispatchPlan(newCase, state.ambulances, state.hospitals);
    dispatch({ type: 'ADD_DISPATCH_PLAN', payload: { caseId: id, plan } });
    dispatch({ type: 'SELECT_CASE', payload: id });
  }, [state.cases.length, state.ambulances, state.hospitals]);

  const confirmDispatch = useCallback((caseId: string) => {
    const plan = state.dispatchPlans[caseId];
    if (!plan || !plan.primary) return;
    const assignment = createAssignment(caseId, plan.primary);

    dispatch({
      type: 'UPDATE_CASE',
      payload: {
        id: caseId,
        updates: {
          status: 'dispatching',
          dispatchedAt: new Date().toISOString(),
          currentAssignmentId: assignment.id,
          assignments: [...(state.cases.find(c => c.id === caseId)?.assignments || []), assignment],
        },
      },
    });

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        type: 'info',
        title: '派车指令已发送',
        message: `车辆 ${plan.primary.ambulance.plateNumber} 已派发，预计 ${plan.primary.etaToScene} 分钟到达`,
        relatedCaseId: caseId,
        relatedAmbulanceId: plan.primary.ambulance.id,
      },
    });
  }, [state.dispatchPlans, state.cases]);

  const acceptAssignment = useCallback((caseId: string, ambulanceId: string) => {
    const c = state.cases.find(x => x.id === caseId);
    if (!c || !c.currentAssignmentId) return;

    dispatch({
      type: 'UPDATE_CASE',
      payload: {
        id: caseId,
        updates: {
          status: 'enroute',
          assignments: c.assignments.map(a =>
            a.id === c.currentAssignmentId ? { ...a, acceptedAt: new Date().toISOString() } : a
          ),
        },
      },
    });

    dispatch({
      type: 'UPDATE_AMBULANCE',
      payload: {
        id: ambulanceId,
        updates: { status: 'enroute_to_scene', currentCaseId: caseId },
      },
    });
  }, [state.cases]);

  const requestReinforcement = useCallback((caseId: string, reason: string, approve: boolean = false) => {
    const c = state.cases.find(x => x.id === caseId);
    if (!c || !c.currentAssignmentId) return;

    const assignmentUpdates: Partial<DispatchAssignment> = { 
      reinforecementRequested: true, 
      notes: reason 
    };
    // 只有明确要求批准时才设置approved=true，否则保持undefined表示待审批
    if (approve) {
      assignmentUpdates.reinforecementApproved = true;
      assignmentUpdates.approvedAt = new Date().toISOString();
    }

    dispatch({
      type: 'UPDATE_CASE',
      payload: {
        id: caseId,
        updates: {
          assignments: c.assignments.map(a =>
            a.id === c.currentAssignmentId ? { ...a, ...assignmentUpdates } : a
          ),
          escalationLevel: Math.max(c.escalationLevel, 1) as 0 | 1 | 2,
        },
      },
    });

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        type: approve ? 'warning' : 'warning',
        title: approve ? '增援请求已批准' : '增援请求待审批',
        message: `案件 ${c.caseNumber} 请求增援：${reason}`,
        relatedCaseId: caseId,
      },
    });

    if (approve) {
      const otherCandidates = state.dispatchPlans[caseId]?.alternatives || [];
      if (otherCandidates.length > 0) {
        const secondary = otherCandidates[0];
        const secondaryAssignment = createAssignment(caseId, secondary);
        secondaryAssignment.reinforecementAssignment = true;
        dispatch({
          type: 'UPDATE_CASE',
          payload: {
            id: caseId,
            updates: {
              assignments: [...c.assignments, secondaryAssignment],
            },
          },
        });
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'success',
            title: '增援救护车已派出',
            message: `${secondary.ambulance.plateNumber} 已作为增援车辆派出，预计${secondary.etaToScene}分钟到达`,
            relatedCaseId: caseId,
            relatedAmbulanceId: secondary.ambulance.id,
          },
        });
      }
    }
  }, [state.cases, state.dispatchPlans]);

  const advanceCaseStep = useCallback((caseId: string, ambulanceId: string, step: 0 | 1 | 2 | 3) => {
    const c = state.cases.find(x => x.id === caseId);
    if (!c || !c.currentAssignmentId) return;
    const now = new Date().toISOString();

    const assignment = c.assignments.find(a => a.id === c.currentAssignmentId);
    if (!assignment) return;

    const caseUpdates: Partial<EmergencyCase> = {};
    const assignUpdates: Partial<typeof assignment> = {};
    let ambStatus: Ambulance['status'] | null = null;

    if (step === 0) {
      // 0 = 接单：记录接单+派车时间，状态：dispatching → enroute
      if (c.status !== 'dispatching') return;
      caseUpdates.status = 'enroute';
      if (!c.dispatchedAt) caseUpdates.dispatchedAt = assignment.assignedAt;
      assignUpdates.acceptedAt = now;
      ambStatus = 'enroute_to_scene';

      // 立即初始化首条生命体征（需求4）
      const firstSigns = generateVitalSigns(c.priority);
      dispatch({ type: 'ADD_VITAL_SIGNS', payload: { caseId, signs: firstSigns } });

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'success', title: `接单成功 - ${c.caseNumber}`, message: `车辆前往现场，预计${assignment.etaToScene}分钟到达`, relatedCaseId: caseId },
      });
    } else if (step === 1) {
      // 1 = 出发：离开急救站（保持enroute，不改变案件状态，只更新assignment）
      if (c.status !== 'enroute') return;
      assignUpdates.departedScene = now;
      ambStatus = 'enroute_to_scene';
    } else if (step === 2) {
      // 2 = 到达现场：status enroute → arrived，记录到达+响应时长
      if (c.status !== 'enroute') return;
      const rt = Math.floor((new Date(now).getTime() - new Date(c.receivedAt).getTime()) / 1000);
      caseUpdates.status = 'arrived';
      caseUpdates.sceneArrivalTime = now;
      caseUpdates.responseTimeSeconds = rt;
      assignUpdates.arrivedAtScene = now;
      ambStatus = 'on_scene';

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'success', title: `到达现场 - ${c.caseNumber}`, message: `响应时长 ${Math.floor(rt / 60)}分${rt % 60}秒`, relatedCaseId: caseId },
      });

      // 到达现场后立刻再追加一组生命体征
      const signs = generateVitalSigns(c.priority);
      dispatch({ type: 'ADD_VITAL_SIGNS', payload: { caseId, signs } });
    } else if (step === 3) {
      // 3 = 送达医院：status arrived → transferred，记录送达+运输时长
      if (c.status !== 'arrived') return;
      caseUpdates.status = 'transferred';
      caseUpdates.hospitalArrivalTime = now;
      if (c.sceneArrivalTime) {
        caseUpdates.transportTimeSeconds = Math.floor((new Date(now).getTime() - new Date(c.sceneArrivalTime).getTime()) / 1000);
      }
      assignUpdates.arrivedAtHospital = now;
      ambStatus = 'at_hospital';

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'success', title: `送达医院 - ${c.caseNumber}`, message: `已交接给${state.hospitals.find(h => h.id === assignment.hospitalId)?.name || '目的医院'}`, relatedCaseId: caseId },
      });

      // 送达后追加一组生命体征
      const signs = generateVitalSigns(c.priority);
      dispatch({ type: 'ADD_VITAL_SIGNS', payload: { caseId, signs } });
    }

    // 更新案件 + assignment
    dispatch({
      type: 'UPDATE_CASE',
      payload: {
        id: caseId,
        updates: {
          ...caseUpdates,
          assignments: c.assignments.map(a => (a.id === assignment.id ? { ...a, ...assignUpdates } : a)),
        },
      },
    });

    // 更新救护车
    if (ambStatus) {
      let ambUpdates: Partial<Ambulance> = { status: ambStatus };
      if (step === 2) {
        ambUpdates.location = c.incidentLocation;
      } else if (step === 3 && assignment.hospitalId) {
        const hosp = state.hospitals.find(h => h.id === assignment.hospitalId);
        if (hosp) ambUpdates.location = hosp.location;
      }
      if (step === 0) ambUpdates.currentCaseId = caseId;
      dispatch({ type: 'UPDATE_AMBULANCE', payload: { id: ambulanceId, updates: ambUpdates } });
    }
  }, [state.cases, state.hospitals]);

  const approveReinforcement = useCallback((caseId: string, assignmentId: string, approved: boolean) => {
    const c = state.cases.find(x => x.id === caseId);
    if (!c) return;

    // 更新原assignment的审批状态
    const newAssignments = c.assignments.map(a =>
      a.id === assignmentId ? { ...a, reinforecementApproved: approved, approvedAt: new Date().toISOString() } : a
    );
    dispatch({
      type: 'UPDATE_CASE',
      payload: { id: caseId, updates: { assignments: newAssignments } },
    });

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        type: approved ? 'warning' : 'info',
        title: approved ? '增援请求已批准' : '增援请求已驳回',
        message: `案件 ${c.caseNumber} - ${approved ? '正在补派备选救护车' : '请自行处理现场情况'}`,
        relatedCaseId: caseId,
      },
    });

    // 批准后：自动补派一辆备选救护车
    if (approved) {
      const alternatives = state.dispatchPlans[caseId]?.alternatives || [];
      // 筛选尚未派车的备选
      const alreadyAssigned = new Set(c.assignments.map(a => a.ambulanceId));
      const candidate = alternatives.find(a => !alreadyAssigned.has(a.ambulance.id));
      if (candidate) {
        const newAssignment = createAssignment(caseId, candidate);
        newAssignment.reinforecementAssignment = true;
        dispatch({
          type: 'UPDATE_CASE',
          payload: {
            id: caseId,
            updates: { assignments: [...newAssignments, newAssignment] },
          },
        });
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'success',
            title: '增援救护车已派出',
            message: `${candidate.ambulance.plateNumber} 已作为增援车辆派出，预计${candidate.etaToScene}分钟到达`,
            relatedCaseId: caseId,
            relatedAmbulanceId: candidate.ambulance.id,
          },
        });
      } else {
        // 备选方案用完了，重新生成一次派车计划找空闲车辆
        const plan = generateDispatchPlan(c, state.ambulances, state.hospitals);
        const secondary = plan.alternatives.find(a => !alreadyAssigned.has(a.ambulance.id)) || plan.primary;
        if (secondary && !alreadyAssigned.has(secondary.ambulance.id)) {
          const newAssignment = createAssignment(caseId, secondary);
          newAssignment.reinforecementAssignment = true;
          dispatch({
            type: 'UPDATE_CASE',
            payload: {
              id: caseId,
              updates: { assignments: [...newAssignments, newAssignment] },
            },
          });
        }
      }
    }
  }, [state.cases, state.dispatchPlans, state.ambulances, state.hospitals]);

  const updateCaseStatus = useCallback((caseId: string, status: EmergencyCase['status']) => {
    const c = state.cases.find(x => x.id === caseId);
    if (!c) return;

    const updates: Partial<EmergencyCase> = { status };
    const now = new Date().toISOString();

    if (status === 'arrived' && !c.sceneArrivalTime) {
      updates.sceneArrivalTime = now;
      updates.responseTimeSeconds = Math.floor((new Date(now).getTime() - new Date(c.receivedAt).getTime()) / 1000);
    }
    if (status === 'transferred' && !c.hospitalArrivalTime) {
      updates.hospitalArrivalTime = now;
    }
    if (status === 'completed') {
      updates.closedAt = now;
      updates.totalTimeSeconds = Math.floor((new Date(now).getTime() - new Date(c.receivedAt).getTime()) / 1000);
    }

    dispatch({ type: 'UPDATE_CASE', payload: { id: caseId, updates } });

    const assignment = c.assignments.find(a => a.id === c.currentAssignmentId);
    if (assignment) {
      let ambStatus: Ambulance['status'] = 'idle';
      if (status === 'enroute') ambStatus = 'enroute_to_scene';
      else if (status === 'arrived') ambStatus = 'on_scene';
      else if (status === 'transferred') ambStatus = 'at_hospital';
      else if (status === 'completed') ambStatus = 'returning';

      dispatch({
        type: 'UPDATE_AMBULANCE',
        payload: {
          id: assignment.ambulanceId,
          updates: {
            status: ambStatus,
            currentCaseId: status === 'completed' ? undefined : caseId,
          },
        },
      });
    }

    // 需求3：案件完成后自动生成电子病历 + 收费结算单
    if (status === 'completed' && c) {
      setTimeout(() => {
        const latest = state.cases.find(x => x.id === caseId) || c;
        if (!latest.medicalRecordId) {
          const record: MedicalRecord = {
            id: `MR${Date.now()}`,
            caseId,
            chiefComplaint: latest.symptomDescription,
            presentIllness: `患者${latest.patientAge}岁，${latest.patientGender === 'male' ? '男性' : latest.patientGender === 'female' ? '女性' : ''}，因"${latest.suspectedCondition}"于${new Date(latest.receivedAt).toLocaleString('zh-CN')}呼叫120。`,
            pastHistory: '既往史：系统回顾未见明显异常（根据现场询问补充）。',
            allergies: '否认药物过敏史。',
            medications: '现场予吸氧、生命体征监测，必要时建立静脉通路。',
            physicalExam: `T:${latest.vitalSigns?.[latest.vitalSigns.length - 1]?.temperature || 36.5}℃, P:${latest.vitalSigns?.[latest.vitalSigns.length - 1]?.heartRate || 80}次/分, R:${latest.vitalSigns?.[latest.vitalSigns.length - 1]?.respiratoryRate || 18}次/分, BP:${latest.vitalSigns?.[latest.vitalSigns.length - 1]?.bloodPressureSystolic || 120}/${latest.vitalSigns?.[latest.vitalSigns.length - 1]?.bloodPressureDiastolic || 80}mmHg, SpO2:${latest.vitalSigns?.[latest.vitalSigns.length - 1]?.oxygenSaturation || 98}%。`,
            preliminaryDiagnosis: latest.suspectedCondition,
            treatmentOnScene: '现场评估生命体征、对症处理，必要时吸氧/建立静脉通路。',
            treatmentEnroute: '转运途中持续心电监护，密切观察病情变化。',
            vitalSignsHistory: latest.vitalSigns || [],
            createdAt: now(),
            doctorSignature: '随车医师（电子签名）',
          };
          dispatch({ type: 'ADD_MEDICAL_RECORD', payload: record });
          dispatch({ type: 'UPDATE_CASE', payload: { id: caseId, updates: { medicalRecordId: record.id } } });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: { type: 'info', title: `电子病历已生成`, message: `案件 ${latest.caseNumber} 自动生成电子病历 #${record.id}`, relatedCaseId: caseId },
          });
        }

        const latest2 = state.cases.find(x => x.id === caseId) || c;
        if (!latest2.billingId) {
          const distance = assignment?.distanceToScene || 5;
          const items = [
            { id: `BI${Date.now()}1`, name: '急救出诊费', unit: '次', quantity: 1, unitPrice: 150, category: 'personnel' as const },
            { id: `BI${Date.now()}2`, name: '救护车里程费', unit: '公里', quantity: Math.ceil(distance * 2), unitPrice: 12, category: 'mileage' as const },
            { id: `BI${Date.now()}3`, name: '院前急救治疗费', unit: '次', quantity: 1, unitPrice: 280, category: 'personnel' as const },
            { id: `BI${Date.now()}4`, name: '氧气使用费', unit: '小时', quantity: 1, unitPrice: 60, category: 'equipment' as const },
            { id: `BI${Date.now()}5`, name: '心电图监测', unit: '次', quantity: 1, unitPrice: 80, category: 'equipment' as const },
          ];
          const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
          const insurance = Math.floor(total * 0.5);
          const bill: Billing = {
            id: `BL${Date.now()}`,
            caseId,
            items,
            totalAmount: total,
            insuranceCoverage: insurance,
            patientPayable: total - insurance,
            paymentStatus: 'pending',
            createdAt: now(),
          };
          dispatch({ type: 'ADD_BILLING', payload: bill });
          dispatch({ type: 'UPDATE_CASE', payload: { id: caseId, updates: { billingId: bill.id } } });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: { type: 'info', title: `收费结算单已生成`, message: `案件 ${latest2.caseNumber} 账单金额 ¥${total}，医保报销 ¥${insurance}，自付 ¥${total - insurance}`, relatedCaseId: caseId },
          });
        }
      }, 300);
    }
  }, [state.cases]);

  const generateMedicalRecord = useCallback((caseId: string) => {
    const c = state.cases.find(x => x.id === caseId);
    if (!c) return;

    const record: MedicalRecord = {
      id: `MR${Date.now()}`,
      caseId,
      chiefComplaint: c.symptomDescription,
      presentIllness: `患者${c.patientAge}岁，${c.patientGender === 'male' ? '男性' : '女性'}，因"${c.suspectedCondition}"于${new Date(c.receivedAt).toLocaleString('zh-CN')}呼叫120。`,
      pastHistory: '既往史：系统回顾未见明显异常（根据现场询问补充）。',
      allergies: '否认药物过敏史。',
      medications: '现场未使用特殊药物。',
      physicalExam: `T:${c.vitalSigns?.[c.vitalSigns.length - 1]?.temperature || 36.5}℃, P:${c.vitalSigns?.[c.vitalSigns.length - 1]?.heartRate || 80}次/分, R:${c.vitalSigns?.[c.vitalSigns.length - 1]?.respiratoryRate || 18}次/分, BP:${c.vitalSigns?.[c.vitalSigns.length - 1]?.bloodPressureSystolic || 120}/${c.vitalSigns?.[c.vitalSigns.length - 1]?.bloodPressureDiastolic || 80}mmHg, SpO2:${c.vitalSigns?.[c.vitalSigns.length - 1]?.oxygenSaturation || 98}%。`,
      preliminaryDiagnosis: c.suspectedCondition,
      treatmentOnScene: '现场予吸氧、生命体征监测，必要时建立静脉通路。',
      treatmentEnroute: '转运途中持续心电监护，密切观察病情变化。',
      vitalSignsHistory: c.vitalSigns || [],
      createdAt: now(),
      doctorSignature: '随车医师（电子签名）',
    };

    dispatch({ type: 'ADD_MEDICAL_RECORD', payload: record });
    dispatch({
      type: 'UPDATE_CASE',
      payload: { id: caseId, updates: { medicalRecordId: record.id } },
    });
  }, [state.cases]);

  const generateBilling = useCallback((caseId: string) => {
    const c = state.cases.find(x => x.id === caseId);
    if (!c) return;

    const assignment = c.assignments.find(a => a.id === c.currentAssignmentId);
    const mileage = assignment?.distanceToScene || 5;
    const items = [
      { id: 'B1', name: '院前急救出诊费', unit: '次', quantity: 1, unitPrice: 150, category: 'personnel' as const },
      { id: 'B2', name: `救护车里程费（${mileage.toFixed(1)}km）`, unit: 'km', quantity: Math.ceil(mileage), unitPrice: 12, category: 'mileage' as const },
      { id: 'B3', name: '院前急救监护费', unit: '次', quantity: 1, unitPrice: 120, category: 'equipment' as const },
      { id: 'B4', name: '氧气费', unit: '次', quantity: 1, unitPrice: 50, category: 'equipment' as const },
    ];
    if (c.priority === 'red') {
      items.push({ id: 'B5', name: '重症监护费', unit: '次', quantity: 1, unitPrice: 200, category: 'equipment' as const });
    }
    const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const billing: Billing = {
      id: `BILL${Date.now()}`,
      caseId,
      items,
      totalAmount: total,
      insuranceCoverage: Math.floor(total * 0.7),
      patientPayable: Math.ceil(total * 0.3),
      paymentStatus: 'pending',
      createdAt: now(),
    };

    dispatch({ type: 'ADD_BILLING', payload: billing });
    dispatch({
      type: 'UPDATE_CASE',
      payload: { id: caseId, updates: { billingId: billing.id } },
    });
  }, [state.cases]);

  return (
    <AppStateContext.Provider
      value={{
        state,
        dispatch,
        createNewCase,
        confirmDispatch,
        acceptAssignment,
        requestReinforcement,
        approveReinforcement,
        advanceCaseStep,
        updateCaseStatus,
        generateMedicalRecord,
        generateBilling,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

function now() { return new Date().toISOString(); }

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
