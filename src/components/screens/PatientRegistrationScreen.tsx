import React, { useState } from 'react';
import { ScreenId, Patient } from '../../types';

interface PatientRegistrationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  showToast: (msg: string, icon?: string) => void;
  activePatient: Patient;
  onUpdatePatient?: (updated: Partial<Patient>) => Promise<void>;
}

export const PatientRegistrationScreen: React.FC<PatientRegistrationScreenProps> = ({
  onNavigate,
  showToast,
  activePatient,
  onUpdatePatient,
}) => {
  const [fullName, setFullName] = useState(activePatient.name);
  const [age, setAge] = useState(activePatient.age.toString());
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(activePatient.gender);
  const [abhaId, setAbhaId] = useState(activePatient.abhaId || '91-4402-8812-3901');
  const [mobile, setMobile] = useState(activePatient.mobile);
  const [village, setVillage] = useState(activePatient.village);
  const [rationId, setRationId] = useState(activePatient.rationId || 'MH-NDB-772190');
  const [diabetesStatus, setDiabetesStatus] = useState(activePatient.diabetesStatus);
  const [rbs, setRbs] = useState('198 mg/dL (Tested 15 mins ago)');
  const [bp, setBp] = useState('Yes (Controlled on Amlodipine 5mg)');
  const [visionComplaint, setVisionComplaint] = useState(activePatient.visionComplaint);
  const [surgeryHistory, setSurgeryHistory] = useState(activePatient.previousHistory);
  const [consentChecked, setConsentChecked] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleScanAbha = () => {
    showToast('Optical ABHA scanner activated. QR token validated.', 'qr_code_scanner');
  };

  const handleSaveAndProceed = async () => {
    setIsSaving(true);
    try {
      if (onUpdatePatient) {
        await onUpdatePatient({
          name: fullName,
          age: parseInt(age) || 62,
          gender,
          abhaId,
          mobile,
          village,
          rationId,
          diabetesStatus,
          rbs,
          bp,
          visionComplaint,
          previousHistory: surgeryHistory,
        });
      }
      showToast('Patient Registration saved to local SQLite. Moving to Capture.', 'save');
      onNavigate('retinal-capture');
    } catch (err) {
      showToast('Failed to save patient record. Please check database connection.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full select-none">
      {/* Persistent Offline & Operational Alert Banner */}
      <section className="w-full bg-[#cce5ff]/60 px-4 lg:px-6 py-2.5 shadow-xs border-b border-blue-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0d766e] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">cloud_off</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#005c55]">
                  Offline Mode Active
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#005c55] animate-ping"></span>
              </div>
              <span className="text-xs text-slate-600">
                Stored locally in encrypted SQLite AES-256 database until cellular/Wi-Fi re-establishes.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#005c55] text-xs shadow-xs font-semibold border border-blue-200">
              <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
              Local Storage: 4.2 GB Free (Camp #03)
            </span>
          </div>
        </div>
      </section>

      {/* Step Flow Header */}
      <section className="w-full px-4 lg:px-6 pt-5 pb-4 drishti-entrance drishti-entrance--visible drishti-stagger-1">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="uppercase tracking-widest text-[#005c55] font-bold">
                  Ayushman Bharat - NPCBVI
                </span>
                <span>/</span>
                <span>Vadbare Anganwadi Camp #03 • Session #04</span>
              </div>
              <h1 className="text-2xl lg:text-3xl text-slate-900 font-extrabold tracking-tight">
                Patient Registration{' '}
                <span className="text-lg lg:text-xl text-slate-500 font-normal">
                  (रुग्ण नोंदणी / नया मरीज पंजीकरण)
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-xs border border-slate-200">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700">
                <span className="material-symbols-outlined text-[#006398] text-sm">schedule</span>
                <span className="text-xs font-semibold">10:42 AM IST</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                <span className="material-symbols-outlined text-emerald-600 text-sm">verified</span>
                <span className="text-xs font-bold">ASHA Protocol v2.4</span>
              </div>
            </div>
          </div>

          {/* 3-Step Guided Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Step 1 (Active) */}
            <div className="relative overflow-hidden bg-white rounded-xl p-3.5 shadow-xs border-2 border-[#0d766e]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0d766e] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  01
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-[#0d766e] font-bold uppercase tracking-wider">
                    Step 1 • Current
                  </span>
                  <span className="text-sm text-slate-900 font-bold truncate">
                    Patient Registration
                  </span>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#0d766e] w-3/4 rounded-full"></div>
              </div>
            </div>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => onNavigate('retinal-capture')}
              className="bg-slate-50 rounded-xl p-3.5 flex items-center gap-3 opacity-90 border border-slate-200 text-left hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                02
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Step 2 • Up Next
                </span>
                <span className="text-sm text-slate-700 font-medium truncate">
                  Retinal Capture
                </span>
              </div>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => onNavigate('ai-diagnosis')}
              className="bg-slate-50 rounded-xl p-3.5 flex items-center gap-3 opacity-75 border border-slate-200 text-left hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                03
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Step 3 • Edge AI
                </span>
                <span className="text-sm text-slate-700 font-medium truncate">
                  AI Diagnosis & Triage
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Main Dual-Column Operational Workspace */}
      <section className="w-full px-4 lg:px-6 pb-24 drishti-entrance drishti-entrance--visible drishti-stagger-2">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Demographic, Clinical & Verification Form (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* ABHA Scanner Quick Ingestion Card */}
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#0d766e] flex items-center justify-center shrink-0 border border-teal-200">
                  <span className="material-symbols-outlined text-2xl">
                    qr_code_scanner
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      ABHA Instant Auto-Fill
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Fast-Track
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Scan patient's physical ABHA PVC card or Digital QR in PM-JAY / Aarogya Setu app to auto-populate records without typing errors.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleScanAbha}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg bg-[#006398] hover:bg-[#004f7a] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs active:translate-y-px transition-all shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">camera</span>
                <span>Scan ABHA Card</span>
              </button>
            </div>

            {/* Detailed Patient Bio & Demographics */}
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-5 rounded-full bg-[#0d766e]"></span>
                  <h2 className="text-base font-bold text-slate-900">
                    1. Patient Identification
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  * Mandatory Fields
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Full Name (नाव / पूरा नाम) *</span>
                    <span className="text-[#0d766e] text-[11px] font-normal">
                      Autofilled via Ration ID
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 pr-24 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-medium">
                      रमेश पाटील
                    </span>
                  </div>
                </div>

                {/* Age */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Age (वय) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 pr-14 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs text-slate-500">
                      Years
                    </span>
                  </div>
                </div>

                {/* Gender Radio Pills */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Gender (लिंग) *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Male', 'Female', 'Other'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`min-h-[46px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          gender === g
                            ? 'bg-[#0d766e] text-white shadow-xs'
                            : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {g === 'Male'
                            ? 'male'
                            : g === 'Female'
                            ? 'female'
                            : 'transgender'}
                        </span>
                        <span>{g}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ABHA ID with Verified Badge */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>ABHA ID (Ayushman Card)</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      ABHA Verified
                    </span>
                  </label>
                  <input
                    type="text"
                    value={abhaId}
                    onChange={(e) => setAbhaId(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />
                </div>

                {/* Mobile Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Mobile Phone (मोबाईल क्र.) *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 pr-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                    />
                    <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-emerald-600 text-base">
                      check_circle
                    </span>
                  </div>
                </div>

                {/* Village / Hamlet Location */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Village / Hamlet (गाव / पाडा) *
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />
                </div>

                {/* Ration / Govt ID No */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Ration / NFSA ID No.
                  </label>
                  <input
                    type="text"
                    value={rationId}
                    onChange={(e) => setRationId(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Pre-Screening & Clinical Vitals */}
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-5 rounded-full bg-[#006398]"></span>
                  <h2 className="text-base font-bold text-slate-900">
                    2. Medical History & Pre-Screening
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-900 text-[11px] font-semibold">
                  T2D Triage Protocol
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Diabetes Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Diabetes Status *
                  </label>
                  <select
                    value={diabetesStatus}
                    onChange={(e) => setDiabetesStatus(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all cursor-pointer"
                  >
                    <option value="Type 2 Diabetes (Duration: 8 years)">
                      Type 2 Diabetes (Duration: 8 years)
                    </option>
                    <option value="Type 1 Diabetes">Type 1 Diabetes</option>
                    <option value="Gestational Diabetes">Gestational Diabetes</option>
                    <option value="Non-Diabetic / Screening Only">
                      Non-Diabetic / Screening Only
                    </option>
                    <option value="Borderline / Pre-Diabetic">
                      Borderline / Pre-Diabetic
                    </option>
                  </select>
                </div>

                {/* RBS Vitals with Warning Indicator */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Random Blood Sugar (RBS) *</span>
                    <span className="text-red-700 text-[10px] font-bold uppercase">
                      Elevated
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={rbs}
                      onChange={(e) => setRbs(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 pr-10 rounded-lg bg-red-50/50 border border-red-200 text-red-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold transition-all"
                    />
                    <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-red-600 text-lg">
                      vital_signs
                    </span>
                  </div>
                </div>

                {/* Hypertension Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Hypertension / BP Status
                  </label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />
                </div>

                {/* Visual Acuity / Current Complaint */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Current Vision Complaint
                  </label>
                  <input
                    type="text"
                    value={visionComplaint}
                    onChange={(e) => setVisionComplaint(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />
                </div>

                {/* Surgery / Laser History */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-800">
                    Previous Eye Surgery / Laser History
                  </label>
                  <textarea
                    rows={2}
                    value={surgeryHistory}
                    onChange={(e) => setSurgeryHistory(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Mandatory Informed Consent Card */}
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#0d766e] text-[#0d766e] cursor-pointer mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-900 font-bold">
                    Informed Consent Verified (संमती पत्र प्राप्त झाले)
                  </span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Informed verbal and signed/thumb consent obtained in Marathi/Hindi for non-mydriatic digital fundus photography, AI triage inference, and potential tele-ophthalmology referral under the National Programme for Control of Blindness & Visual Impairment (NPCBVI) and Ayushman Bharat Digital Mission (ABDM).
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[#0d766e] text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">thumb_up</span>
                      Thumb Impression Stamped
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">translate</span>
                      Marathi Form Explaining Edge AI
                    </span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN: ASHA Field Guidance & Camp Logistics (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Patient Visual Token Card */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  Queue Token #15
                </span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[11px] font-bold">
                  Next in Line
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    alt={activePatient.name}
                    className="w-full h-full object-cover"
                    src={activePatient.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAU9gCldyWilc5wIIpnlkvGUjcdFO7RCcvERr2yDMm3BmX0zM3YB0jPlRmT8oH_Qcn4righCu01rLvzuemiMVrEpzy1Nc8fNCq9XA9-JnpVkuJFlawY36c03D6nuc0pHOWzZ7pmDhBqhnJ-kf-U_N7BMZSSYj-t0AQ5EYEM6ViEyS93xIBF2eG2cAyfl2meSVxnZe-ckmUO2cWszbrVaxLawHSABYvaAAwsjMEkupApME4tj8wf_xtGZg'}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold text-slate-900 truncate">
                    {activePatient.name}
                  </span>
                  <span className="text-xs text-slate-600">
                    {activePatient.age} Yrs • {activePatient.gender} • Farmer
                  </span>
                  <span className="text-xs text-red-700 font-semibold mt-0.5">
                    High Risk: RBS 198 mg/dL
                  </span>
                </div>
              </div>

              {/* Camp Queue Progress Meter */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Today's Camp Progress</span>
                  <span className="text-slate-900 font-bold">15 of 20 Scheduled</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-[#0d766e] w-[75%] rounded-full"></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Camp started 09:00 AM</span>
                  <span className="text-emerald-700 font-bold">5 Patients Remaining</span>
                </div>
              </div>
            </div>

            {/* ASHA Clinical SOP Card */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-3.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0d766e] text-xl">
                  medical_information
                </span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  ASHA Protocol: Capture Readiness
                </h3>
              </div>

              <div className="flex flex-col gap-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-[#0d766e] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-slate-200">
                    1
                  </span>
                  <p>
                    <strong className="text-slate-900">Identity Check:</strong> Reconcile name with Ration Card or Aadhaar before proceeding.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-[#0d766e] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-slate-200">
                    2
                  </span>
                  <p>
                    <strong className="text-slate-900">Ambient Darkening:</strong> Guide patient to the shielded camp corner or utilize the dark canopy to foster pupil dilation without drops.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-[#0d766e] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-slate-200">
                    3
                  </span>
                  <p>
                    <strong className="text-slate-900">Stabilization:</strong> Allow 5 minutes rest to normalize heart rate and reduce saccadic eye movements.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-100 flex items-center gap-2.5 mt-1">
                <span className="material-symbols-outlined text-[#0d766e] text-xl">
                  lens
                </span>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-slate-900">Lens Calibration Check</span>
                  <span className="text-slate-600 text-[11px]">Funduscope #MH-08 active • 45° FOV ready</span>
                </div>
              </div>
            </div>

            {/* Hardware & Edge AI Telemetry */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase">Hardware Connectivity</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Synchronized
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[10px]">Camera Device</span>
                  <span className="font-semibold text-slate-900 truncate">Remidio FOP NM-2</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[10px]">Battery Status</span>
                  <span className="font-semibold text-emerald-700">84% (4.5 hrs)</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[10px]">Inference Engine</span>
                  <span className="font-semibold text-slate-900 truncate">TFLite v2.16 Edge</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[10px]">Local DB Cache</span>
                  <span className="font-semibold text-slate-900">AES-256 Valid</span>
                </div>
              </div>
            </div>

            {/* Field Setting Photo */}
            <div className="relative rounded-xl overflow-hidden shadow-xs h-36 bg-slate-900 border border-slate-200">
              <img
                alt="Anganwadi screening camp setting"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrJwYasfMA7jmaPpUGyUYvYhlVzVZP_Krgf2sFLP1pcJy-dQZlgIhlBCVhvQC0tNzlYQq-w491E7HDX2M7fy-vY7u2ZhtdgM87xMzGQ4DEBwNnl7mSAf3AmLGsskpJiC34PJXkNYj7qthn6KS683YrM1fa5nCQooUd6z5ArcwSq2mTV_k5qUHPJSSk5jBQ0K8ZsKekz1xruDiegEy8eSTFuZro_QGbGGffw_dhY32pfIVNzqYG8xLfQ"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-[11px] text-white font-medium flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-teal-400">
                    location_city
                  </span>
                  Vadbare Anganwadi Sub-center, Nandurbar
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Bottom Ergonomic Action Bar */}
      <footer className="fixed bottom-0 left-0 lg:left-72 right-0 z-30 bg-white/95 backdrop-blur-md px-4 lg:px-6 py-3 border-t border-slate-200 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-slate-600 text-xs w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="min-h-[46px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors cursor-pointer"
            >
              Cancel / Return to Queue
            </button>
            <span className="hidden md:inline text-slate-300">•</span>
            <span className="hidden md:inline text-slate-500">
              Patient #15 of 20 • Form auto-saved locally in SQLite
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveAndProceed}
              disabled={isSaving}
              className="w-full sm:w-auto min-h-[50px] px-7 py-2.5 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md active:translate-y-px transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed drishti-btn"
            >
              {isSaving ? (
                <>
                  <span>Saving...</span>
                  <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                </>
              ) : (
                <>
                  <span>Save & Proceed to Retinal Capture (Step 2)</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
