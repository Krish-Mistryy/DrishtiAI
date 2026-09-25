import React, { useState } from 'react';
import { Patient, CampStats, ScreenId } from '../../types';
import { useCountUp, useAnimatedProgress } from '../../hooks/useAnimations';

interface DashboardScreenProps {
  stats: CampStats;
  patients: Patient[];
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  onOpenTeleconsult: (patient: Patient) => void;
  onOpenPrintSlip: (patient: Patient) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  stats,
  patients,
  onNavigate,
  onOpenFundusModal,
  onOpenTeleconsult,
  onOpenPrintSlip,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'high' | 'draft' | 'normal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const animatedScreened = useCountUp(stats.screenedToday, true);
  const animatedHighRisk = useCountUp(3, true);
  const animatedNormal = useCountUp(11, true);
  const animatedPendingSync = useCountUp(stats.pendingSyncCount, true);
  const animatedProgression = useAnimatedProgress(70, true);

  // Ramesh Patil as primary urgent case
  const urgentPatient = patients.find((p) => p.riskLevel === 'Critical') || patients[0];

  // Filtering
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.abhaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.village.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCategory === 'high') {
      return patient.riskLevel === 'High Risk' || patient.riskLevel === 'Critical';
    }
    if (filterCategory === 'draft') {
      return patient.riskLevel === 'Incomplete';
    }
    if (filterCategory === 'normal') {
      return patient.riskLevel === 'Normal' || patient.riskLevel === 'Mild';
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1720px] mx-auto w-full select-none">
      {/* 1. URGENT TELE-TRIAGE CARD */}
      <section
        aria-labelledby="urgent-triage-heading"
        className="relative rounded-xl bg-red-50/95 border border-red-200 px-4 py-3.5 lg:px-5 lg:py-3.5 shadow-sm drishti-entrance drishti-entrance--visible drishti-stagger-1"
      >
        {/* Header Urgency Pill & ID */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-red-100">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              URGENT TELE-TRIAGE
            </span>
            <span className="text-xs text-red-800 font-medium">
              Flagged during AI edge inference
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-red-200 text-xs font-semibold">
            ID: {urgentPatient.id}
          </span>
        </div>

        {/* Dense Clinical Flex Layout */}
        <div className="pt-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 lg:gap-4">
          {/* Left Patient Block */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-xl">
                crisis_alert
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2
                  className="text-base font-bold text-slate-900 tracking-tight leading-snug"
                  id="urgent-triage-heading"
                >
                  {urgentPatient.name}
                </h2>
                <span className="text-xs text-slate-600 font-medium">
                  ({urgentPatient.age} Y / {urgentPatient.gender} • ABHA: {urgentPatient.abhaId})
                </span>
              </div>
              <div className="text-sm font-bold text-red-700 leading-snug">
                {urgentPatient.aiDiagnosis}
              </div>
              <div className="text-xs text-slate-700 flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="font-bold text-red-700">
                  AI Confidence: {urgentPatient.aiConfidence}
                </span>
                <span className="text-slate-400">•</span>
                <span>
                  Referral:{' '}
                  <strong className="text-slate-900 font-semibold">
                    District Hospital Nandurbar
                  </strong>{' '}
                  (Immediate review queued)
                </span>
              </div>
            </div>
          </div>

          {/* Center & Right Block: Scans + Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            {/* Center Visual Block: Two Fundus Thumbnails */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenFundusModal(urgentPatient, 'OD')}
                className="w-12 h-12 rounded-lg overflow-hidden border-2 border-red-400 shadow-xs relative shrink-0 hover:scale-105 transition-transform cursor-pointer"
                title="View OD Grad-CAM"
              >
                <img
                  alt="OD Grad-CAM"
                  className="w-full h-full object-cover"
                  src={urgentPatient.gradCamUrl || urgentPatient.odScanUrl}
                />
                <span className="absolute bottom-0 inset-x-0 bg-red-600 text-[8px] text-white font-bold text-center leading-3 py-0.5">
                  OD Grad-CAM
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenFundusModal(urgentPatient, 'OS')}
                className="w-12 h-12 rounded-lg overflow-hidden border border-slate-300 shadow-xs relative shrink-0 hover:scale-105 transition-transform cursor-pointer"
                title="View OS Raw"
              >
                <img
                  alt="OS Raw"
                  className="w-full h-full object-cover"
                  src={urgentPatient.osScanUrl}
                />
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-white font-bold text-center leading-3 py-0.5">
                  OS Raw
                </span>
              </button>
            </div>

            {/* Right Action Block: 3 Compact CTAs */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenFundusModal(urgentPatient, 'OD')}
                className="min-h-[44px] px-3 rounded-lg bg-red-700 text-white hover:bg-red-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">4k</span>
                <span>Review Grad-CAM</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenTeleconsult(urgentPatient)}
                className="min-h-[44px] px-3 rounded-lg bg-[#0d766e] text-white hover:bg-[#005c55] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">
                  video_call
                </span>
                <span>Initiate Tele-Consult</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenPrintSlip(urgentPatient)}
                className="min-h-[44px] px-3 rounded-lg bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">
                  receipt_long
                </span>
                <span>Print Tele-Slip</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CAMP OVERVIEW & PRIMARY SCREENING LAUNCHPAD */}
      <section
        aria-labelledby="screening-launchpad-heading"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-2"
      >
        {/* Left / Main Card: Community Outreach Launchpad (8 cols) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-5 lg:p-6 flex flex-col justify-between gap-4 shadow-sm border border-outline-variant/30">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-xs font-bold uppercase tracking-wider">
                COMMUNITY HEALTH OUTREACH CAMP
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Outdoor High-Glare Mode Active (7.4:1 contrast)</span>
              </div>
            </div>
            <h1
              className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight"
              id="screening-launchpad-heading"
            >
              Namaste, Sunita Devi!
              <span className="block text-lg lg:text-xl text-on-surface-variant font-normal mt-0.5">
                <span lang="hi">नमस्ते सुनीता जी</span> /{' '}
                <span lang="mr">नवीन तपासणी सुरू करा</span>
              </span>
            </h1>
            <p className="text-sm text-on-surface-variant">
              Vadbare Village Anganwadi #02 • Session #04 • Supervising Medical Officer: Dr. Rajesh Rathod (PHC)
            </p>
          </div>

          {/* Primary Dominant CTA: + Start New Screening */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => onNavigate('patient-registration')}
              className="group w-full min-h-[54px] bg-[#0d766e] hover:bg-[#005c55] text-white px-5 py-3 rounded-xl shadow-md transition-all flex items-center justify-between text-left cursor-pointer drishti-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl text-white group-hover:scale-110 transition-transform">
                    add_circle
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base lg:text-lg font-bold tracking-tight text-white leading-tight">
                    + Start New Screening
                  </span>
                  <span className="text-[11px] text-teal-100 tracking-wider uppercase font-semibold">
                    STEP 1 OF 3: REGISTRATION → CAPTURE → ON-DEVICE AI
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2.5">
                <span className="text-xs px-2.5 py-1 rounded bg-white/20 font-semibold text-white">
                  नया परीक्षण शुरू करें
                </span>
                <span className="material-symbols-outlined text-xl text-white group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </button>
          </div>

          {/* Quick Tactile Field Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                showToast('Activating camera scanner for ABHA QR PVC card...', 'qr_code_scanner');
                onNavigate('patient-registration');
              }}
              className="min-h-[44px] px-3 rounded-lg bg-surface-container-low border border-slate-200 text-on-surface hover:bg-surface-container text-xs flex items-center justify-center gap-1.5 transition-all font-semibold cursor-pointer drishti-btn"
            >
              <span className="material-symbols-outlined text-[#006398] text-base">
                qr_code_scanner
              </span>
              <span>Fast ABHA / Aadhaar QR</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('sync-offline-data')}
              className="min-h-[44px] px-3 rounded-lg bg-surface-container-low border border-slate-200 text-on-surface hover:bg-surface-container text-xs flex items-center justify-center gap-1.5 transition-all font-semibold cursor-pointer drishti-btn"
            >
              <span className="material-symbols-outlined text-[#006398] text-base">
                cloud_sync
              </span>
              <span>Offline Queue ({stats.pendingSyncCount} Scans)</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('retinal-capture')}
              className="min-h-[44px] px-3 rounded-lg bg-surface-container-low border border-slate-200 text-on-surface hover:bg-surface-container text-xs flex items-center justify-center gap-1.5 transition-all font-semibold cursor-pointer drishti-btn"
            >
              <span className="material-symbols-outlined text-[#0d766e] text-base">
                photo_camera
              </span>
              <span>Fundus Re-Scan OU/OS</span>
            </button>
          </div>
        </div>

        {/* Right Card: Camp Target Progression */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 lg:p-6 flex flex-col justify-between gap-4 shadow-sm border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-600 font-bold">
              CAMP TARGET PROGRESSION
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
              Session #04
            </span>
          </div>

          {/* Center: Circular gauge + Clean label block */}
          <div className="flex items-center gap-4 my-auto">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                ></path>
                <path
                  className="text-[#0d766e] drishti-circle-progress"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${animatedProgression}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                ></path>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-slate-900 leading-none">
                  {Math.round(animatedProgression)}%
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900">
                  {animatedScreened} / {stats.targetTotal}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Scanned
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                {stats.targetTotal - stats.screenedToday} residents remaining in register
              </p>
            </div>
          </div>

          {/* Bottom: SLA schedule */}
          <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1.5 border border-slate-200">
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full drishti-progress-fill"
                style={{ width: `${animatedProgression}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>
                Target SLA:{' '}
                <strong className="text-emerald-700 font-bold">
                  {stats.targetSlaTime}
                </strong>
              </span>
              <span className="text-slate-500">Est. camp closure in 2h 15m</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KPI CARDS (4 cards) */}
      <section
        aria-label="Field Camp Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-3"
      >
        {/* Screenings Today */}
        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Screenings Today
            </span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-[#0d766e] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">
                person_search
              </span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-slate-900 tracking-tight leading-none">
              {animatedScreened}
            </span>
            <span className="text-[15px] font-semibold text-slate-500">
              / {stats.targetTotal}
            </span>
          </div>
          <div className="text-xs font-medium text-emerald-700 truncate mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">
              trending_up
            </span>
            <span>4 scanned in afternoon batch</span>
          </div>
        </div>

        {/* High-Risk Referrals */}
        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              High-Risk Referrals
            </span>
            <span className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">
                warning
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-red-700 tracking-tight leading-none">
              {animatedHighRisk.toString().padStart(2, '0')}
            </span>
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider">
              ACTIONABLE
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-1">
            Tele-slips pre-stamped for DH
          </div>
        </div>

        {/* Normal / Mild */}
        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Normal / Mild
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">
                verified
              </span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-emerald-700 tracking-tight leading-none">
              {animatedNormal}
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-1">
            9 Normal • 2 Mild (1-Yr follow-up)
          </div>
        </div>

        {/* Local Offline DB */}
        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Local Offline DB
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">
                database
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-blue-700 tracking-tight leading-none">
              {animatedPendingSync.toString().padStart(2, '0')}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
              Awaiting 4G
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-1">
            SQLite AES-256 • {stats.storageFreeGb} GB space free
          </div>
        </div>
      </section>

      {/* 4. MASTER WORKSPACE: 8 COLS TABLE + 4 COLS SIDEBAR WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start drishti-entrance drishti-entrance--visible drishti-stagger-4">
        {/* LEFT: Screening Register (8 cols) */}
        <section
          aria-labelledby="screening-register-heading"
          className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col"
        >
          {/* Table Header and Action Bar */}
          <div className="p-4 flex flex-col gap-3 bg-surface-container-lowest border-b border-outline-variant/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg font-bold text-on-surface"
                  id="screening-register-heading"
                >
                  Today's Screening Register
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold">
                  {stats.screenedToday} Assessed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      'Exporting local CSV register for PHC Medical Officer...',
                      'file_download'
                    )
                  }
                  className="min-h-[44px] px-3 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-surface-container text-on-surface text-xs flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
                >
                  <span className="material-symbols-outlined text-sm">
                    download
                  </span>
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  aria-label="Refresh Queue"
                  onClick={() =>
                    showToast(
                      'Refreshing local SQLite patient records...',
                      'sync'
                    )
                  }
                  className="w-11 h-11 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-surface-container text-on-surface flex items-center justify-center transition-all cursor-pointer drishti-btn"
                >
                  <span className="material-symbols-outlined text-base">
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {/* Search Input & Filter Tabs */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ABHA, phone..."
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-on-surface placeholder:text-slate-400 text-xs focus:outline-none focus:bg-white focus:border-[#0d766e] transition-all"
                />
              </div>

              {/* Filter chips */}
              <div className="flex items-center overflow-x-auto p-1 bg-slate-100 rounded-lg gap-1 shrink-0 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    filterCategory === 'all'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({patients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('high')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    filterCategory === 'high'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  High Risk (3)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('draft')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    filterCategory === 'draft'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending AI (2)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('normal')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    filterCategory === 'normal'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Normal / Mild (9)
                </button>
              </div>
            </div>
          </div>

          {/* 4-Column Accessible Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left" id="screeningTable">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    Patient & Fundus
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    Diagnostic AI Result
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    Risk Triage
                  </th>
                  <th scope="col" className="py-3 px-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-on-surface text-xs">
                {filteredPatients.slice(0, 4).map((p, pIdx) => {
                  const isUrgent = p.riskLevel === 'Critical';
                  return (
                    <tr
                      key={p.id}
                      style={{ animationDelay: `${pIdx * 50}ms` }}
                      className={`patient-row drishti-table-row drishti-row-enter transition-colors ${
                        isUrgent
                          ? 'bg-red-50/25 hover:bg-red-50/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenFundusModal(p, 'OD')}
                            className={`relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-xs cursor-pointer ${
                              isUrgent ? 'border-2 border-red-400' : 'border border-slate-200'
                            }`}
                            title="Inspect Fundus"
                          >
                            <img
                              alt={p.name}
                              className="w-full h-full object-cover"
                              src={isUrgent && p.gradCamUrl ? p.gradCamUrl : p.odScanUrl}
                            />
                            <span
                              className={`absolute bottom-0 inset-x-0 text-white text-[8px] text-center leading-3 py-0.5 font-bold ${
                                isUrgent ? 'bg-red-600' : 'bg-slate-900/80'
                              }`}
                            >
                              {isUrgent ? 'Grad-CAM' : 'OD 45°'}
                            </span>
                          </button>

                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-sm font-bold flex items-center gap-1.5 ${
                                isUrgent ? 'text-red-700' : 'text-slate-900'
                              }`}
                            >
                              <span>{p.name}</span>
                              {isUrgent && (
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                              )}
                            </span>
                            <span className="text-xs text-slate-500">
                              {p.age} Y • {p.gender}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              ABHA: {p.abhaId}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span
                            className={`text-xs font-semibold ${
                              isUrgent ? 'text-red-700 font-bold' : 'text-slate-900'
                            }`}
                          >
                            {p.aiDiagnosis}
                          </span>
                          <span
                            className={`text-[11px] font-semibold mt-0.5 ${
                              isUrgent
                                ? 'text-red-700 font-bold'
                                : p.riskLevel === 'Normal'
                                ? 'text-emerald-700'
                                : 'text-[#0d766e]'
                            }`}
                          >
                            AI Conf: {p.aiConfidence}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider animate-pulse shadow-xs">
                            <span className="material-symbols-outlined text-xs">
                              emergency
                            </span>
                            Urgent
                          </span>
                        ) : p.riskLevel === 'High Risk' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-xs">
                              warning
                            </span>
                            High Risk
                          </span>
                        ) : p.riskLevel === 'Mild' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-xs">
                              schedule
                            </span>
                            Mild
                          </span>
                        ) : p.riskLevel === 'Incomplete' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-xs">
                              hourglass_top
                            </span>
                            Pending AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-xs">
                              check_circle
                            </span>
                            Normal
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isUrgent ? (
                          <button
                            type="button"
                            onClick={() => onNavigate('retinal-capture')}
                            className="min-h-[44px] px-3.5 rounded-lg bg-[#0d766e] text-white hover:bg-[#005c55] text-xs inline-flex items-center gap-1 font-semibold transition-all shadow-xs cursor-pointer drishti-btn"
                          >
                            <span className="material-symbols-outlined text-sm">
                              camera_alt
                            </span>
                            <span>Resume Scan OS</span>
                          </button>
                        ) : p.riskLevel === 'High Risk' ? (
                          <button
                            type="button"
                            onClick={() => onOpenPrintSlip(p)}
                            className="min-h-[44px] px-3.5 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs inline-flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
                          >
                            <span className="material-symbols-outlined text-sm">
                              print
                            </span>
                            <span>Print Slip</span>
                          </button>
                        ) : p.riskLevel === 'Normal' ? (
                          <button
                            type="button"
                            onClick={() =>
                              showToast(
                                `Issued 1-Year Routine Eye Health Certificate (${p.name})`,
                                'verified'
                              )
                            }
                            className="min-h-[44px] px-3.5 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-slate-100 text-emerald-700 text-xs inline-flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
                          >
                            <span className="material-symbols-outlined text-sm">
                              verified_user
                            </span>
                            <span>Issue Certificate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate('retinal-capture')}
                            className="min-h-[44px] px-3.5 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-slate-100 text-[#0d766e] text-xs inline-flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
                          >
                            <span className="material-symbols-outlined text-sm">
                              photo_camera
                            </span>
                            <span>Capture OS</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">
                Showing 4 of {patients.length} patients
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-800 font-bold">Camp Batch 01</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="min-h-[40px] px-3 rounded-lg bg-white border border-slate-200 text-slate-400 font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed drishti-btn"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-800">
                Page {currentPage} / 3
              </span>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.min(3, p + 1));
                  showToast('Loading next page of local SQLite records...', 'navigate_next');
                }}
                className="min-h-[40px] px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-all cursor-pointer drishti-btn"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: 4 STANDARDIZED TELEMETRY & HARDWARE WIDGETS */}
        <aside
          aria-label="Clinical Telemetry and Hardware"
          className="lg:col-span-4 flex flex-col gap-4"
        >
          {/* 1. AI SCREENING ENGINE */}
          <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2.5 shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0d766e] text-base">
                  psychology
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  AI SCREENING ENGINE
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Active
              </span>
            </div>
            <div className="text-xs text-slate-700 font-semibold">
              Model: <span className="text-slate-900 font-bold">Edge AI v2.4 (RetiNet-Mobile)</span>
            </div>
            {/* 3 Telemetry boxes */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Inference
                </span>
                <span className="text-xs font-extrabold text-slate-900 mt-0.5">
                  210 ms
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Confidence
                </span>
                <span className="text-xs font-extrabold text-emerald-700 mt-0.5">
                  98.2%
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Processing
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5">
                  On-device
                </span>
              </div>
            </div>
          </div>

          {/* 2. CAMP DR PREVALENCE */}
          <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2.5 shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                CAMP DR PREVALENCE
              </span>
              <span className="text-xs text-slate-700 font-bold">
                {stats.screenedToday} Assessed
              </span>
            </div>
            {/* Horizontal Distribution Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="h-full bg-emerald-600 w-[64.3%]"
                title="Normal / Healthy: 9"
              ></div>
              <div
                className="h-full bg-amber-500 w-[14.3%]"
                title="Mild DR: 2"
              ></div>
              <div
                className="h-full bg-red-600 w-[21.4%]"
                title="Severe DR: 3"
              ></div>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Normal / Healthy
                </span>
                <span className="font-bold text-slate-900">9 (64.3%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Mild NPDR
                </span>
                <span className="font-bold text-slate-900">2 (14.3%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  Severe DR / DME
                </span>
                <span className="font-bold text-red-700">3 (21.4%)</span>
              </div>
            </div>
          </div>

          {/* 3. FUNDUSCOPE STATUS */}
          <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2.5 shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                FUNDUSCOPE STATUS
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                <span className="material-symbols-outlined text-xs">
                  check_circle
                </span>
                Calibrated
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Camera:</span>
                <span className="font-bold text-emerald-700">Connected</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Lens:</span>
                <span className="font-bold text-slate-800">Clean</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Illumination:</span>
                <span className="font-bold text-slate-800">100%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Battery:</span>
                <span className="font-bold text-emerald-700">{stats.batteryPct}%</span>
              </div>
            </div>
          </div>

          {/* 4. PENDING CLOUD SYNC */}
          <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2.5 shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                PENDING CLOUD SYNC
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                {stats.pendingSyncCount} Records
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">• Kamala Bai Shinde</span>
                <span className="text-slate-400 text-[10px]">Fundus OD</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">• Ramesh Patil</span>
                <span className="text-red-700 text-[10px] font-bold">
                  Urgent Queue
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">• Anil Padvi</span>
                <span className="text-slate-400 text-[10px]">Optic Disc</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sync-offline-data')}
              className="min-h-[44px] w-full rounded-lg bg-[#0d766e] text-white hover:bg-[#005c55] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer drishti-btn"
            >
              <span className="material-symbols-outlined text-base">
                cloud_upload
              </span>
              <span>Sync All {stats.pendingSyncCount} Records</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center leading-tight">
              Data safely stored locally until connection returns.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
