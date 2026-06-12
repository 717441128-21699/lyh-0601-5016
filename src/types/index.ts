export type Priority = 'red' | 'yellow' | 'green';

export type CaseStatus = 'waiting' | 'dispatching' | 'enroute' | 'arrived' | 'transferred' | 'completed' | 'cancelled';

export type AmbulanceStatus = 'idle' | 'enroute_to_scene' | 'on_scene' | 'enroute_to_hospital' | 'at_hospital' | 'returning' | 'maintenance';

export type EquipmentType = 'defibrillator' | 'ventilator' | 'monitor' | 'infusion_pump' | 'stretcher_special' | 'stretcher_standard' | 'oxygen' | 'first_aid_kit';

export type DepartmentType = 'emergency' | 'cardiology' | 'neurology' | 'trauma' | 'pediatrics' | 'obstetrics' | 'burn' | 'toxicology';

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  district?: string;
}

export interface Ambulance {
  id: string;
  plateNumber: string;
  vehicleType: 'advanced' | 'standard' | 'transport';
  status: AmbulanceStatus;
  location: GeoLocation;
  equipment: EquipmentType[];
  driver: {
    id: string;
    name: string;
    phone: string;
    shiftStart: string;
    shiftEnd: string;
  };
  crew: {
    doctorName: string;
    nurseName: string;
    doctorPhone: string;
    nursePhone: string;
  };
  mileage: number;
  lastMaintenanceMileage: number;
  nextMaintenanceMileage: number;
  fuelLevel: number;
  currentCaseId?: string;
  stationId: string;
}

export interface Hospital {
  id: string;
  name: string;
  level: 'tertiary' | 'secondary' | 'primary';
  location: GeoLocation;
  departments: {
    type: DepartmentType;
    name: string;
    availableBeds: number;
    totalBeds: number;
    onCallDoctors: number;
    busyLevel: number;
  }[];
  emergencyCapacity: {
    availableBeds: number;
    totalBeds: number;
    triageLevel: number;
    waitingPatients: number;
  };
  contact: {
    phone: string;
    emergencyHotline: string;
  };
}

export interface Doctor {
  id: string;
  name: string;
  department: DepartmentType;
  title: string;
  hospitalId: string;
  onDuty: boolean;
  phone: string;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
}

export interface VitalSigns {
  timestamp: string;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  temperature: number;
  ecgData?: number[];
  consciousness: 'alert' | 'verbal' | 'painful' | 'unresponsive';
}

export interface MedicalRecord {
  id: string;
  caseId: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  allergies: string;
  medications: string;
  physicalExam: string;
  preliminaryDiagnosis: string;
  treatmentOnScene: string;
  treatmentEnroute: string;
  vitalSignsHistory: VitalSigns[];
  createdAt: string;
  doctorSignature: string;
}

export interface BillingItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  category: 'mileage' | 'equipment' | 'medication' | 'personnel' | 'other';
}

export interface Billing {
  id: string;
  caseId: string;
  items: BillingItem[];
  totalAmount: number;
  insuranceCoverage: number;
  patientPayable: number;
  paymentStatus: 'pending' | 'paid' | 'partial';
  createdAt: string;
  paidAt?: string;
}

export interface MaintenanceWorkOrder {
  id: string;
  ambulanceId: string;
  type: 'routine' | 'repair' | 'inspection';
  description: string;
  triggerMileage: number;
  createdAt: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  cost?: number;
  notes?: string;
}

export interface DispatchAssignment {
  id: string;
  caseId: string;
  ambulanceId: string;
  hospitalId?: string;
  assignedAt: string;
  acceptedAt?: string;
  arrivedAtScene?: string;
  departedScene?: string;
  arrivedAtHospital?: string;
  etaToScene: number;
  distanceToScene: number;
  score: number;
  reinforecementRequested?: boolean;
  reinforecementApproved?: boolean;
  reinforecementAssignment?: boolean;
  approvedAt?: string;
  notes?: string;
}

export interface EmergencyCase {
  id: string;
  caseNumber: string;
  callerName: string;
  callerPhone: string;
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'unknown';
  incidentLocation: GeoLocation;
  symptomDescription: string;
  suspectedCondition: string;
  priority: Priority;
  status: CaseStatus;
  priorityScore: number;
  departmentNeeded?: DepartmentType;
  specialEquipmentNeeded?: EquipmentType[];
  receivedAt: string;
  dispatchedAt?: string;
  sceneArrivalTime?: string;
  hospitalArrivalTime?: string;
  closedAt?: string;
  responseTimeSeconds?: number;
  transportTimeSeconds?: number;
  totalTimeSeconds?: number;
  assignments: DispatchAssignment[];
  currentAssignmentId?: string;
  vitalSigns?: VitalSigns[];
  medicalRecordId?: string;
  billingId?: string;
  notes?: string;
  escalationLevel: 0 | 1 | 2;
  autoReassigned: boolean;
}

export interface TrafficIndex {
  timestamp: string;
  district: string;
  congestionLevel: number;
  averageSpeed: number;
}

export interface Station {
  id: string;
  name: string;
  location: GeoLocation;
  type: 'main' | 'sub';
  capacity: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  relatedCaseId?: string;
  relatedAmbulanceId?: string;
}
