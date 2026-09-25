import React, { useState, useEffect } from 'react';
import { ScreenId, Patient } from '../../types';

interface RetinalCaptureScreenProps {
  patient: Patient;
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  showToast: (msg: string, icon?: string) => void;
  onMarkOsCaptured?: () => void;
}

export const RetinalCaptureScreen: React.FC<RetinalCaptureScreenProps> = ({
  patient,
  onNavigate,
  onOpenFundusModal,
  showToast,
  onMarkOsCaptured,
}) => {
  const [showEtdrsGrid, setShowEtdrsGrid] = useState(true);
  const [isRedFreeFilter, setIsRedFreeFilter] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [osCaptured, setOsCaptured] = useState(!!patient.osScanUrl);
  const [playingAudio, setPlayingAudio] = useState<'mr' | 'hi' | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Keyboard shortcut: Spacebar captures OS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !osCaptured && !isCapturing) {
        e.preventDefault();
        handleCaptureOs();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [osCaptured, isCapturing]);

  const handleCaptureOs = async () => {
    setIsCapturing(true);
    setShutterFlash(true);

    // Audio beep simulation
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // AudioContext may be restricted by browser policy
    }

    setTimeout(() => {
      setShutterFlash(false);
    }, 200);

    try {
      if (onMarkOsCaptured) await onMarkOsCaptured();
      setOsCaptured(true);
      showToast('OS Fundus captured & persisted to local vault.', 'check_circle');
    } catch (err) {
      showToast('Capture failed to persist. Please retry.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePlayAudio = (lang: 'mr' | 'hi') => {
    if (playingAudio === lang) {
      setPlayingAudio(null);
      return;
    }
    setPlayingAudio(lang);
    showToast(
      lang === 'mr'
        ? 'Playing Marathi verbal coaching: "डोळे उघडे ठेवा, हिरव्या दिव्याकडे सरळ पहा"'
        : 'Playing Hindi verbal coaching: "पलकें न झपकाएं, हरी बत्ती को स्थिर देखें"',
      'record_voice_over'
    );
    setTimeout(() => {
      setPlayingAudio(null);
    }, 4500);
  };

  return (
    <div className="flex flex-col w-full select-none">
      {/* Persistent Offline & Capture Pipeline Status Bar */}
      <div className="w-full bg-slate-100 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0d766e] text-white text-[11px] font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-teal-300 animate-ping"></span>
            Hardware Live
          </span>
          <span className="text-xs text-slate-800 font-semibold">
            Netra-Pro 45° Non-Mydriatic Fundus Scope
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-xs text-slate-600 hidden sm:inline">
            USB-OTG Direct Feed (Optic Grade III)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="material-symbols-outlined text-base text-emerald-600">
              offline_pin
            </span>
            <span className="font-bold text-slate-800">SQLite AES-256 Storage:</span>
            <span>4.2 GB Local Cache</span>
          </div>
          <div className="h-4 w-px bg-slate-300 hidden md:block"></div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600">
            <span className="material-symbols-outlined text-base text-[#0d766e]">
              memory
            </span>
            <span className="font-bold text-slate-800">Edge TFLite:</span>
            <span className="text-emerald-700 font-bold">210ms / Infer Ready</span>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-7xl mx-auto w-full pb-28">
        {/* Top Workflow Bar & Stepper */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-[#0d766e] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">
                  photo_camera
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  Retinal Capture
                </h1>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  रेटिनल इमेज कॅप्चर • नेत्र पटल स्कैन (Bilateral Screening Protocol)
                </p>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => onNavigate('patient-registration')}
                className="flex items-center gap-2 text-left cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  <span className="material-symbols-outlined text-sm">check</span>
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-700 font-bold leading-none">
                    Step 1
                  </span>
                  <span className="text-xs text-slate-800 font-medium whitespace-nowrap">
                    Registration
                  </span>
                </div>
              </button>

              <div className="w-8 h-0.5 bg-emerald-500 rounded-full"></div>

              {/* Step 2 (Active) */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d766e] text-white shadow-xs">
                <span className="w-7 h-7 rounded-full bg-white text-[#0d766e] flex items-center justify-center text-xs font-black shadow-xs">
                  2
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-teal-200 font-bold leading-none">
                    Step 2 (Active)
                  </span>
                  <span className="text-xs text-white font-bold whitespace-nowrap">
                    Retinal Capture
                  </span>
                </div>
              </div>

              <div className="w-8 h-0.5 bg-slate-200 rounded-full"></div>

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => onNavigate('ai-diagnosis')}
                className="flex items-center gap-2 opacity-60 text-left hover:opacity-100 transition-opacity cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold leading-none">
                    Step 3
                  </span>
                  <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                    AI Diagnosis & Triage
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Patient Demographics Strip */}
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-100 text-[#0d766e] flex items-center justify-center font-bold text-base shadow-xs">
                RP
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {patient.name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                    {patient.age} Y / {patient.gender}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-medium font-mono">
                    ABHA: {patient.abhaId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <span className="material-symbols-outlined text-sm text-[#0d766e]">
                      location_on
                    </span>
                    Camp: Vadbare Anganwadi #03
                  </span>
                  <span>•</span>
                  <span className="text-red-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">water_drop</span>
                    Diabetic (8 Yrs)
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-slate-900">RBS: 198 mg/dL</span>
                  <span>•</span>
                  <span className="font-medium text-emerald-700">BP: 132/84 mmHg</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden xl:block">
                <div className="text-[10px] text-slate-500">Operator Session</div>
                <div className="text-xs font-bold text-[#0d766e]">
                  ASHA Sunita Devi (#4102)
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('patient-registration')}
                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-[#0d766e]">
                  medical_information
                </span>
                <span>View Full EHR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dual Retinal Viewfinder Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 drishti-entrance drishti-entrance--visible drishti-stagger-2">
          {/* LEFT COLUMN: RIGHT EYE (OD) [Captured & Validated State] */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between gap-4 relative overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-[#0d766e] flex items-center justify-center font-black text-sm">
                  OD
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Right Eye (OD)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">
                        check_circle
                      </span>
                      Captured & Validated
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Oculus Dexter • 45° Posterior Pole Macular-Centered
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowEtdrsGrid(!showEtdrsGrid)}
                  title="Toggle ETDRS Grid Overlay"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    showEtdrsGrid
                      ? 'bg-[#0d766e] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    grid_4x4
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRedFreeFilter(!isRedFreeFilter)}
                  title="Invert / Red-Free Optical Filter"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isRedFreeFilter
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    contrast
                  </span>
                </button>
              </div>
            </div>

            {/* 1:1 Circular Ophthalmology Retinal Matte Viewport */}
            <div className="relative w-full aspect-square max-w-[460px] mx-auto bg-black rounded-2xl flex items-center justify-center overflow-hidden p-2 shadow-inner group">
              <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black">
                <img
                  alt="High-resolution clinical retinal fundus OD"
                  className={`w-full h-full object-cover scale-[1.03] transition-transform duration-300 ${
                    isRedFreeFilter ? 'filter hue-rotate-90 contrast-125 saturate-50' : ''
                  }`}
                  src={patient.odScanUrl}
                />

                {/* Ophthalmology ETDRS Alignment Reticle / Crosshair Overlay (SVGs) */}
                {showEtdrsGrid && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
                    viewBox="0 0 400 400"
                    fill="none"
                  >
                    {/* Central 45° FOV circular guide */}
                    <circle
                      cx="200"
                      cy="200"
                      r="190"
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    ></circle>
                    {/* Inner Macular Rings */}
                    <circle
                      cx="195"
                      cy="200"
                      r="45"
                      stroke="rgba(13, 118, 110, 0.7)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    ></circle>
                    <circle
                      cx="195"
                      cy="200"
                      r="90"
                      stroke="rgba(13, 118, 110, 0.5)"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    ></circle>
                    {/* Optic Disc Targeting Zone */}
                    <circle
                      cx="280"
                      cy="200"
                      r="38"
                      stroke="rgba(98, 223, 125, 0.85)"
                      strokeWidth="1.8"
                    ></circle>
                    <text
                      x="280"
                      y="150"
                      textAnchor="middle"
                      fill="#7ffc97"
                      fontFamily="Inter"
                      fontSize="10"
                      fontWeight="700"
                    >
                      OPTIC DISC (NASAL)
                    </text>
                    <text
                      x="195"
                      y="142"
                      textAnchor="middle"
                      fill="#a3faef"
                      fontFamily="Inter"
                      fontSize="10"
                      fontWeight="700"
                    >
                      FOVEA CENTRALIS
                    </text>
                    {/* Center Alignment Crosshairs */}
                    <line
                      x1="200"
                      y1="10"
                      x2="200"
                      y2="45"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                    <line
                      x1="200"
                      y1="355"
                      x2="200"
                      y2="390"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                    <line
                      x1="10"
                      y1="200"
                      x2="45"
                      y2="200"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                    <line
                      x1="355"
                      y1="200"
                      x2="390"
                      y2="200"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                  </svg>
                )}

                {/* Live Edge QA Badge Inside Viewport */}
                <div className="absolute top-4 left-4 flex flex-col gap-1 z-10">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-600/90 text-white backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <span className="material-symbols-outlined text-xs">
                      verified
                    </span>
                    QA Grade: Excellent (96%)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 text-teal-200 backdrop-blur-xs text-[10px] font-mono">
                    FOV: 45.2° • Centered
                  </span>
                </div>

                {/* Optical Timestamp Overlay */}
                <div className="absolute bottom-4 right-4 z-10 text-right">
                  <span className="px-2 py-1 rounded bg-black/70 text-teal-200 text-[10px] font-mono backdrop-blur-xs">
                    OD_20241029_090330_RAW.dcm
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry Metadata Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Focus Plane</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    center_focus_strong
                  </span>
                  0.2D Locked
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Corneal Glare</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    brightness_7
                  </span>
                  Zero Glare (0%)
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Pupil Size</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    radio_button_checked
                  </span>
                  4.1 mm (Clear)
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Cache Status</span>
                <span className="font-bold text-[#0d766e] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">save</span>
                  Saved (6.4 MB)
                </span>
              </div>
            </div>

            {/* Action Row for Captured Eye */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  showToast('Re-arming optical sensor for OD retake...', 'refresh')
                }
                className="flex-1 min-h-[44px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Re-take OD Scan</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFundusModal(patient, 'OD')}
                className="flex-1 min-h-[44px] px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[#0d766e] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">zoom_in</span>
                <span>Inspect Quality (100%)</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LEFT EYE (OS) [Live Viewfinder Armed] */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between gap-4 relative overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#0d766e] text-white flex items-center justify-center font-black text-sm">
                  OS
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Left Eye (OS)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                        osCaptured
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          osCaptured ? 'bg-emerald-600' : 'bg-blue-600 animate-ping'
                        }`}
                      ></span>
                      {osCaptured ? 'Captured & Analyzed' : 'Live Viewfinder Armed'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Oculus Sinister • Real-time Pupil Tracking & Alignment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="px-2 py-1 rounded bg-slate-100 text-xs text-[#0d766e] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-600 animate-pulse">
                    videocam
                  </span>
                  <span>60 FPS RAW</span>
                </div>
              </div>
            </div>

            {/* 1:1 Live Camera Viewfinder Simulation with Alignment Ring */}
            <div className="relative w-full aspect-square max-w-[460px] mx-auto bg-black rounded-2xl flex items-center justify-center overflow-hidden p-2 shadow-inner">
              {/* Shutter flash effect */}
              {shutterFlash && (
                <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none"></div>
              )}

              <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black">
                {/* Live Preview Retinal Simulation */}
                <img
                  alt="Simulated real-time retinal fundus image"
                  className={`w-full h-full object-cover scale-[1.02] filter contrast-125 brightness-90 transform -scale-x-100 ${
                    !osCaptured && isCapturing ? 'blur-xs' : ''
                  }`}
                  src={patient.osScanUrl || patient.odScanUrl}
                />

                {/* Real-time optical scan line sweep */}
                {(!osCaptured || isCapturing) && (
                  <div className="drishti-scan-line" />
                )}

                {/* Infrared / Pupil Alignment Crosshair UI (Dynamic SVG HUD) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 400 400"
                >
                  {/* Outer Dynamic Target Rings */}
                  <circle
                    className="animate-spin"
                    cx="200"
                    cy="200"
                    r="185"
                    stroke="#007a33"
                    strokeWidth="2"
                    strokeDasharray="10 5"
                    style={{ animationDuration: '24s' }}
                  ></circle>
                  <circle
                    cx="200"
                    cy="200"
                    r="140"
                    stroke="rgba(13, 118, 110, 0.4)"
                    strokeWidth="1.5"
                  ></circle>

                  {/* Green Patient Fixation Target LED Simulation */}
                  <circle
                    className="animate-pulse"
                    cx="200"
                    cy="200"
                    r="6"
                    fill="#7ffc97"
                  ></circle>
                  <circle
                    cx="200"
                    cy="200"
                    r="16"
                    stroke="#7ffc97"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.6"
                  ></circle>
                  <circle
                    cx="200"
                    cy="200"
                    r="30"
                    stroke="#7ffc97"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    fill="none"
                    opacity="0.4"
                  ></circle>

                  {/* 4-Quadrant Alignment Brackets */}
                  <path
                    d="M 120 150 L 120 120 L 150 120"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M 280 150 L 280 120 L 250 120"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M 120 250 L 120 280 L 150 280"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M 280 250 L 280 280 L 250 280"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>

                  {/* Distance / Working Distance Guide */}
                  <text
                    x="200"
                    y="325"
                    textAnchor="middle"
                    fill="#a3faef"
                    fontFamily="Inter"
                    fontSize="11"
                    fontWeight="700"
                    letterSpacing="1"
                  >
                    WORKING DISTANCE: 22mm (OPTIMAL)
                  </text>
                </svg>

                {/* Live Alignment Warning / Instruction Banner */}
                <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
                  <span className="px-2.5 py-1 rounded-md bg-[#0d766e]/90 text-white backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-teal-300 animate-ping"></span>
                    Alignment: Optimal (Ready)
                  </span>
                  <span className="px-2 py-1 rounded bg-black/75 text-emerald-300 backdrop-blur-xs text-[10px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">adjust</span>
                    LED Fixation: Center
                  </span>
                </div>

                {/* Focus Quality Dial Indicator */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-xs flex items-center gap-2 shadow-md">
                    <span className="material-symbols-outlined text-base text-emerald-400">
                      check_circle
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-300 leading-none">
                        Auto-Focus
                      </span>
                      <span className="text-xs text-emerald-300 font-bold leading-tight">
                        94% Sharpness
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Telemetry Live Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Tracking Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">gps_fixed</span>
                  Pupil Locked
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Pupil Diameter</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">circle</span>
                  3.8 mm (No Mydriasis)
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Illumination</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    wb_iridescent
                  </span>
                  IR 85% • Flash Ready
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Corneal Reflection</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  Polarized (Low)
                </span>
              </div>
            </div>

            {/* Prominent Primary Shutter Button for OS */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isCapturing}
                onClick={handleCaptureOs}
                className={`w-full min-h-[52px] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer active:translate-y-0.5 tracking-wide text-white drishti-btn ${
                  osCaptured
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-[#0d766e] hover:bg-[#005c55]'
                }`}
              >
                {isCapturing ? (
                  <>
                    <span className="material-symbols-outlined text-xl animate-spin">
                      progress_activity
                    </span>
                    <span>CAPTURING & ANALYZING RETINA...</span>
                  </>
                ) : osCaptured ? (
                  <>
                    <span className="material-symbols-outlined text-xl">
                      check_circle
                    </span>
                    <span>OS CAPTURED (GRADE: 97%) — RE-CAPTURE</span>
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-mono uppercase">
                      Spacebar
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-2xl text-teal-200 animate-pulse">
                      radio_button_checked
                    </span>
                    <span>CAPTURE LEFT EYE (OS)</span>
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-mono uppercase">
                      Spacebar
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    showToast('LED Flash duration adjusted to 85% (Non-mydriatic).', 'flash_on')
                  }
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    flashlight_on
                  </span>
                  <span>Flash Intensity (85%)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    showToast('Left Eye skipped: Flagged as monocular trauma in patient record.', 'visibility_off')
                  }
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    visibility_off
                  </span>
                  <span>Skip Left Eye</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Field Voice Guidance Assistant & Hardware Diagnostics Console */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Audio Coach */}
          <div className="xl:col-span-2 bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#006398] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">
                    record_voice_over
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Field Patient Audio Coach (ध्वनी सूचना)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    One-tap vernacular voice instructions played aloud to patient through tablet speaker
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Speaker Ready (80%)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {/* Marathi */}
              <div
                className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  playingAudio === 'mr'
                    ? 'bg-teal-50 border-teal-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio('mr')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs cursor-pointer ${
                      playingAudio === 'mr'
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-[#0d766e] text-white hover:bg-[#005c55]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {playingAudio === 'mr' ? 'volume_up' : 'play_arrow'}
                    </span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Marathi (मराठी मार्गदर्शक)
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      "डोळे उघडे ठेवा, हिरव्या दिव्याकडे सरळ पहा"
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                  0:04
                </span>
              </div>

              {/* Hindi */}
              <div
                className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  playingAudio === 'hi'
                    ? 'bg-teal-50 border-teal-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio('hi')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs cursor-pointer ${
                      playingAudio === 'hi'
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-[#006398] text-white hover:bg-[#004f7a]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {playingAudio === 'hi' ? 'volume_up' : 'play_arrow'}
                    </span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Hindi (हिंदी निर्देश)
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      "पलकें न झपकाएं, हरी बत्ती को स्थिर देखें"
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                  0:05
                </span>
              </div>
            </div>
          </div>

          {/* Funduscope Hardware Telemetry */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0d766e] text-lg">
                  videocam
                </span>
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Device Health
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                CALIBRATED
              </span>
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Objective Lens:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">lens</span>
                  Anti-Fog Heated / Dust Clean
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Battery Pack:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-emerald-600">
                    battery_5_bar
                  </span>
                  84% (~5.5 hrs runtime)
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Ambient Camp Lux:</span>
                <span className="font-bold text-slate-800">320 Lux (Optimal Shade)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <footer className="fixed bottom-0 left-0 lg:left-72 right-0 z-30 bg-white/95 backdrop-blur-md px-4 lg:px-6 py-3 border-t border-slate-200 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('patient-registration')}
            className="w-full sm:w-auto min-h-[46px] px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Registration (Step 1)</span>
          </button>

          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              {osCaptured ? '2/2' : '1/2'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-900 font-bold">
                {osCaptured
                  ? 'Bilateral Capture Complete (OD & OS)'
                  : '1 Eye Complete (OD), 1 Ready (OS)'}
              </span>
              <span className="text-[11px] text-slate-500">
                Bilateral retinal capture ensures 99.1% AI DR detection sensitivity
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!osCaptured) {
                showToast('Proceeding with OD scan. OS marked as captured.', 'check');
                setOsCaptured(true);
              }
              onNavigate('ai-diagnosis');
            }}
            className="w-full sm:w-auto min-h-[50px] px-6 py-2.5 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:translate-y-px transition-all cursor-pointer"
          >
            <span>Proceed to AI Diagnosis (Step 3)</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
