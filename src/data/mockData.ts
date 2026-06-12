import type {
  Ambulance,
  Hospital,
  Station,
  Doctor,
  EmergencyCase,
  MaintenanceWorkOrder,
  VitalSigns,
} from '../types';

export const CITY_CENTER = { lat: 39.9042, lng: 116.4074 };

const DISTRICTS = ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区'];

function randomOffset(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range;
}

export const STATIONS: Station[] = [
  { id: 'ST001', name: '市中心急救站', location: { lat: 39.9042, lng: 116.4074, district: '东城区', address: '东长安街1号' }, type: 'main', capacity: 10 },
  { id: 'ST002', name: '朝阳急救站', location: { lat: 39.9219, lng: 116.4438, district: '朝阳区', address: '朝阳门外大街22号' }, type: 'sub', capacity: 8 },
  { id: 'ST003', name: '海淀急救站', location: { lat: 39.9599, lng: 116.2985, district: '海淀区', address: '中关村大街27号' }, type: 'sub', capacity: 8 },
  { id: 'ST004', name: '丰台急救站', location: { lat: 39.8586, lng: 116.2870, district: '丰台区', address: '丰台路45号' }, type: 'sub', capacity: 6 },
  { id: 'ST005', name: '通州急救站', location: { lat: 39.9085, lng: 116.6572, district: '通州区', address: '新华大街88号' }, type: 'sub', capacity: 6 },
  { id: 'ST006', name: '西城急救站', location: { lat: 39.9128, lng: 116.3658, district: '西城区', address: '复兴门内大街30号' }, type: 'sub', capacity: 7 },
];

export const AMBULANCES: Ambulance[] = [
  {
    id: 'AMB001',
    plateNumber: '京A-12001',
    vehicleType: 'advanced',
    status: 'idle',
    location: { lat: 39.9042, lng: 116.4074, district: '东城区' },
    equipment: ['defibrillator', 'ventilator', 'monitor', 'infusion_pump', 'stretcher_special', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D001', name: '张建国', phone: '138****1001', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '李明华', nurseName: '王晓燕', doctorPhone: '139****2001', nursePhone: '137****3001' },
    mileage: 45280,
    lastMaintenanceMileage: 40000,
    nextMaintenanceMileage: 50000,
    fuelLevel: 85,
    stationId: 'ST001',
  },
  {
    id: 'AMB002',
    plateNumber: '京A-12002',
    vehicleType: 'advanced',
    status: 'enroute_to_scene',
    location: { lat: 39.9150, lng: 116.4200, district: '东城区' },
    equipment: ['defibrillator', 'ventilator', 'monitor', 'stretcher_standard', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D002', name: '王志强', phone: '138****1002', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '赵文博', nurseName: '刘淑芬', doctorPhone: '139****2002', nursePhone: '137****3002' },
    mileage: 52100,
    lastMaintenanceMileage: 50000,
    nextMaintenanceMileage: 60000,
    fuelLevel: 72,
    currentCaseId: 'CASE20240101001',
    stationId: 'ST001',
  },
  {
    id: 'AMB003',
    plateNumber: '京B-12003',
    vehicleType: 'standard',
    status: 'idle',
    location: { lat: 39.9219, lng: 116.4438, district: '朝阳区' },
    equipment: ['defibrillator', 'monitor', 'stretcher_standard', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D003', name: '刘德胜', phone: '138****1003', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '陈向东', nurseName: '周美玲', doctorPhone: '139****2003', nursePhone: '137****3003' },
    mileage: 38650,
    lastMaintenanceMileage: 35000,
    nextMaintenanceMileage: 45000,
    fuelLevel: 90,
    stationId: 'ST002',
  },
  {
    id: 'AMB004',
    plateNumber: '京B-12004',
    vehicleType: 'standard',
    status: 'at_hospital',
    location: { lat: 39.9312, lng: 116.4528, district: '朝阳区' },
    equipment: ['defibrillator', 'monitor', 'stretcher_standard', 'oxygen', 'first_aid_kit', 'infusion_pump'],
    driver: { id: 'D004', name: '孙海涛', phone: '138****1004', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '黄志强', nurseName: '吴雅琴', doctorPhone: '139****2004', nursePhone: '137****3004' },
    mileage: 61800,
    lastMaintenanceMileage: 55000,
    nextMaintenanceMileage: 65000,
    fuelLevel: 45,
    stationId: 'ST002',
  },
  {
    id: 'AMB005',
    plateNumber: '京C-12005',
    vehicleType: 'advanced',
    status: 'idle',
    location: { lat: 39.9599, lng: 116.2985, district: '海淀区' },
    equipment: ['defibrillator', 'ventilator', 'monitor', 'infusion_pump', 'stretcher_special', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D005', name: '马文斌', phone: '138****1005', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '林建国', nurseName: '郑丽华', doctorPhone: '139****2005', nursePhone: '137****3005' },
    mileage: 28900,
    lastMaintenanceMileage: 25000,
    nextMaintenanceMileage: 35000,
    fuelLevel: 78,
    stationId: 'ST003',
  },
  {
    id: 'AMB006',
    plateNumber: '京C-12006',
    vehicleType: 'transport',
    status: 'returning',
    location: { lat: 39.9450, lng: 116.3100, district: '海淀区' },
    equipment: ['monitor', 'stretcher_standard', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D006', name: '朱鹏飞', phone: '138****1006', shiftStart: '20:00', shiftEnd: '08:00' },
    crew: { doctorName: '徐明辉', nurseName: '何小凤', doctorPhone: '139****2006', nursePhone: '137****3006' },
    mileage: 72500,
    lastMaintenanceMileage: 70000,
    nextMaintenanceMileage: 80000,
    fuelLevel: 55,
    stationId: 'ST003',
  },
  {
    id: 'AMB007',
    plateNumber: '京D-12007',
    vehicleType: 'standard',
    status: 'idle',
    location: { lat: 39.8586, lng: 116.2870, district: '丰台区' },
    equipment: ['defibrillator', 'monitor', 'stretcher_standard', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D007', name: '胡大军', phone: '138****1007', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '高文才', nurseName: '梁雪梅', doctorPhone: '139****2007', nursePhone: '137****3007' },
    mileage: 33400,
    lastMaintenanceMileage: 30000,
    nextMaintenanceMileage: 40000,
    fuelLevel: 88,
    stationId: 'ST004',
  },
  {
    id: 'AMB008',
    plateNumber: '京E-12008',
    vehicleType: 'advanced',
    status: 'idle',
    location: { lat: 39.9085, lng: 116.6572, district: '通州区' },
    equipment: ['defibrillator', 'ventilator', 'monitor', 'infusion_pump', 'stretcher_special', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D008', name: '郭志勇', phone: '138****1008', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '曹振华', nurseName: '邓丽娟', doctorPhone: '139****2008', nursePhone: '137****3008' },
    mileage: 41200,
    lastMaintenanceMileage: 40000,
    nextMaintenanceMileage: 50000,
    fuelLevel: 92,
    stationId: 'ST005',
  },
  {
    id: 'AMB009',
    plateNumber: '京F-12009',
    vehicleType: 'standard',
    status: 'maintenance',
    location: { lat: 39.9128, lng: 116.3658, district: '西城区' },
    equipment: ['defibrillator', 'monitor', 'stretcher_standard', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D009', name: '冯国庆', phone: '138****1009', shiftStart: '08:00', shiftEnd: '20:00' },
    crew: { doctorName: '董卫东', nurseName: '范慧敏', doctorPhone: '139****2009', nursePhone: '137****3009' },
    mileage: 66800,
    lastMaintenanceMileage: 60000,
    nextMaintenanceMileage: 66800,
    fuelLevel: 35,
    stationId: 'ST006',
  },
  {
    id: 'AMB010',
    plateNumber: '京G-12010',
    vehicleType: 'advanced',
    status: 'on_scene',
    location: { lat: 39.8950, lng: 116.3800, district: '西城区' },
    equipment: ['defibrillator', 'ventilator', 'monitor', 'infusion_pump', 'stretcher_special', 'oxygen', 'first_aid_kit'],
    driver: { id: 'D010', name: '韩志远', phone: '138****1010', shiftStart: '20:00', shiftEnd: '08:00' },
    crew: { doctorName: '魏建华', nurseName: '贾春燕', doctorPhone: '139****2010', nursePhone: '137****3010' },
    mileage: 48500,
    lastMaintenanceMileage: 45000,
    nextMaintenanceMileage: 55000,
    fuelLevel: 60,
    currentCaseId: 'CASE20240101002',
    stationId: 'ST006',
  },
];

export const HOSPITALS: Hospital[] = [
  {
    id: 'HOS001',
    name: '市中心医院',
    level: 'tertiary',
    location: { lat: 39.9120, lng: 116.4180, district: '东城区', address: '东四十条24号' },
    departments: [
      { type: 'emergency', name: '急诊科', availableBeds: 8, totalBeds: 20, onCallDoctors: 5, busyLevel: 0.6 },
      { type: 'cardiology', name: '心内科', availableBeds: 3, totalBeds: 15, onCallDoctors: 3, busyLevel: 0.8 },
      { type: 'neurology', name: '神经内科', availableBeds: 5, totalBeds: 12, onCallDoctors: 2, busyLevel: 0.58 },
      { type: 'trauma', name: '创伤外科', availableBeds: 4, totalBeds: 10, onCallDoctors: 3, busyLevel: 0.6 },
    ],
    emergencyCapacity: { availableBeds: 8, totalBeds: 20, triageLevel: 2, waitingPatients: 12 },
    contact: { phone: '010-66660001', emergencyHotline: '010-66660120' },
  },
  {
    id: 'HOS002',
    name: '朝阳人民医院',
    level: 'tertiary',
    location: { lat: 39.9312, lng: 116.4528, district: '朝阳区', address: '工人体育场南路8号' },
    departments: [
      { type: 'emergency', name: '急诊科', availableBeds: 5, totalBeds: 25, onCallDoctors: 6, busyLevel: 0.8 },
      { type: 'cardiology', name: '心内科', availableBeds: 2, totalBeds: 20, onCallDoctors: 4, busyLevel: 0.9 },
      { type: 'pediatrics', name: '儿科', availableBeds: 6, totalBeds: 15, onCallDoctors: 3, busyLevel: 0.6 },
      { type: 'trauma', name: '创伤中心', availableBeds: 1, totalBeds: 12, onCallDoctors: 2, busyLevel: 0.92 },
    ],
    emergencyCapacity: { availableBeds: 5, totalBeds: 25, triageLevel: 3, waitingPatients: 20 },
    contact: { phone: '010-66660002', emergencyHotline: '010-66660220' },
  },
  {
    id: 'HOS003',
    name: '海淀医科大学附属医院',
    level: 'tertiary',
    location: { lat: 39.9712, lng: 116.3150, district: '海淀区', address: '学院路100号' },
    departments: [
      { type: 'emergency', name: '急诊科', availableBeds: 12, totalBeds: 30, onCallDoctors: 7, busyLevel: 0.6 },
      { type: 'neurology', name: '神经内科', availableBeds: 8, totalBeds: 25, onCallDoctors: 5, busyLevel: 0.68 },
      { type: 'cardiology', name: '心内科', availableBeds: 6, totalBeds: 20, onCallDoctors: 4, busyLevel: 0.7 },
      { type: 'burn', name: '烧伤科', availableBeds: 3, totalBeds: 8, onCallDoctors: 2, busyLevel: 0.62 },
    ],
    emergencyCapacity: { availableBeds: 12, totalBeds: 30, triageLevel: 2, waitingPatients: 18 },
    contact: { phone: '010-66660003', emergencyHotline: '010-66660320' },
  },
  {
    id: 'HOS004',
    name: '丰台中心医院',
    level: 'secondary',
    location: { lat: 39.8680, lng: 116.2990, district: '丰台区', address: '丰台北路15号' },
    departments: [
      { type: 'emergency', name: '急诊科', availableBeds: 6, totalBeds: 15, onCallDoctors: 4, busyLevel: 0.6 },
      { type: 'trauma', name: '骨科', availableBeds: 4, totalBeds: 12, onCallDoctors: 3, busyLevel: 0.67 },
      { type: 'toxicology', name: '中毒科', availableBeds: 2, totalBeds: 6, onCallDoctors: 2, busyLevel: 0.67 },
    ],
    emergencyCapacity: { availableBeds: 6, totalBeds: 15, triageLevel: 2, waitingPatients: 9 },
    contact: { phone: '010-66660004', emergencyHotline: '010-66660420' },
  },
  {
    id: 'HOS005',
    name: '通州妇幼保健院',
    level: 'secondary',
    location: { lat: 39.9150, lng: 116.6650, district: '通州区', address: '新华南路200号' },
    departments: [
      { type: 'emergency', name: '急诊科', availableBeds: 4, totalBeds: 10, onCallDoctors: 3, busyLevel: 0.6 },
      { type: 'obstetrics', name: '产科', availableBeds: 5, totalBeds: 18, onCallDoctors: 4, busyLevel: 0.72 },
      { type: 'pediatrics', name: '儿科', availableBeds: 7, totalBeds: 15, onCallDoctors: 3, busyLevel: 0.53 },
    ],
    emergencyCapacity: { availableBeds: 4, totalBeds: 10, triageLevel: 1, waitingPatients: 6 },
    contact: { phone: '010-66660005', emergencyHotline: '010-66660520' },
  },
  {
    id: 'HOS006',
    name: '西城心血管专科医院',
    level: 'tertiary',
    location: { lat: 39.9200, lng: 116.3700, district: '西城区', address: '西直门南大街16号' },
    departments: [
      { type: 'emergency', name: '急诊科', availableBeds: 3, totalBeds: 12, onCallDoctors: 4, busyLevel: 0.75 },
      { type: 'cardiology', name: '心内科', availableBeds: 4, totalBeds: 30, onCallDoctors: 8, busyLevel: 0.87 },
      { type: 'trauma', name: '心外科', availableBeds: 2, totalBeds: 15, onCallDoctors: 5, busyLevel: 0.87 },
    ],
    emergencyCapacity: { availableBeds: 3, totalBeds: 12, triageLevel: 3, waitingPatients: 15 },
    contact: { phone: '010-66660006', emergencyHotline: '010-66660620' },
  },
];

export const DOCTORS: Doctor[] = [
  { id: 'DOC001', name: '张伟', department: 'emergency', title: '主任医师', hospitalId: 'HOS001', onDuty: true, phone: '139****8001',
    schedule: [{ day: '周一', startTime: '08:00', endTime: '17:00' }, { day: '周二', startTime: '08:00', endTime: '17:00' }] },
  { id: 'DOC002', name: '李芳', department: 'cardiology', title: '副主任医师', hospitalId: 'HOS001', onDuty: true, phone: '139****8002',
    schedule: [{ day: '周一', startTime: '08:00', endTime: '17:00' }] },
  { id: 'DOC003', name: '王磊', department: 'neurology', title: '主治医师', hospitalId: 'HOS003', onDuty: true, phone: '139****8003',
    schedule: [{ day: '周三', startTime: '08:00', endTime: '17:00' }] },
  { id: 'DOC004', name: '刘洋', department: 'trauma', title: '主任医师', hospitalId: 'HOS002', onDuty: false, phone: '139****8004',
    schedule: [{ day: '周四', startTime: '08:00', endTime: '17:00' }] },
  { id: 'DOC005', name: '陈静', department: 'pediatrics', title: '副主任医师', hospitalId: 'HOS005', onDuty: true, phone: '139****8005',
    schedule: [{ day: '周五', startTime: '08:00', endTime: '17:00' }] },
];

const SYMPTOM_PRESETS = [
  { desc: '突发胸痛、胸闷、大汗淋漓，怀疑急性心肌梗死', priority: 'red' as const, dept: 'cardiology' as const },
  { desc: '突发右侧肢体无力，言语不清，意识模糊', priority: 'red' as const, dept: 'neurology' as const },
  { desc: '高处坠落，意识不清，头部出血，四肢活动受限', priority: 'red' as const, dept: 'trauma' as const },
  { desc: '车祸外伤，腹部疼痛，疑似内出血', priority: 'red' as const, dept: 'trauma' as const },
  { desc: '呼吸困难，哮喘急性发作', priority: 'red' as const, dept: 'emergency' as const },
  { desc: '意识丧失，呼之不应，心跳呼吸骤停', priority: 'red' as const, dept: 'emergency' as const },
  { desc: '孕妇腹痛，阴道出血，约38周孕龄', priority: 'red' as const, dept: 'obstetrics' as const },
  { desc: '误服农药，意识尚清，恶心呕吐', priority: 'red' as const, dept: 'toxicology' as const },
  { desc: '全身大面积烧伤，面积约30%', priority: 'red' as const, dept: 'burn' as const },
  { desc: '高烧39.5度，咳嗽，咽痛，全身乏力', priority: 'yellow' as const, dept: 'emergency' as const },
  { desc: '腹痛伴呕吐，疑似急性肠胃炎', priority: 'yellow' as const, dept: 'emergency' as const },
  { desc: '摔倒后脚踝扭伤，肿胀疼痛', priority: 'green' as const, dept: 'trauma' as const },
  { desc: '头晕，血压偏高，既往高血压病史', priority: 'yellow' as const, dept: 'cardiology' as const },
  { desc: '老年人跌倒，臀部着地，疑似股骨骨折', priority: 'yellow' as const, dept: 'trauma' as const },
  { desc: '儿童发热38.5度，精神尚可', priority: 'green' as const, dept: 'pediatrics' as const },
];

const CALLER_NAMES = ['王先生', '李女士', '张先生', '刘女士', '陈先生', '杨女士', '黄先生', '赵女士', '周先生', '吴女士'];
const PATIENT_NAMES = ['王建国', '李秀英', '张德华', '刘桂芳', '陈明志', '杨淑珍', '黄志强', '赵美华', '周文博', '吴晓燕', '孙嘉诚', '马慧敏'];

export function generateMockCases(): EmergencyCase[] {
  const cases: EmergencyCase[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const preset = SYMPTOM_PRESETS[Math.floor(Math.random() * SYMPTOM_PRESETS.length)];
    const receivedTime = new Date(now.getTime() - (Math.random() * 3600000 * 4));
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const location = {
      lat: randomOffset(CITY_CENTER.lat, 0.12),
      lng: randomOffset(CITY_CENTER.lng, 0.25),
      district,
      address: `${district}某某路${Math.floor(Math.random() * 200 + 1)}号`,
    };

    const statuses: EmergencyCase['status'][] = ['waiting', 'dispatching', 'enroute', 'arrived', 'completed'];
    let status: EmergencyCase['status'] = 'completed';
    let priorityScore = preset.priority === 'red' ? 90 + Math.floor(Math.random() * 10) : preset.priority === 'yellow' ? 50 + Math.floor(Math.random() * 25) : 10 + Math.floor(Math.random() * 25);

    if (i < 2) {
      status = 'waiting';
      priorityScore = preset.priority === 'red' ? 95 : preset.priority === 'yellow' ? 65 : 30;
    } else if (i < 4) {
      status = 'dispatching';
    } else if (i < 7) {
      status = 'enroute';
    } else if (i < 9) {
      status = 'arrived';
    }

    const patientGender = Math.random() > 0.5 ? 'male' : 'female';
    const patientAge = Math.floor(Math.random() * 75 + 1);

    const assignments = [];
    let currentAssignmentId = undefined;
    let responseTimeSeconds: number | undefined = undefined;
    let dispatchedAt: string | undefined = undefined;
    let sceneArrivalTime: string | undefined = undefined;
    let hospitalArrivalTime: string | undefined = undefined;
    let closedAt: string | undefined = undefined;

    if (status !== 'waiting') {
      const assignedAmb = AMBULANCES.find(a => a.status !== 'idle' && a.status !== 'maintenance') || AMBULANCES[0];
      dispatchedAt = new Date(receivedTime.getTime() + Math.floor(Math.random() * 180 + 30) * 1000).toISOString();
      const assignment = {
        id: `ASGN${i}`,
        caseId: `CASE20240101${String(i + 1).padStart(3, '0')}`,
        ambulanceId: assignedAmb.id,
        assignedAt: dispatchedAt,
        acceptedAt: new Date(new Date(dispatchedAt).getTime() + Math.floor(Math.random() * 60 + 10) * 1000).toISOString(),
        etaToScene: Math.floor(Math.random() * 10 + 5),
        distanceToScene: +(Math.random() * 5 + 1).toFixed(1),
        score: 80 + Math.floor(Math.random() * 20),
      };
      assignments.push(assignment);
      currentAssignmentId = assignment.id;

      if (['enroute', 'arrived', 'completed'].includes(status)) {
        sceneArrivalTime = new Date(new Date(dispatchedAt).getTime() + Math.floor(Math.random() * 600 + 180) * 1000).toISOString();
        responseTimeSeconds = Math.floor((new Date(sceneArrivalTime).getTime() - receivedTime.getTime()) / 1000);
      }

      if (['arrived', 'completed'].includes(status)) {
        hospitalArrivalTime = new Date(new Date(sceneArrivalTime).getTime() + Math.floor(Math.random() * 1800 + 600) * 1000).toISOString();
      }

      if (status === 'completed') {
        closedAt = new Date(new Date(hospitalArrivalTime || receivedTime).getTime() + Math.floor(Math.random() * 3600 + 1800) * 1000).toISOString();
      }
    }

    cases.push({
      id: `CASE20240101${String(i + 1).padStart(3, '0')}`,
      caseNumber: `2024-${String(Math.floor(now.getMonth() + 1)).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
      callerName: CALLER_NAMES[Math.floor(Math.random() * CALLER_NAMES.length)],
      callerPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      patientName: PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)],
      patientAge,
      patientGender,
      incidentLocation: location,
      symptomDescription: preset.desc,
      suspectedCondition: preset.desc.split('，')[0],
      priority: preset.priority,
      status,
      priorityScore,
      departmentNeeded: preset.dept,
      specialEquipmentNeeded: preset.priority === 'red' ? ['defibrillator', 'ventilator', 'monitor'] : preset.priority === 'yellow' ? ['defibrillator', 'monitor'] : ['monitor'],
      receivedAt: receivedTime.toISOString(),
      dispatchedAt,
      sceneArrivalTime,
      hospitalArrivalTime,
      closedAt,
      responseTimeSeconds,
      assignments,
      currentAssignmentId,
      escalationLevel: priorityScore > 90 ? 2 : priorityScore > 70 ? 1 : 0,
      autoReassigned: Math.random() > 0.9,
      vitalSigns: status !== 'waiting' ? generateVitalSigns(status) : undefined,
    });
  }

  return cases;
}

export function generateVitalSigns(status: EmergencyCase['status']): VitalSigns[] {
  const signs: VitalSigns[] = [];
  const count = status === 'completed' ? 8 : status === 'arrived' ? 5 : status === 'enroute' ? 3 : 1;

  for (let i = 0; i < count; i++) {
    const base = {
      heartRate: 72 + Math.floor(Math.random() * 40 - 20),
      bloodPressureSystolic: 120 + Math.floor(Math.random() * 40 - 20),
      bloodPressureDiastolic: 80 + Math.floor(Math.random() * 20 - 10),
      oxygenSaturation: Math.min(100, 92 + Math.floor(Math.random() * 9)),
      respiratoryRate: 16 + Math.floor(Math.random() * 10 - 5),
      temperature: +(36.5 + Math.random() * 1.5).toFixed(1),
      consciousness: (['alert', 'verbal', 'painful', 'unresponsive'] as const)[i === 0 ? Math.floor(Math.random() * 3) : 0],
    };

    signs.push({
      timestamp: new Date(Date.now() - (count - i) * 300000).toISOString(),
      ...base,
      ecgData: Array.from({ length: 50 }, () => Math.random() * 2 - 1),
    });
  }

  return signs;
}

export const MAINTENANCE_ORDERS: MaintenanceWorkOrder[] = [
  {
    id: 'MO001',
    ambulanceId: 'AMB009',
    type: 'routine',
    description: '按里程例行保养：更换机油、三滤，检查制动系统、轮胎、灯光',
    triggerMileage: 66800,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    status: 'in_progress',
    cost: 1200,
    notes: '同时检查空调系统',
  },
  {
    id: 'MO002',
    ambulanceId: 'AMB006',
    type: 'inspection',
    description: '年度安全技术检测：底盘、车身结构、急救设备校准',
    triggerMileage: 72500,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    status: 'pending',
  },
  {
    id: 'MO003',
    ambulanceId: 'AMB004',
    type: 'repair',
    description: '燃油液位传感器故障，需更换传感器总成',
    triggerMileage: 61800,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: 'pending',
    cost: 850,
  },
];

export function generateRandomLocation(): GeoLocation {
  const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
  return {
    lat: randomOffset(CITY_CENTER.lat, 0.15),
    lng: randomOffset(CITY_CENTER.lng, 0.3),
    district,
    address: `${district}某某路${Math.floor(Math.random() * 200 + 1)}号`,
  };
}
