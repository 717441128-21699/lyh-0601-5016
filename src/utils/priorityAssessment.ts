import type { EmergencyCase, Priority, DepartmentType, EquipmentType } from '../types';

interface PriorityAssessment {
  priority: Priority;
  score: number;
  departmentNeeded?: DepartmentType;
  specialEquipmentNeeded: EquipmentType[];
  keySymptoms: string[];
  rationale: string;
}

const RED_FLAG_SYMPTOMS: { keyword: string; dept?: DepartmentType; score: number }[] = [
  { keyword: '胸痛', dept: 'cardiology', score: 25 },
  { keyword: '胸闷', dept: 'cardiology', score: 15 },
  { keyword: '心肌梗死', dept: 'cardiology', score: 30 },
  { keyword: '心梗', dept: 'cardiology', score: 30 },
  { keyword: '心跳骤停', dept: 'emergency', score: 35 },
  { keyword: '呼吸骤停', dept: 'emergency', score: 35 },
  { keyword: '意识丧失', dept: 'emergency', score: 30 },
  { keyword: '呼之不应', dept: 'emergency', score: 28 },
  { keyword: '昏迷', dept: 'emergency', score: 28 },
  { keyword: '脑卒中', dept: 'neurology', score: 28 },
  { keyword: '脑出血', dept: 'neurology', score: 30 },
  { keyword: '脑梗死', dept: 'neurology', score: 28 },
  { keyword: '肢体无力', dept: 'neurology', score: 18 },
  { keyword: '言语不清', dept: 'neurology', score: 18 },
  { keyword: '偏瘫', dept: 'neurology', score: 22 },
  { keyword: '高处坠落', dept: 'trauma', score: 25 },
  { keyword: '车祸', dept: 'trauma', score: 25 },
  { keyword: '内出血', dept: 'trauma', score: 28 },
  { keyword: '骨折', dept: 'trauma', score: 15 },
  { keyword: '大出血', dept: 'trauma', score: 28 },
  { keyword: '呼吸困难', dept: 'emergency', score: 22 },
  { keyword: '哮喘', dept: 'emergency', score: 18 },
  { keyword: '窒息', dept: 'emergency', score: 32 },
  { keyword: '溺水', dept: 'emergency', score: 30 },
  { keyword: '触电', dept: 'emergency', score: 28 },
  { keyword: '孕妇', dept: 'obstetrics', score: 20 },
  { keyword: '产前', dept: 'obstetrics', score: 22 },
  { keyword: '阴道出血', dept: 'obstetrics', score: 25 },
  { keyword: '中毒', dept: 'toxicology', score: 25 },
  { keyword: '农药', dept: 'toxicology', score: 28 },
  { keyword: '药物过量', dept: 'toxicology', score: 25 },
  { keyword: '烧伤', dept: 'burn', score: 22 },
  { keyword: '烫伤', dept: 'burn', score: 15 },
];

const YELLOW_FLAG_SYMPTOMS: { keyword: string; dept?: DepartmentType; score: number }[] = [
  { keyword: '高烧', dept: 'emergency', score: 12 },
  { keyword: '发热', dept: 'emergency', score: 8 },
  { keyword: '呕吐', dept: 'emergency', score: 6 },
  { keyword: '腹泻', dept: 'emergency', score: 5 },
  { keyword: '腹痛', dept: 'emergency', score: 10 },
  { keyword: '头晕', dept: 'emergency', score: 6 },
  { keyword: '头痛', dept: 'neurology', score: 8 },
  { keyword: '高血压', dept: 'cardiology', score: 10 },
  { keyword: '眩晕', dept: 'emergency', score: 7 },
  { keyword: '心悸', dept: 'cardiology', score: 10 },
  { keyword: '过敏', dept: 'emergency', score: 8 },
  { keyword: '扭伤', dept: 'trauma', score: 5 },
  { keyword: '摔伤', dept: 'trauma', score: 8 },
  { keyword: '跌倒', dept: 'trauma', score: 10 },
  { keyword: '老年人', dept: 'emergency', score: 8 },
];

export function assessPriority(symptoms: string, patientAge: number): PriorityAssessment {
  let score = 10;
  const matchedSymptoms: string[] = [];
  let departmentNeeded: DepartmentType | undefined;
  let maxDeptScore = 0;

  for (const flag of RED_FLAG_SYMPTOMS) {
    if (symptoms.includes(flag.keyword)) {
      score += flag.score;
      matchedSymptoms.push(flag.keyword);
      if (flag.dept && flag.score > maxDeptScore) {
        maxDeptScore = flag.score;
        departmentNeeded = flag.dept;
      }
    }
  }

  for (const flag of YELLOW_FLAG_SYMPTOMS) {
    if (symptoms.includes(flag.keyword)) {
      score += flag.score;
      matchedSymptoms.push(flag.keyword);
      if (flag.dept && flag.score > maxDeptScore) {
        maxDeptScore = flag.score;
        departmentNeeded = flag.dept;
      }
    }
  }

  if (patientAge >= 65) score += 10;
  if (patientAge >= 80) score += 8;
  if (patientAge <= 3) score += 12;
  if (patientAge <= 12) score += 5;

  const specialEquipmentNeeded: EquipmentType[] = [];
  if (score >= 70) {
    specialEquipmentNeeded.push('defibrillator', 'ventilator', 'monitor', 'oxygen');
  } else if (score >= 40) {
    specialEquipmentNeeded.push('defibrillator', 'monitor', 'oxygen');
  } else {
    specialEquipmentNeeded.push('monitor', 'oxygen');
  }

  if (symptoms.includes('担架') || symptoms.includes('卧床') || symptoms.includes('无法移动')) {
    specialEquipmentNeeded.push('stretcher_special');
  }

  let priority: Priority;
  let rationale: string;

  if (score >= 70) {
    priority = 'red';
    rationale = `优先级红色（得分${score}）：检测到危及生命的症状：${matchedSymptoms.slice(0, 3).join('、')}，需立即响应，建议${departmentNeeded ? '转至' + departmentNeeded + '专科' : '急诊科'}处理。`;
  } else if (score >= 35) {
    priority = 'yellow';
    rationale = `优先级黄色（得分${score}）：检测到需要及时处理的症状：${matchedSymptoms.slice(0, 3).join('、')}，建议尽快响应，${departmentNeeded ? '优先考虑' + departmentNeeded + '专科' : '急诊科'}。`;
  } else {
    priority = 'green';
    rationale = `优先级绿色（得分${score}）：症状相对稳定，可按常规流程处理，${departmentNeeded ? '建议转诊至' + departmentNeeded : '急诊科就诊'}。`;
  }

  if (patientAge >= 80) {
    rationale += ` 高龄患者（${patientAge}岁）已加分。`;
  }
  if (patientAge <= 3) {
    rationale += ` 婴幼儿患者（${patientAge}岁）已加分。`;
  }

  return {
    priority,
    score: Math.min(score, 100),
    departmentNeeded,
    specialEquipmentNeeded,
    keySymptoms: matchedSymptoms,
    rationale,
  };
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'red': return 'bg-red-500';
    case 'yellow': return 'bg-amber-500';
    case 'green': return 'bg-green-500';
  }
}

export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'red': return '红色（危重）';
    case 'yellow': return '黄色（紧急）';
    case 'green': return '绿色（常规）';
  }
}
