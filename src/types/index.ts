export type ScreenId =
  | 'dashboard'
  | 'patient-registration'
  | 'retinal-capture'
  | 'ai-diagnosis'
  | 'screening-queue'
  | 'referrals-tele-consult'
  | 'sync-offline-data'
  | 'settings-calibration';

export type Language = 'en' | 'hi' | 'mr';

export interface Patient {
  id: string;
  name: string;
  nameLocal?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  abhaId: string;
  mobile: string;
  village: string;
  rationId?: string;
  avatarUrl?: string;
  diabetesStatus: string;
  diabetesDuration?: string;
  rbs: string;
  rbsStatus: 'Normal' | 'Elevated' | 'Critical';
  bp: string;
  visionComplaint: string;
  previousHistory: string;
  screenTime: string;
  odScanUrl: string;
  osScanUrl: string;
  gradCamUrl?: string;
  odStatus: string;
  osStatus: string;
  aiDiagnosis: string;
  aiConfidence: string;
  riskLevel: 'Normal' | 'Mild' | 'High Risk' | 'Critical' | 'Incomplete';
  triageStatus: string;
  syncStatus: 'synced' | 'queued';
  csmeDetected?: boolean;
  microaneurysmsCount?: number;
  hardExudatesNote?: string;
  neovascularization?: boolean;
}

export interface CampStats {
  screenedToday: number;
  targetTotal: number;
  highRiskCount: number;
  normalCount: number;
  mildCount: number;
  pendingSyncCount: number;
  pendingAiCount: number;
  storageFreeGb: number;
  batteryPct: number;
  targetSlaTime: string;
}

export interface TeleconsultDoctor {
  name: string;
  qualifications: string;
  role: string;
  hospital: string;
  avatarUrl: string;
  status: 'Online' | 'In Consult' | 'Offline';
}

// ── AI Diagnosis Pipeline Types ──────────────────────────────────────────

export interface DiagnosisResult {
  diagnosis: string;
  confidence: number;
  csmeStatus: 'Present' | 'Absent';
  icdrGrade: number;        // 0–4 ICDR scale
  microaneurysms: string;
  hemorrhages: string;
  exudates: string;
  visualAcuityRisk: string;
  uncertaintyFlag?: boolean; // set when model confidence is low or image quality is poor
  modelVersion?: string;     // e.g. "gemini-2.5-flash"
}

export type AnalysisErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SERVER_ERROR'
  | 'INVALID_IMAGE'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
  retryable: boolean;
}

export type AnalysisState = 'idle' | 'analyzing' | 'complete' | 'error' | 'timeout';

export interface AnalysisPayload {
  od: DiagnosisResult | null;
  os: DiagnosisResult | null;
  analyzedAt: string;  // ISO timestamp
}
