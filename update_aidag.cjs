const fs = require('fs');

let content = fs.readFileSync('src/components/screens/AiDiagnosisScreen.tsx', 'utf8');

const stateRegex = /(const \[isSendingSms, setIsSendingSms\] = useState\(false\);)/;

const newStates = `  const [isSendingSms, setIsSendingSms] = useState(false);
  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');
  const [analysisData, setAnalysisData] = useState<{ od: any; os: any } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runAnalysis = async () => {
    if (!patient.odScanUrl || !patient.osScanUrl) {
      setErrorMsg('Missing retinal scans. Please capture images first.');
      setAnalysisState('error');
      return;
    }
    
    setAnalysisState('analyzing');
    setErrorMsg('');
    try {
      const [resOD, resOS] = await Promise.all([
        fetch('/api/analyze-retina', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: patient.odScanUrl, eye: 'Right (OD)' })
        }),
        fetch('/api/analyze-retina', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: patient.osScanUrl, eye: 'Left (OS)' })
        })
      ]);
      
      if (!resOD.ok || !resOS.ok) {
        throw new Error('Analysis API failed');
      }
      
      const odData = await resOD.json();
      const osData = await resOS.json();
      
      setAnalysisData({ od: odData, os: osData });
      setAnalysisState('complete');
      showToast('AI analysis completed successfully.', 'check_circle');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect to AI service.');
      setAnalysisState('error');
    }
  };

  // Trigger analysis automatically on mount
  React.useEffect(() => {
    runAnalysis();
  }, []);
`;

content = content.replace(stateRegex, newStates);

// Now replacing the "URGENT CLINICAL TRIAGE" banner. We only show it if analysis is complete and high risk.
const bannerRegex = /\{\/\* Emergency \/ NPCBVI High-Triage Alert Banner \*\/\}\s*<div.*?<\/div>\s*<\/div>\s*<\/div>/s;

const newBanner = `{/* Emergency / NPCBVI High-Triage Alert Banner */}
        {analysisState === 'complete' && (analysisData?.od?.visualAcuityRisk?.toLowerCase().includes('high') || analysisData?.os?.visualAcuityRisk?.toLowerCase().includes('high') || analysisData?.os?.visualAcuityRisk?.toLowerCase().includes('critical') || analysisData?.od?.visualAcuityRisk?.toLowerCase().includes('critical')) && (
        <div className="rounded-xl bg-red-50 border-2 border-red-300 text-red-950 p-4 lg:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl">warning</span>
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
                High risk detected with potential threat to central visual acuity. AI findings are preliminary and require clinical confirmation.
              </p>
              <div className="inline-flex items-center gap-1.5 mt-1.5 text-red-800 text-xs font-semibold">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span>
                  NPCBVI Standard SLA: Eye Care Specialist review mandated within <strong>7 days</strong>.
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                showToast('Specialist triage alert flagged at District Hospital tele-desk.', 'e911_emergency');
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
        )}`;

content = content.replace(bannerRegex, newBanner);

// Replace the Main Clinical Console content with conditional rendering
const mainConsoleRegex = /\{\/\* Main Clinical Console Split-Pane \(12 Columns\) \*\/\}\s*<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">.*?(?=<\/div>\s*<\/div>\s*<\/div>\s*\);)/s;

const newMainConsole = `{/* Main Clinical Console Split-Pane (12 Columns) */}
        {analysisState === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-[#0d766e] animate-spin mb-4">
              smart_toy
            </span>
            <h2 className="text-xl font-bold text-slate-900 mb-2">AI is Analyzing Retinal Scans</h2>
            <p className="text-sm text-slate-500 mb-6">Processing deep learning models via secure Gemini API...</p>
            <div className="w-64 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#0d766e] w-1/2 h-full animate-pulse"></div>
            </div>
          </div>
        )}

        {analysisState === 'error' && (
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl border border-red-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-red-600 mb-4">
              error
            </span>
            <h2 className="text-xl font-bold text-red-900 mb-2">Analysis Failed</h2>
            <p className="text-sm text-red-700 mb-6">{errorMsg}</p>
            <button
              onClick={runAnalysis}
              className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Retry Analysis
            </button>
          </div>
        )}

        {analysisState === 'complete' && analysisData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Retinal Image Workstation (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Scans Display Container */}
              <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Captured Fundus Scans & Grad-CAM Heatmaps
                    </h2>
                    <p className="text-xs text-slate-500">
                      Deep-learning layer activation maps verifying lesion localization
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    <span>AI assistance only. Requires clinician confirmation.</span>
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
                      onChange={(e) => setHeatmapIntensity(Number(e.target.value))}
                      className="w-28 accent-[#0d766e] h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#0d766e] px-2 py-0.5 rounded bg-teal-50 border border-teal-200 font-mono">
                      {heatmapIntensity}%
                    </span>
                  </div>

                  {/* Heatmap Gradient Legend */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Lesion Prob:</span>
                    <div className="h-3 w-28 rounded-full bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 shadow-inner"></div>
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
                  <div className="rounded-xl bg-slate-50 p-3 flex flex-col gap-2 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-teal-100 text-[#0d766e] text-xs font-bold flex items-center justify-center">
                          OD
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Right Eye
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold">
                        {analysisData.od.diagnosis} ({analysisData.od.confidence}%)
                      </span>
                    </div>

                    {/* Retinal 1:1 Viewport */}
                    <div className="relative w-full aspect-square rounded-lg bg-black overflow-hidden flex items-center justify-center group shadow-inner">
                      <img
                        src={patient.odScanUrl}
                        alt="Right Eye OD"
                        style={{
                          filter: \`saturate(\${100 + heatmapIntensity * 0.2}%) contrast(\${100 + heatmapIntensity * 0.1}%)\`,
                        }}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => onOpenFundusModal(patient, 'OD')}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-xs cursor-pointer"
                        title="Inspect Fullscreen"
                      >
                        <span className="material-symbols-outlined text-base">
                          zoom_in
                        </span>
                      </button>
                    </div>

                    {/* Findings Pill List */}
                    <div className="p-2 rounded bg-white border border-slate-200 text-slate-800 flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Microaneurysms:</span>
                        <span className="text-slate-900 text-right">{analysisData.od.microaneurysms}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Exudates:</span>
                        <span className="text-slate-900 text-right">{analysisData.od.exudates}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">CSME Status:</span>
                        <span className="text-slate-900 text-right">{analysisData.od.csmeStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* OS: Left Eye */}
                  <div className="rounded-xl bg-slate-50 p-3 flex flex-col gap-2 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                          OS
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Left Eye
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                        {analysisData.os.diagnosis} ({analysisData.os.confidence}%)
                      </span>
                    </div>

                    {/* Retinal 1:1 Viewport with Grad-CAM */}
                    <div className="relative w-full aspect-square rounded-lg bg-black overflow-hidden flex items-center justify-center group shadow-inner">
                      <img
                        src={patient.osScanUrl}
                        alt="Left Eye OS with Grad-CAM"
                        style={{
                          filter: \`saturate(\${100 + heatmapIntensity * 0.4}%) contrast(\${90 + heatmapIntensity * 0.2}%)\`,
                        }}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => onOpenFundusModal(patient, 'OS')}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-xs cursor-pointer"
                        title="Inspect Fullscreen"
                      >
                        <span className="material-symbols-outlined text-base">
                          zoom_in
                        </span>
                      </button>
                    </div>

                    {/* Findings Pill List */}
                    <div className="p-2 rounded bg-white border border-slate-200 text-slate-800 flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Microaneurysms:</span>
                        <span className="text-slate-900 text-right">{analysisData.os.microaneurysms}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Hemorrhages:</span>
                        <span className="text-slate-900 text-right">{analysisData.os.hemorrhages}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">CSME Status:</span>
                        <span className="text-slate-900 text-right font-bold">{analysisData.os.csmeStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anatomical Cross-Reference Callout */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0d766e] text-base">
                      auto_fix_high
                    </span>
                    <span>AI assessment validated by Gemini 2.5 Flash via secure API. Preliminary results only.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      showToast('Full layer audit reported requested.', 'verified')
                    }
                    className="text-[#0d766e] font-bold hover:underline shrink-0 cursor-pointer ml-2"
                  >
                    Full Layer Audit
                  </button>
                </div>
              </div>

              {/* Longitudinal Camp Telemetry / Patient Risk Vector */}
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
                    <span className="text-[10px] text-slate-500 font-medium">Random Blood Sugar</span>
                    <span className="text-lg font-bold text-red-700 leading-tight mt-0.5">
                      248 mg/dL
                    </span>
                    <span className="text-[10px] text-red-600 font-semibold">Tested Today 09:15</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">Diabetes Duration</span>
                    <span className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                      11 Years
                    </span>
                    <span className="text-[10px] text-slate-500">Irregular Metformin</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">Blood Pressure</span>
                    <span className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                      152/94
                    </span>
                    <span className="text-[10px] text-red-600 font-semibold">Stage 2 HTN</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">Last Retinal Exam</span>
                    <span className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                      Never
                    </span>
                    <span className="text-[10px] text-slate-500">First-time screening</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Edge AI Telemetry & Referral Dispatch (5 Cols) */}
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
                  <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Awaiting Clinician Sign-off
                  </span>
                </div>

                {/* Staging Bars */}
                <div className="flex flex-col gap-3">
                  {/* Severity Grade */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-900">
                        Diabetic Retinopathy (ICDR Scale)
                      </span>
                      <span className="font-bold text-[#0d766e]">Max Grade: {Math.max(analysisData.od.icdrGrade, analysisData.os.icdrGrade)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      {[0,1,2,3,4].map(grade => {
                          const maxGrade = Math.max(analysisData.od.icdrGrade, analysisData.os.icdrGrade);
                          const isActive = grade === maxGrade;
                          const bg = grade === 0 ? 'bg-emerald-600' : grade === 1 ? 'bg-sky-500' : grade === 2 ? 'bg-amber-500' : grade === 3 ? 'bg-orange-600' : 'bg-red-700';
                          return <div key={grade} className={\`\${bg} w-1/5 h-full \${isActive ? 'animate-pulse' : 'opacity-20'}\`} title={\`Grade \${grade}\`}></div>
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
                          OD: {analysisData.od.csmeStatus} | OS: {analysisData.os.csmeStatus}
                        </span>
                      </div>
                    </div>
                    <span className="text-base font-black text-[#0d766e]">{analysisData.od.csmeStatus === 'Present' || analysisData.os.csmeStatus === 'Present' ? 'POS' : 'NEG'}</span>
                  </div>
                </div>

                {/* Model Confidence Specs Block */}
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Model:</span>
                    <span className="font-semibold text-slate-900">
                      Gemini 2.5 Flash API
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>OD Confidence:</span>
                    <span className="font-semibold text-[#0d766e]">
                      {analysisData.od.confidence}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>OS Confidence:</span>
                    <span className="font-semibold text-[#0d766e]">
                      {analysisData.os.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Tele-Referral Execution Toolkit */}
              <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Immediate Clinical Actions
                  </h3>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                    On-Call Doc Online
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Connect patient directly with the District Hospital Ophthalmology tele-triage desk:
                </p>

                <div className="flex flex-col gap-2 pt-1">
                  {/* Dominant Teleconsult Call-to-Action */}
                  <button
                    type="button"
                    onClick={() => onOpenTeleconsult(patient)}
                    className="w-full min-h-[50px] px-4 py-2.5 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold shadow-sm active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">
                      video_call
                    </span>
                    <span>Tele-Consult: {doctor.name} (District Hosp)</span>
                  </button>

                  {/* Generate & Print Official Tele-Slip */}
                  <button
                    type="button"
                    onClick={() => onOpenPrintSlip(patient)}
                    className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg text-[#0d766e]">
                      receipt_long
                    </span>
                    <span>Generate Official Tele-Slip (Marathi / EN PDF)</span>
                  </button>

                  {/* WhatsApp / SMS Dispatch */}
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
                        <span>Send WhatsApp / SMS to {patient.mobile}</span>
                      </>
                    )}
                  </button>

                  {/* Save & Local Queue Sync */}
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
                    <span>Return to Screening Queue (14 waiting)</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Session Token: #VAD-03-8812
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}`;

content = content.replace(mainConsoleRegex, newMainConsole);

fs.writeFileSync('src/components/screens/AiDiagnosisScreen.tsx', content);
