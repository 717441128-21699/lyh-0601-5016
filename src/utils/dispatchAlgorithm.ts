import type { EmergencyCase, Ambulance, Hospital, DispatchAssignment, GeoLocation } from '../types';

interface DispatchCandidate {
  ambulance: Ambulance;
  hospital?: Hospital;
  distanceToScene: number;
  distanceToHospital: number;
  etaToScene: number;
  travelTimeIndex: number;
  equipmentMatchScore: number;
  crewReadyScore: number;
  stationCoverageScore: number;
  totalScore: number;
  reasons: string[];
}

export interface DispatchPlan {
  caseId: string;
  primary: DispatchCandidate;
  alternatives: DispatchCandidate[];
  recommendedHospital?: Hospital;
  routingNotes: string[];
}

function haversineDistance(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371;
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getDistrictCongestionIndex(district?: string): number {
  if (!district) return 1.0;
  const weights: Record<string, number> = {
    '东城区': 1.4, '西城区': 1.5, '朝阳区': 1.3, '海淀区': 1.25,
    '丰台区': 1.15, '石景山区': 1.1, '通州区': 1.2, '昌平区': 1.1,
  };
  return weights[district] || 1.15;
}

function isNearShiftEnd(ambulance: Ambulance): { nearEnd: boolean; minutesLeft: number } {
  const now = new Date();
  const [shiftHour, shiftMin] = ambulance.driver.shiftEnd.split(':').map(Number);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(shiftHour, shiftMin, 0, 0);
  if (shiftEnd < now) shiftEnd.setDate(shiftEnd.getDate() + 1);
  const minutesLeft = (shiftEnd.getTime() - now.getTime()) / 60000;
  return { nearEnd: minutesLeft < 60, minutesLeft: Math.round(minutesLeft) };
}

export function generateDispatchPlan(
  caseData: EmergencyCase,
  ambulances: Ambulance[],
  hospitals: Hospital[]
): DispatchPlan {
  const candidates: DispatchCandidate[] = [];
  const sceneLocation = caseData.incidentLocation;
  const neededEquipment = caseData.specialEquipmentNeeded || [];
  const neededDept = caseData.departmentNeeded;

  const availableAmbulances = ambulances.filter(a => a.status === 'idle');

  for (const ambulance of availableAmbulances) {
    const distToScene = haversineDistance(ambulance.location, sceneLocation);
    const congestionIdx = getDistrictCongestionIndex(sceneLocation.district);
    const avgSpeed = 40 / congestionIdx;
    const etaToScene = (distToScene / avgSpeed) * 60;

    const equipmentMatched = neededEquipment.filter(e => ambulance.equipment.includes(e)).length;
    const equipmentMatchScore = neededEquipment.length > 0
      ? (equipmentMatched / neededEquipment.length) * 35
      : 30;

    const shiftStatus = isNearShiftEnd(ambulance);
    let crewReadyScore = 25;
    const reasons: string[] = [];
    if (shiftStatus.nearEnd) {
      crewReadyScore = Math.max(5, 25 - (60 - shiftStatus.minutesLeft) / 2);
      reasons.push(`司机距换班剩${shiftStatus.minutesLeft}分钟`);
    }

    if (ambulance.vehicleType === 'advanced' && caseData.priority === 'red') {
      crewReadyScore += 5;
      reasons.push('重症监护型救护车匹配优先');
    }
    if (ambulance.fuelLevel < 30) {
      crewReadyScore -= 5;
      reasons.push(`油量低(${ambulance.fuelLevel}%)`);
    }

    const stationCoverageScore = 10;

    let totalScore =
      Math.max(0, 30 - distToScene * 3) +
      equipmentMatchScore +
      crewReadyScore +
      stationCoverageScore;

    if (etaToScene <= 8) totalScore += 10;
    else if (etaToScene <= 12) totalScore += 5;
    else if (etaToScene > 20) totalScore -= 10;

    if (distToScene < 3) reasons.push(`距离仅${distToScene.toFixed(1)}km`);
    if (equipmentMatched === neededEquipment.length && neededEquipment.length > 0) {
      reasons.push('急救设备完全匹配');
    }

    candidates.push({
      ambulance,
      distanceToScene: +distToScene.toFixed(2),
      distanceToHospital: 0,
      etaToScene: +etaToScene.toFixed(1),
      travelTimeIndex: congestionIdx,
      equipmentMatchScore: +equipmentMatchScore.toFixed(1),
      crewReadyScore: +crewReadyScore.toFixed(1),
      stationCoverageScore,
      totalScore: +totalScore.toFixed(1),
      reasons,
    });
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);

  let recommendedHospital: Hospital | undefined;
  if (candidates.length > 0 && neededDept) {
    const hospitalScores = hospitals.map(h => {
      const deptData = h.departments.find(d => d.type === neededDept);
      const dist = haversineDistance(sceneLocation, h.location);
      let score = 0;
      score += Math.max(0, 40 - dist * 5);
      if (deptData) {
        score += (deptData.availableBeds / Math.max(deptData.totalBeds, 1)) * 30;
        score += deptData.onCallDoctors * 4;
        score += (1 - deptData.busyLevel) * 20;
      }
      if (h.level === 'tertiary') score += 15;
      else if (h.level === 'secondary') score += 8;
      return { hospital: h, score: +score.toFixed(1), dist: +dist.toFixed(2), deptData };
    });
    hospitalScores.sort((a, b) => b.score - a.score);
    if (hospitalScores.length > 0 && hospitalScores[0].deptData) {
      recommendedHospital = hospitalScores[0].hospital;
      candidates[0].hospital = hospitalScores[0].hospital;
      candidates[0].distanceToHospital = hospitalScores[0].dist;
    }
  }

  const routingNotes: string[] = [];
  if (sceneLocation.district) {
    const congestion = getDistrictCongestionIndex(sceneLocation.district);
    if (congestion >= 1.4) {
      routingNotes.push(`⚠️ ${sceneLocation.district}当前交通拥堵，ETA已按拥堵系数${congestion.toFixed(2)}调整`);
    }
  }
  if (caseData.priority === 'red' && candidates.length > 0 && candidates[0].etaToScene > 12) {
    routingNotes.push(`⚠️ 红色优先级案件但最近车辆预计${candidates[0].etaToScene}分钟到达，建议通知沿途交通疏导`);
  }

  return {
    caseId: caseData.id,
    primary: candidates[0],
    alternatives: candidates.slice(1, 4),
    recommendedHospital,
    routingNotes,
  };
}

export function createAssignment(
  caseId: string,
  candidate: DispatchCandidate
): DispatchAssignment {
  return {
    id: `ASGN${Date.now()}`,
    caseId,
    ambulanceId: candidate.ambulance.id,
    hospitalId: candidate.hospital?.id,
    assignedAt: new Date().toISOString(),
    etaToScene: candidate.etaToScene,
    distanceToScene: candidate.distanceToScene,
    score: candidate.totalScore,
  };
}

export function checkTimeoutAndReassign(
  caseData: EmergencyCase,
  dispatchPlan: DispatchPlan,
  timeoutSeconds: number = 120
): { timedOut: boolean; newPlan?: DispatchPlan } {
  if (caseData.status !== 'dispatching') return { timedOut: false };
  if (!caseData.currentAssignmentId) return { timedOut: false };

  const currentAssignment = caseData.assignments.find(a => a.id === caseData.currentAssignmentId);
  if (!currentAssignment) return { timedOut: false };
  if (currentAssignment.acceptedAt) return { timedOut: false };

  const elapsed = (Date.now() - new Date(currentAssignment.assignedAt).getTime()) / 1000;
  return { timedOut: elapsed > timeoutSeconds };
}
