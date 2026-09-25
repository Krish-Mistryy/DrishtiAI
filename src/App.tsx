import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScreenId, Language, Patient, CampStats } from './types';
import { INITIAL_PATIENTS, INITIAL_CAMP_STATS, ON_CALL_DOCTOR } from './data/mockData';
import { fetchPatients, savePatientRecord } from './services/dbApi';
import { usePrefersReducedMotion } from './hooks/useAnimations';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { PatientRegistrationScreen } from './components/screens/PatientRegistrationScreen';
import { RetinalCaptureScreen } from './components/screens/RetinalCaptureScreen';
import { AiDiagnosisScreen } from './components/screens/AiDiagnosisScreen';
import { ScreeningQueueScreen } from './components/screens/ScreeningQueueScreen';
import { ReferralsTeleConsultScreen } from './components/screens/ReferralsTeleConsultScreen';
import { SyncOfflineDataScreen } from './components/screens/SyncOfflineDataScreen';
import { SettingsCalibrationScreen } from './components/screens/SettingsCalibrationScreen';
import { TeleconsultModal } from './components/modals/TeleconsultModal';
import { FundusModal } from './components/modals/FundusModal';
import { PrintSlipModal } from './components/modals/PrintSlipModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { OfflineBanner } from './components/common/OfflineBanner';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [highGlareMode, setHighGlareMode] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const prefersReduced = usePrefersReducedMotion();

  // Page transition state
  const [pageVisible, setPageVisible] = useState(true);
  const pageRef = useRef<HTMLDivElement>(null);

  const handleScreenChange = useCallback((screen: ScreenId) => {
    if (screen === currentScreen) return;
    if (prefersReduced) {
      setCurrentScreen(screen);
      return;
    }
    setPageVisible(false);
    // Wait for exit transition, then swap screen
    setTimeout(() => {
      setCurrentScreen(screen);
      // Next frame: trigger entrance
      requestAnimationFrame(() => {
        setPageVisible(true);
      });
    }, 120);
  }, [currentScreen, prefersReduced]);

  // Clinical Camp Data State
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [stats, setStats] = useState<CampStats>(INITIAL_CAMP_STATS);
  const [activePatient, setActivePatient] = useState<Patient>(INITIAL_PATIENTS[0]);

  // Load from DB
  const loadPatientsFromDb = async () => {
    let dbPatients = await fetchPatients();
    if (dbPatients.length === 0) {
      // Seed DB if empty
      for (const p of INITIAL_PATIENTS) {
        await savePatientRecord(p);
      }
      dbPatients = await fetchPatients();
    }
    setPatients(dbPatients);
    if (dbPatients.length > 0 && !activePatient) {
       setActivePatient(dbPatients[0]);
    }
  };

  useEffect(() => {
    loadPatientsFromDb().catch(err => {
      console.error('Failed to load DB patients, falling back to mock.', err);
    });
  }, []);

  // Modal States
  const [isTeleconsultOpen, setIsTeleconsultOpen] = useState(false);
  const [isFundusModalOpen, setIsFundusModalOpen] = useState(false);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);
  const [modalPatient, setModalPatient] = useState<Patient | null>(INITIAL_PATIENTS[0]);
  const [modalEye, setModalEye] = useState<'OD' | 'OS'>('OD');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, icon = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // High Glare Mode body class toggling
  const handleToggleHighGlare = () => {
    setHighGlareMode((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('high-glare-mode');
        showToast('Outdoor High-Glare Mode activated (7.4:1 contrast boost).', 'light_mode');
      } else {
        document.body.classList.remove('high-glare-mode');
        showToast('Standard Clinical Display mode restored.', 'wb_sunny');
      }
      return next;
    });
  };

  // Open Fundus Modal Helper
  const handleOpenFundusModal = (patient: Patient, eye: 'OD' | 'OS' = 'OD') => {
    setModalPatient(patient);
    setModalEye(eye);
    setIsFundusModalOpen(true);
  };

  // Open Teleconsult Modal Helper
  const handleOpenTeleconsult = (patient: Patient) => {
    setModalPatient(patient);
    setIsTeleconsultOpen(true);
  };

  // Open Print Slip Modal Helper
  const handleOpenPrintSlip = (patient: Patient) => {
    setModalPatient(patient);
    setIsPrintSlipOpen(true);
  };

  const handleUpdateActivePatient = async (updated: Partial<Patient>) => {
    const newPatient = { ...activePatient, ...updated };
    setActivePatient(newPatient);
    setPatients((prev) =>
      prev.map((p) => (p.id === newPatient.id ? newPatient : p))
    );
    try {
      await savePatientRecord(newPatient);
    } catch (err) {
      console.error('Failed to sync to local DB:', err);
    }
  };

  const handleMarkOsCaptured = async () => {
    const newPatient = {
      ...activePatient,
      osScanUrl:
        activePatient.osScanUrl ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCQVJjJZdcvvYrWTTnBm_guOWvNBFLMS5ZeK2K8xPhixIeJ5ChRIwA_FHv7J6nD56dmRaF4L7hGZJgtNFxVHHhI5a5YOEfK2AOs4tMQ64Womqp4qB3dCGHpBZh1TtbpVQfrhc4aT4uq11J-kqRvm5KO4dSzR1I-bfwswsbVcXmByZgHK0YAuXMVyg87LPdWccsZyuJfXaQkJ8ufZRd1fb1mnzYJu2wMtH0HYK8gOj58BaUrT9hMnjSmiw',
      osStatus: 'Severe CSME (98.4%)',
      riskLevel: 'Critical' as const,
    };
    setActivePatient(newPatient);
    setPatients((prev) => prev.map((p) => (p.id === newPatient.id ? newPatient : p)));
    await savePatientRecord(newPatient);
  };

  const handleCompleteTeleconsult = () => {
    setIsTeleconsultOpen(false);
    showToast(
      'Consultation directive recorded. Pre-stamped tele-slip ready for printing & dispatch.',
      'verified'
    );
    setIsPrintSlipOpen(true);
  };

  // Calculate live numbers
  const pendingSyncCount = patients.filter((p) => p.syncStatus === 'queued').length;
  const highRiskCount = patients.filter(
    (p) => p.riskLevel === 'High Risk' || p.riskLevel === 'Critical'
  ).length;

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface flex flex-col">
      {/* Left Navigation Sidebar */}
      <Navigation
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          handleScreenChange(screen);
          window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
        }}
        pendingSyncCount={pendingSyncCount}
        highRiskCount={highRiskCount}
        totalQueueCount={patients.length}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Main Workspace Frame */}
      <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">
        {/* Top Fixed Header */}
        <Header
          language={language}
          onLanguageChange={setLanguage}
          highGlareMode={highGlareMode}
          onToggleHighGlare={handleToggleHighGlare}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          queuedCount={pendingSyncCount}
        />

        {/* Viewport Content with Page Transition */}
        <main className="pt-16 flex-1 flex flex-col">
          <div
            ref={pageRef}
            className="flex-1 flex flex-col"
            style={{
              opacity: pageVisible ? 1 : 0,
              transform: pageVisible ? 'translateY(0)' : 'translateY(6px)',
              transition: prefersReduced
                ? 'none'
                : 'opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
          {currentScreen === 'dashboard' && (
            <DashboardScreen
              stats={stats}
              patients={patients}
              onNavigate={handleScreenChange}
              onOpenFundusModal={handleOpenFundusModal}
              onOpenTeleconsult={handleOpenTeleconsult}
              onOpenPrintSlip={handleOpenPrintSlip}
              showToast={showToast}
            />
          )}

          {currentScreen === 'patient-registration' && (
            <PatientRegistrationScreen
              activePatient={activePatient}
              onNavigate={handleScreenChange}
              showToast={showToast}
              onUpdatePatient={handleUpdateActivePatient}
            />
          )}

          {currentScreen === 'retinal-capture' && (
            <RetinalCaptureScreen
              patient={activePatient}
              onNavigate={handleScreenChange}
              onOpenFundusModal={handleOpenFundusModal}
              showToast={showToast}
              onMarkOsCaptured={handleMarkOsCaptured}
            />
          )}

          {currentScreen === 'ai-diagnosis' && (
            <AiDiagnosisScreen
              patient={activePatient}
              doctor={ON_CALL_DOCTOR}
              onNavigate={handleScreenChange}
              onOpenFundusModal={handleOpenFundusModal}
              onOpenTeleconsult={handleOpenTeleconsult}
              onOpenPrintSlip={handleOpenPrintSlip}
              showToast={showToast}
              onUpdatePatient={handleUpdateActivePatient}
            />
          )}

          {currentScreen === 'screening-queue' && (
            <ScreeningQueueScreen
              patients={patients}
              onNavigate={handleScreenChange}
              onOpenFundusModal={handleOpenFundusModal}
              onOpenTeleconsult={handleOpenTeleconsult}
              onOpenPrintSlip={handleOpenPrintSlip}
              showToast={showToast}
              onRefreshPatients={loadPatientsFromDb}
            />
          )}

          {currentScreen === 'referrals-tele-consult' && (
            <ReferralsTeleConsultScreen
              urgentPatient={activePatient}
              otherPatients={patients.filter((p) => p.id !== activePatient.id)}
              doctor={ON_CALL_DOCTOR}
              onNavigate={handleScreenChange}
              onOpenFundusModal={handleOpenFundusModal}
              onOpenTeleconsult={handleOpenTeleconsult}
              onOpenPrintSlip={handleOpenPrintSlip}
              showToast={showToast}
            />
          )}

          {currentScreen === 'sync-offline-data' && (
            <SyncOfflineDataScreen
              patients={patients}
              onNavigate={handleScreenChange}
              showToast={showToast}
            />
          )}

          {currentScreen === 'settings-calibration' && (
            <SettingsCalibrationScreen
              language={language}
              onLanguageChange={setLanguage}
              highGlareMode={highGlareMode}
              onToggleHighGlare={handleToggleHighGlare}
              onNavigate={handleScreenChange}
              showToast={showToast}
            />
          )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <TeleconsultModal
        isOpen={isTeleconsultOpen}
        onClose={() => setIsTeleconsultOpen(false)}
        patient={modalPatient || activePatient}
        doctor={ON_CALL_DOCTOR}
        onCompleteConsult={handleCompleteTeleconsult}
      />

      <FundusModal
        isOpen={isFundusModalOpen}
        onClose={() => setIsFundusModalOpen(false)}
        patient={modalPatient || activePatient}
        initialEye={modalEye}
        onPrintSlip={() => {
          setIsFundusModalOpen(false);
          setIsPrintSlipOpen(true);
        }}
      />

      <PrintSlipModal
        isOpen={isPrintSlipOpen}
        onClose={() => setIsPrintSlipOpen(false)}
        patient={modalPatient || activePatient}
      />

      {/* Tactile Toast Notification System */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
