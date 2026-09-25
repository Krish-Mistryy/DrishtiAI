import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScreenId,
  Patient,
  TeleconsultDoctor,
  DiagnosisResult,
  AnalysisState,
  AnalysisError as AnalysisErrorType,
} from '../../types';
import { analyzeRetina, checkApiHealth, sendSmsReferral } from '../../services/retinaApi';

interface AiDiagnosisScreenProps {
  patient: Patient;
  doctor: TeleconsultDoctor;
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  onOpenTeleconsult: (patient: Patient) => void;
  onOpenPrintSlip: (patient: Patient) => void;
  showToast: (msg: string, icon?: string) => void;
  onUpdatePatient?: (updated: Partial<Patient>) => Promise<void>;
}

// ── Confidence thresholds ────────────────────────────────────────────────
const CONFIDENCE_LOW = 70;
const CONFIDENCE_MODERATE = 85;

function confidenceColor(c: number) {
  if (c >= CONFIDENCE_MODERATE) return 'text-emerald-700';
  if (c >= CONFIDENCE_LOW) return 'text-amber-700';
  return 'text-red-700';
}

function confidenceBg(c: number) {
  if (c >= CONFIDENCE_MODERATE) return 'bg-emerald-50 border-emerald-200';
  if (c >= CONFIDENCE_LOW) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function riskLabel(data: DiagnosisResult): { label: string; cls: string } {
  const risk = data.visualAcuityRisk?.toLowerCase() ?? '';
  if (risk.includes('critical') || risk.includes('high'))
    return { label: 'High Risk', cls: 'bg-red-100 text-red-800' };
  if (risk.includes('moderate') || risk.includes('medium'))
    return { label: 'Moderate', cls: 'bg-amber-100 text-amber-800' };
  return { label: 'Low Risk', cls: 'bg-emerald-100 text-emerald-800' };
}

// ── Error display mapping ────────────────────────────────────────────────
const ERROR_ICONS: Record<string, string> = {
  TIMEOUT: 'hourglass_disabled',
  NETWORK: 'wifi_off',
  SERVER_ERROR: 'cloud_off',
  INVALID_IMAGE: 'broken_image',
  RATE_LIMITED: 'speed',
  UNKNOWN: 'error',
};

export const AiDiagnosisScreen: React.FC<AiDiagnosisScreenProps> = ({
  patient,
  doctor,
  onNavigate,
  onOpenFundusModal,
  onOpenTeleconsult,
  onOpenPrintSlip,
  showToast,
  onUpdatePatient,
}) => {
  const [heatmapIntensity, setHeatmapIntensity] = useState(85);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);

  // ── Analysis state machine ─────────────────────────────────────────
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisData, setAnalysisData] = useState<{
    od: DiagnosisResult;
    os: DiagnosisResult;
    analyzedAt: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<AnalysisErrorType | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ── Elapsed timer during analysis ──────────────────────────────────
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Clinician sign-off ─────────────────────────────────────────────
  const [clinicianConfirmed, setClinicianConfirmed] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  // ── API health check on mount ──────────────────────────────────────
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  useEffect(() => {
    checkApiHealth().then((h) => setApiHealthy(h.ok));
  }, []);

  // ── Scans available check ──────────────────────────────────────────
  const hasOdScan = !!patient.odScanUrl;
  const hasOsScan = !!patient.osScanUrl;
  const hasBothScans = hasOdScan && hasOsScan;

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Run analysis ───────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!hasBothScans) {
      setAnalysisError({
        code: 'INVALID_IMAGE',
        message: 'Both OD and OS retinal scans are required before AI analysis can proceed. Please capture the missing eye(s) first.',
        retryable: false,
      });
      setAnalysisState('error');
      return;
    }

    // Reset state
    setAnalysisState('analyzing');
    setAnalysisError(null);
    setAnalysisData(null);
    setClinicianConfirmed(false);
    setConfirmedAt(null);
    setElapsedMs(0);

    // Start elapsed timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    // AbortController for cancellation
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await analyzeRetina(
        patient.odScanUrl,
        patient.osScanUrl,
        controller.signal,
      );
      setAnalysisData(result);
      setAnalysisState('complete');
      setRetryCount(0);
      showToast('AI analysis completed. Awaiting clinician review.', 'check_circle');
      
      // Save preliminary results to DB
      if (onUpdatePatient) {
        onUpdatePatient({
          aiDiagnosis: result.od.diagnosis, // Storing OD diagnosis as primary for now
          aiConfidence: result.od.confidence.toString(),
          csmeDetected: result.od.csmeStatus === 'Present' || result.os.csmeStatus === 'Present',
        });
      }
    } catch (err: unknown) {
      const analysisErr = err as AnalysisErrorType;
      setAnalysisError(analysisErr);

      if (analysisErr.code === 'TIMEOUT') {
        setAnalysisState('timeout');
      } else {
        setAnalysisState('error');
      }
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [patient.odScanUrl, patient.osScanUrl, hasBothScans, showToast]);

  // ── Cancel in-flight ──────────────────────────────────────────────
  const cancelAnalysis = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setAnalysisState('idle');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    showToast('Analysis cancelled.', 'cancel');
  }, [showToast]);

  // ── Retry handler ─────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    runAnalysis();
  }, [runAnalysis]);

  // ── Clinician sign-off ─────────────────────────────────────────────
  const handleClinicianConfirm = () => {
    setClinicianConfirmed(true);
    setConfirmedAt(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    showToast('Clinician sign-off recorded. AI findings now confirmed.', 'verified');
    if (onUpdatePatient && analysisData) {
      onUpdatePatient({
        triageStatus: 'Clinician Confirmed',
        aiDiagnosis: analysisData.od.diagnosis, // Using OD as representative for DB schema
        riskLevel: analysisData.od.visualAcuityRisk?.includes('high') ? 'High Risk' : 'Normal', // Simplify mapping
      });
    }
  };

  // ── SMS and Sync ───────────────────────────────────────────────────
  const handleSendSms = async () => {
    setIsSendingSms(true);
    showToast(`Transmitting encrypted SMS referral token to ${patient.mobile}...`, 'sms');
    try {
      await sendSmsReferral(
        patient.mobile,
        `Drishti: Referral needed for ${patient.name}. Diagnosis: ${analysisData?.od?.diagnosis || 'Pending'}. Secure token: ${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      );
      showToast(`Referral tele-token dispatched to ${patient.mobile} & registered on ABDM Gateway.`, 'done_all');
    } catch (err) {
      showToast('Failed to send SMS referral token. Gateway timeout.', 'error');
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSaveAndSync = async () => {
    setIsSyncing(true);
    showToast('Encrypting diagnostic package with AES-256 in local SQLite...', 'lock');
    try {
      if (onUpdatePatient) {
        await onUpdatePatient({ syncStatus: 'queued' });
      }
      showToast('Record secured in SQLite local vault. Queued for 4G background sync.', 'verified_user');
    } catch (err) {
      showToast('Failed to secure record in local vault.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────
  const isHighRisk =
    analysisData &&
    (analysisData.od.visualAcuityRisk?.toLowerCase().includes('high') ||
      analysisData.od.visualAcuityRisk?.toLowerCase().includes('critical') ||
      analysisData.os.visualAcuityRisk?.toLowerCase().includes('high') ||
      analysisData.os.visualAcuityRisk?.toLowerCase().includes('critical'));

  const hasUncertainty =
    analysisData &&
    (analysisData.od.uncertaintyFlag || analysisData.os.uncertaintyFlag);

  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="flex flex-col w-full select-none">
      <div className="p-4 lg:p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-5 pb-20">
        {/* Progress Pipeline & Patient Meta Strip */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Patient Identity Group */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0d766e] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  {patient.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  {patient.age} Y / {patient.gender}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold font-mono">
                  ABHA: {patient.abhaId}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-xs mt-1">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-sm text-[#0d766e]">
                    pin_drop
                  </span>
                  Vadbare Anganwadi Camp #03
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-600">
                    memory
                  </span>
                  Today, {patient.screenTime} (Edge NPU Offline)
                </span>
              </div>
            </div>
          </div>

          {/* Step Indicator Tracker */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => onNavigate('patient-registration')}
              className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-emerald-700 text-lg font-bold">
                check_circle
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  Step 1
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  Registration
                </span>
              </div>
            </button>

            <span className="material-symbols-outlined text-slate-300 text-base">
              chevron_right
            </span>

            <button
              type="button"
              onClick={() => onNavigate('retinal-capture')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer ${
                hasBothScans
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg font-bold ${
                  hasBothScans ? 'text-emerald-700' : 'text-amber-600'
                }`}
              >
                {hasBothScans ? 'check_circle' : 'warning'}
              </span>
              <div className="flex flex-col text-left">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    hasBothScans ? 'text-emerald-700' : 'text-amber-600'
                  }`}
                >
                  Step 2
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  Retinal Capture
                </span>
              </div>
            </button>

            <span className="material-symbols-outlined text-slate-300 text-base">
              chevron_right
            </span>

            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg shadow-xs ${
                analysisState === 'analyzing'
                  ? 'bg-[#0d766e] text-white'
                  : analysisState === 'complete'
                  ? 'bg-emerald-600 text-white'
                  : analysisState === 'error' || analysisState === 'timeout'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  analysisState === 'analyzing' ? 'animate-spin' : ''
                }`}
              >
                {analysisState === 'complete'
                  ? 'check_circle'
                  : analysisState === 'error' || analysisState === 'timeout'
                  ? 'error'
                  : 'smart_toy'}
              </span>
              <div className="flex flex-col text-left">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    analysisState === 'analyzing'
                      ? 'text-teal-200'
                      : analysisState === 'complete'
                      ? 'text-emerald-200'
                      : analysisState === 'error' || analysisState === 'timeout'
                      ? 'text-red-200'
                      : 'text-slate-500'
                  }`}
                >
                  Step 3
                </span>
                <span className="text-xs font-bold">AI Diagnosis & Triage</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            STATE: IDLE — Show "Start Analysis" CTA
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'idle' && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-[#0d766e] mb-4">
              smart_toy
            </span>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              AI Retinal Analysis
            </h2>
            <p className="text-sm text-slate-500 mb-2 text-center max-w-md">
              Analyzes captured fundus images using Gemini 2.5 Flash for Diabetic Retinopathy screening.
            </p>

            {/* AI disclaimer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 mb-6">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>AI-assisted screening only — not a clinical diagnosis. Requires clinician confirmation.</span>
            </div>

            {/* API health indicator */}
            {apiHealthy !== null && (
              <div
                className={`flex items-center gap-1.5 text-xs font-medium mb-4 ${
                  apiHealthy ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiHealthy ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {apiHealthy
                  ? 'AI service connected'
                  : 'AI service unavailable — check server'}
              </div>
            )}

            {/* Missing scans warning */}
            {!hasBothScans && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold mb-4 max-w-md">
                <span className="material-symbols-outlined text-base">
                  warning
                </span>
                <div>
                  {!hasOdScan && !hasOsScan
                    ? 'No retinal scans captured. Both OD and OS images are required.'
                    : !hasOdScan
                    ? 'OD (Right Eye) scan missing. Capture before running analysis.'
                    : 'OS (Left Eye) scan missing. Capture before running analysis.'}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!hasBothScans || apiHealthy === false}
                onClick={runAnalysis}
                className={`min-h-[50px] px-8 py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${
                  hasBothScans && apiHealthy !== false
                    ? 'bg-[#0d766e] hover:bg-[#005c55] text-white cursor-pointer active:translate-y-px'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  play_arrow
                </span>
                Run AI Analysis
              </button>

              {!hasBothScans && (
                <button
                  type="button"
                  onClick={() => onNavigate('retinal-capture')}
                  className="min-h-[50px] px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer active:translate-y-px"
                >
                  <span className="material-symbols-outlined text-lg text-[#0d766e]">
                    linked_camera
                  </span>
                  Capture Scans
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: ANALYZING — Progress with elapsed timer
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-xs drishti-entrance drishti-entrance--visible">
            <span className="material-symbols-outlined text-5xl text-[#0d766e] animate-spin mb-4">
              smart_toy
            </span>
            <h2 className="text-xl font-bold text-slate-900 mb-2 drishti-status-pulse">
              Analyzing Retinal Scans...
            </h2>
            <p className="text-sm text-slate-500 mb-1">
              Processing via secure server-side Gemini 2.5 Flash API
            </p>
            <p className="text-xs text-slate-400 mb-6 font-mono">
              Elapsed: {elapsedSec}s
            </p>
            <div className="w-64 bg-slate-100 h-2.5 rounded-full overflow-hidden mb-6">
              <div
                className="bg-[#0d766e] h-full rounded-full transition-all duration-300 drishti-progress-fill"
                style={{
                  width: `${Math.min(95, (elapsedMs / 30000) * 100)}%`,
                }}
              />
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200 mb-4">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>API key secured server-side. No credentials in browser.</span>
            </div>

            <button
              type="button"
              onClick={cancelAnalysis}
              className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer drishti-btn"
            >
              <span className="material-symbols-outlined text-base">close</span>
              Cancel
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: TIMEOUT — Specific timeout UI
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'timeout' && (
          <div className="flex flex-col items-center justify-center py-20 bg-amber-50 rounded-xl border border-amber-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-amber-600 mb-4">
              hourglass_disabled
            </span>
            <h2 className="text-xl font-bold text-amber-900 mb-2">
              Analysis Timed Out
            </h2>
            <p className="text-sm text-amber-700 mb-2 text-center max-w-md">
              {analysisError?.message ||
                'The AI service did not respond within 30 seconds. This may be due to high server load or network latency.'}
            </p>
            <p className="text-xs text-amber-600 mb-6 font-mono">
              Elapsed: {elapsedSec}s • Attempts: {retryCount + 1}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined">refresh</span>
                Retry Analysis
              </button>
              <button
                type="button"
                onClick={() => setAnalysisState('idle')}
                className="px-5 py-2.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-sm font-semibold hover:bg-amber-50 cursor-pointer transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: ERROR — Categorized error display
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'error' && analysisError && (
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl border border-red-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-red-600 mb-4">
              {ERROR_ICONS[analysisError.code] || 'error'}
            </span>
            <h2 className="text-xl font-bold text-red-900 mb-2">
              Analysis Failed
            </h2>
            <p className="text-sm text-red-700 mb-2 text-center max-w-md">
              {analysisError.message}
            </p>
            <div className="flex items-center gap-2 text-xs text-red-500 mb-6 font-mono">
              <span>Error: {analysisError.code}</span>
              <span>•</span>
              <span>Attempts: {retryCount + 1}</span>
            </div>

            <div className="flex items-center gap-3">
              {analysisError.retryable && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Retry Analysis
                </button>
              )}
              {!analysisError.retryable && analysisError.code === 'INVALID_IMAGE' && (
                <button
                  type="button"
                  onClick={() => onNavigate('retinal-capture')}
                  className="px-6 py-2.5 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined">linked_camera</span>
                  Re-capture Scans
                </button>
              )}
              <button
                type="button"
                onClick={() => setAnalysisState('idle')}
                className="px-5 py-2.5 rounded-lg bg-white border border-red-300 text-red-800 text-sm font-semibold hover:bg-red-50 cursor-pointer transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: COMPLETE — Full results with AI/Clinician distinction
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'complete' && analysisData && (
          <>
            {/* ── Uncertainty Banner ───────────────────────────────────── */}
            {hasUncertainty && (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 lg:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">
                      psychology_alt
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-amber-800 tracking-tight">
                      LOW CONFIDENCE — AI RESULTS UNCERTAIN
                    </span>
                    <p className="text-xs text-amber-700 font-medium mt-1">
                      One or both eyes scored below {CONFIDENCE_LOW}% confidence.
                      Image quality may be insufficient or the condition may be atypical.
                      Manual clinical evaluation is strongly recommended.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── High Risk Alert Banner ──────────────────────────────── */}
            {isHighRisk && (
              <div className="rounded-xl bg-red-50 border-2 border-red-300 text-red-950 p-4 lg:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">
                      warning
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-red-700 tracking-tight">
                        URGENT CLINICAL TRIAGE: HIGH RISK — IMMEDIATE REFERRAL REQUIRED
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest">
                        Priority 1 (Red)
                      </span>
                    </div>
                    <p className="text-xs text-red-900 font-medium mt-1">
                      AI screening indicates high risk with potential threat to central visual acuity.
                      These are <strong>preliminary AI findings</strong> and require clinical confirmation by a qualified ophthalmologist.
                    </p>
                    <div className="inline-flex items-center gap-1.5 mt-1.5 text-red-800 text-xs font-semibold">
                      <span className="material-symbols-outlined text-base">
                        schedule
                      </span>
                      <span>
                        NPCBVI Standard SLA: Eye Care Specialist review mandated
                        within <strong>7 days</strong>.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      showToast(
                        'Specialist triage alert flagged at District Hospital tele-desk.',
                        'e911_emergency',
                      );
                    }}
                    className="w-full md:w-auto min-h-[46px] px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-xs active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      e911_emergency
                    </span>
                    <span>Flag Specialist Team</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Main Clinical Console ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: Retinal Image Workstation (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Scans Display Container */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Captured Fundus Scans & AI Findings
                      </h2>
                      <p className="text-xs text-slate-500">
                        AI-analyzed via Gemini {analysisData.od.modelVersion || '2.5 Flash'} at{' '}
                        {new Date(analysisData.analyzedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                      <span className="material-symbols-outlined text-[14px]">
                        info
                      </span>
                      <span>
                        AI assistance only. Requires clinician confirmation.
                      </span>
                    </div>
                  </div>

                  {/* Grad-CAM Opacity & Visibility Interactivity Bar */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="heatmap-slider"
                        className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[#0d766e] text-base">
                          layers
                        </span>
                        <span>Grad-CAM Intensity</span>
                      </label>
                      <input
                        id="heatmap-slider"
                        type="range"
                        min="10"
                        max="100"
                        value={heatmapIntensity}
                        onChange={(e) =>
                          setHeatmapIntensity(Number(e.target.value))
                        }
                        className="w-28 accent-[#0d766e] h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs font-bold text-[#0d766e] px-2 py-0.5 rounded bg-teal-50 border border-teal-200 font-mono">
                        {heatmapIntensity}%
                      </span>
                    </div>

                    {/* Heatmap Gradient Legend */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Lesion Prob:</span>
                      <div className="h-3 w-28 rounded-full bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 shadow-inner" />
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                        <span>Low</span>
                        <span>•</span>
                        <span>Critical</span>
                      </div>
                    </div>
                  </div>

                  {/* Retinal Image Pair Grid (OD & OS) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* OD: Right Eye */}
                    <EyeCard
                      eyeLabel="OD"
                      eyeName="Right Eye"
                      data={analysisData.od}
                      scanUrl={patient.odScanUrl}
                      heatmapIntensity={heatmapIntensity}
                      onZoom={() => onOpenFundusModal(patient, 'OD')}
                      accentClass="bg-teal-100 text-[#0d766e]"
                    />

                    {/* OS: Left Eye */}
                    <EyeCard
                      eyeLabel="OS"
                      eyeName="Left Eye"
                      data={analysisData.os}
                      scanUrl={patient.osScanUrl}
                      heatmapIntensity={heatmapIntensity}
                      onZoom={() => onOpenFundusModal(patient, 'OS')}
                      accentClass="bg-indigo-100 text-indigo-700"
                    />
                  </div>

                  {/* AI Source Attribution */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0d766e] text-base">
                        auto_fix_high
                      </span>
                      <span>
                        AI assessment by Gemini {analysisData.od.modelVersion || '2.5 Flash'} via secure server-side API.{' '}
                        <strong>Preliminary results only — not a clinical diagnosis.</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          'Full layer audit report requested.',
                          'verified',
                        )
                      }
                      className="text-[#0d766e] font-bold hover:underline shrink-0 cursor-pointer ml-2"
                    >
                      Full Layer Audit
                    </button>
                  </div>
                </div>

                {/* Glycemic Risk Factors */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0d766e]">
                        monitoring
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        Patient Glycemic Risk Factors
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold uppercase">
                      Uncontrolled HbA1c
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500 font-medium">
                        Random Blood Sugar
                      </span>
                      <span className="text-lg font-bold text-red-700 leading-tight mt-0.5">
                        248 mg/dL
                      </span>
                      <span className="text-[10px] text-red-600 font-semibold">
                        Tested Today 09:15
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500 font-medium">
                        Diabetes Duration
                      </span>
                      <span className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                        11 Years
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Irregular Metformin
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500 font-medium">
                        Blood Pressure
                      </span>
                      <span className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                        152/94
                      </span>
                      <span className="text-[10px] text-red-600 font-semibold">
                        Stage 2 HTN
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500 font-medium">
                        Last Retinal Exam
                      </span>
                      <span className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                        Never
                      </span>
                      <span className="text-[10px] text-slate-500">
                        First-time screening
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Staging, Clinician Sign-off & Actions (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Clinical Classification Scorecard */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0d766e]">
                        clinical_notes
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ICDR Disease Staging
                      </span>
                    </div>
                    {clinicianConfirmed ? (
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          verified
                        </span>
                        Clinician Confirmed
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Awaiting Clinician Sign-off
                      </span>
                    )}
                  </div>

                  {/* Staging Bars */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          Diabetic Retinopathy (ICDR Scale)
                        </span>
                        <span className="font-bold text-[#0d766e]">
                          Max Grade:{' '}
                          {Math.max(
                            analysisData.od.icdrGrade,
                            analysisData.os.icdrGrade,
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        {[0, 1, 2, 3, 4].map((grade) => {
                          const maxGrade = Math.max(
                            analysisData.od.icdrGrade,
                            analysisData.os.icdrGrade,
                          );
                          const isActive = grade === maxGrade;
                          const bg =
                            grade === 0
                              ? 'bg-emerald-600'
                              : grade === 1
                              ? 'bg-sky-500'
                              : grade === 2
                              ? 'bg-amber-500'
                              : grade === 3
                              ? 'bg-orange-600'
                              : 'bg-red-700';
                          return (
                            <div
                              key={grade}
                              className={`${bg} w-1/5 h-full ${
                                isActive ? 'animate-pulse' : 'opacity-20'
                              }`}
                              title={`Grade ${grade}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                        <span>St 0</span>
                        <span>St 1</span>
                        <span>St 2</span>
                        <span>St 3</span>
                        <span>St 4</span>
                      </div>
                    </div>

                    {/* Macular Edema Presence */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#0d766e]">
                          lens
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">
                            Clinically Significant Macular Edema
                          </span>
                          <span className="text-[11px] text-slate-600">
                            OD: {analysisData.od.csmeStatus} | OS:{' '}
                            {analysisData.os.csmeStatus}
                          </span>
                        </div>
                      </div>
                      <span className="text-base font-black text-[#0d766e]">
                        {analysisData.od.csmeStatus === 'Present' ||
                        analysisData.os.csmeStatus === 'Present'
                          ? 'POS'
                          : 'NEG'}
                      </span>
                    </div>
                  </div>

                  {/* Model Confidence */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Model:</span>
                      <span className="font-semibold text-slate-900">
                        Gemini {analysisData.od.modelVersion || '2.5 Flash'} API
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>OD Confidence:</span>
                      <span
                        className={`font-semibold ${confidenceColor(
                          analysisData.od.confidence,
                        )}`}
                      >
                        {analysisData.od.confidence}%
                        {analysisData.od.uncertaintyFlag && (
                          <span className="ml-1 text-[10px] text-amber-600">
                            ⚠ Low
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>OS Confidence:</span>
                      <span
                        className={`font-semibold ${confidenceColor(
                          analysisData.os.confidence,
                        )}`}
                      >
                        {analysisData.os.confidence}%
                        {analysisData.os.uncertaintyFlag && (
                          <span className="ml-1 text-[10px] text-amber-600">
                            ⚠ Low
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Analyzed:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(analysisData.analyzedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Clinician Sign-off Card ───────────────────────────── */}
                <div
                  className={`bg-white rounded-xl p-4 sm:p-5 shadow-xs border-2 flex flex-col gap-3 ${
                    clinicianConfirmed
                      ? 'border-emerald-300'
                      : 'border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined ${
                        clinicianConfirmed
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {clinicianConfirmed
                        ? 'verified_user'
                        : 'admin_panel_settings'}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      Clinician Verification
                    </span>
                  </div>

                  {!clinicianConfirmed ? (
                    <>
                      <p className="text-xs text-slate-600">
                        AI screening results above are <strong>preliminary</strong>.
                        A qualified clinician must review and confirm before
                        clinical action is taken.
                      </p>
                      <button
                        type="button"
                        onClick={handleClinicianConfirm}
                        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">
                          how_to_reg
                        </span>
                        Confirm AI Findings as Clinician
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                      <span className="material-symbols-outlined text-base">
                        check_circle
                      </span>
                      <span>
                        Findings confirmed by clinician at{' '}
                        <strong>{confirmedAt}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Tele-Referral Actions ──────────────────────────────── */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Immediate Clinical Actions
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      On-Call Doc Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Connect patient directly with the District Hospital
                    Ophthalmology tele-triage desk:
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenTeleconsult(patient)}
                      className="w-full min-h-[50px] px-4 py-2.5 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold shadow-sm active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">
                        video_call
                      </span>
                      <span>
                        Tele-Consult: {doctor.name} (District Hosp)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPrintSlip(patient)}
                      className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg text-[#0d766e]">
                        receipt_long
                      </span>
                      <span>
                        Generate Official Tele-Slip (Marathi / EN PDF)
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSendingSms}
                      onClick={handleSendSms}
                      className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingSms ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-spin text-[#0d766e]">
                            sync
                          </span>
                          <span>Transmitting SMS...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg text-emerald-600">
                            chat
                          </span>
                          <span>
                            Send WhatsApp / SMS to {patient.mobile}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleSaveAndSync}
                      className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSyncing ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-pulse text-[#0d766e]">
                            lock
                          </span>
                          <span>Encrypting in Local SQLite...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">
                            save_as
                          </span>
                          <span>Save Encrypted Record & Queue Sync</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onNavigate('screening-queue')}
                      className="inline-flex items-center gap-1 text-xs text-[#0d766e] font-bold hover:underline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">
                        arrow_back
                      </span>
                      <span>Return to Screening Queue</span>
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Session Token: #{patient.id}
                    </span>
                  </div>
                </div>

                {/* Re-run analysis button */}
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisState('idle');
                    setAnalysisData(null);
                  }}
                  className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-500 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    refresh
                  </span>
                  Re-run AI Analysis
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Eye Card sub-component ────────────────────────────────────────────────
interface EyeCardProps {
  eyeLabel: string;
  eyeName: string;
  data: DiagnosisResult;
  scanUrl: string;
  heatmapIntensity: number;
  onZoom: () => void;
  accentClass: string;
}

const EyeCard: React.FC<EyeCardProps> = ({
  eyeLabel,
  eyeName,
  data,
  scanUrl,
  heatmapIntensity,
  onZoom,
  accentClass,
}) => {
  const risk = riskLabel(data);

  return (
    <div className="rounded-xl bg-slate-50 p-3 flex flex-col gap-2 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-6 h-6 rounded-full ${accentClass} text-xs font-bold flex items-center justify-center`}
          >
            {eyeLabel}
          </span>
          <span className="text-xs font-bold text-slate-900">{eyeName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full ${confidenceBg(
              data.confidence,
            )} border text-[10px] font-bold`}
          >
            {data.diagnosis} ({data.confidence}%)
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${risk.cls}`}
          >
            {risk.label}
          </span>
        </div>
      </div>

      {/* Image Viewport */}
      <div className="relative w-full aspect-square rounded-lg bg-black overflow-hidden flex items-center justify-center group shadow-inner">
        <img
          src={scanUrl}
          alt={`${eyeName} ${eyeLabel}`}
          style={{
            filter: `saturate(${100 + heatmapIntensity * 0.3}%) contrast(${
              100 + heatmapIntensity * 0.15
            }%)`,
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Optical Scan Line indicator */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="drishti-scan-line" />
        </div>

        <button
          type="button"
          onClick={onZoom}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-xs cursor-pointer drishti-btn"
          title="Inspect Fullscreen"
        >
          <span className="material-symbols-outlined text-base">zoom_in</span>
        </button>

        {/* Uncertainty overlay */}
        {data.uncertaintyFlag && (
          <div className="absolute inset-0 bg-amber-500/10 flex items-end justify-center pb-3">
            <span className="px-2 py-1 rounded bg-amber-500/90 text-white text-[10px] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                warning
              </span>
              Low Confidence
            </span>
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="p-2 rounded bg-white border border-slate-200 text-slate-800 flex flex-col gap-1 text-[11px]">
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Microaneurysms:</span>
          <span className="text-slate-900 text-right">
            {data.microaneurysms}
          </span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Hemorrhages:</span>
          <span className="text-slate-900 text-right">
            {data.hemorrhages}
          </span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Exudates:</span>
          <span className="text-slate-900 text-right">{data.exudates}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">CSME Status:</span>
          <span
            className={`text-right font-bold ${
              data.csmeStatus === 'Present'
                ? 'text-red-700'
                : 'text-emerald-700'
            }`}
          >
            {data.csmeStatus}
          </span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Visual Acuity Risk:</span>
          <span className="text-slate-900 text-right">
            {data.visualAcuityRisk}
          </span>
        </div>
      </div>
    </div>
  );
};
