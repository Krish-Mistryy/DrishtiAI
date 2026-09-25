import React from 'react';
import { ScreenId } from '../types';
import logoImg from '../assets/logo.png';
import { ASHA_WORKER } from '../data/mockData';

interface NavigationProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  pendingSyncCount: number;
  highRiskCount: number;
  totalQueueCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  pendingSyncCount,
  highRiskCount,
  totalQueueCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ScreenId,
      label: 'Dashboard',
      icon: 'dashboard',
      badge: { text: 'Live', type: 'live' },
    },
    {
      id: 'patient-registration' as ScreenId,
      label: 'Patient Registration',
      icon: 'person_add',
      step: 'Step 1',
    },
    {
      id: 'retinal-capture' as ScreenId,
      label: 'Retinal Capture',
      icon: 'photo_camera',
      step: 'Step 2',
    },
    {
      id: 'ai-diagnosis' as ScreenId,
      label: 'AI Diagnosis',
      icon: 'psychology',
      step: 'Step 3',
    },
    {
      id: 'screening-queue' as ScreenId,
      label: 'Screening Queue',
      icon: 'format_list_bulleted',
      badge: { text: `${totalQueueCount}`, type: 'counter' },
    },
    {
      id: 'referrals-tele-consult' as ScreenId,
      label: 'Referrals & Tele-Consult',
      icon: 'video_camera_front',
      badge: { text: `${highRiskCount > 0 ? '1 Urgent' : '0'}`, type: 'urgent' },
    },
    {
      id: 'sync-offline-data' as ScreenId,
      label: 'Sync & Offline Data',
      icon: 'sync',
      badge: { text: `${pendingSyncCount}`, type: 'sync' },
    },
    {
      id: 'settings-calibration' as ScreenId,
      label: 'Settings & Calibration',
      icon: 'tune',
    },
  ];

  const handleNavClick = (screen: ScreenId) => {
    onNavigate(screen);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="h-full w-72 bg-surface-container-lowest flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-outline-variant/30 select-none">
      <div className="flex flex-col p-4 overflow-y-auto">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5 mb-4">
          <img
            alt="DrishtiAI Logo"
            className="h-8 w-auto object-contain"
            src={logoImg}
          />
          <div className="flex flex-col">
            <span className="font-bold text-base text-on-surface tracking-tight leading-tight">
              DrishtiAI
            </span>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Retinal Screening PWA v2.4
            </span>
          </div>
        </div>

        {/* Offline Badge Pill */}
        <div className="mb-4 px-2.5 py-1.5 bg-surface-container-low rounded-lg flex items-center gap-2 border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary text-base">
            offline_bolt
          </span>
          <span className="text-xs text-on-surface-variant truncate font-semibold">
            Offline Mode • Edge AI Ready
          </span>
        </div>

        {/* Primary Navigation Links */}
        <nav aria-label="Primary Navigation" className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center justify-between min-h-[46px] px-3.5 rounded-lg drishti-nav-item text-left w-full cursor-pointer ${
                  isActive
                    ? 'bg-[#0d766e] text-white font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-base ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>

                {item.badge && item.badge.type === 'live' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                    {item.badge.text}
                  </span>
                )}
                {item.step && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {item.step}
                  </span>
                )}
                {item.badge && item.badge.type === 'counter' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {item.badge.text}
                  </span>
                )}
                {item.badge && item.badge.type === 'urgent' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.badge.text}
                  </span>
                )}
                {item.badge && item.badge.type === 'sync' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-secondary-fixed text-on-secondary-fixed'
                    }`}
                  >
                    {item.badge.text}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer / ASHA Officer Profile */}
      <div className="p-4 bg-surface-container-low flex flex-col gap-2.5 border-t border-outline-variant/30">
        <div className="flex items-center gap-2.5">
          <img
            alt={ASHA_WORKER.name}
            className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-outline-variant"
            src={ASHA_WORKER.avatarUrl}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-on-surface font-bold truncate">
              {ASHA_WORKER.name} ({ASHA_WORKER.id})
            </span>
            <span className="text-[11px] text-on-surface-variant truncate">
              {ASHA_WORKER.center}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="font-medium">Storage: 4.2 GB Free</span>
            <span className="font-semibold text-emerald-700">84% Battery</span>
          </div>
          <div className="text-[10px] text-outline font-medium">
            SQLite AES-256 Protected
          </div>
        </div>

        <a
          href="tel:104"
          className="flex items-center justify-center gap-2 min-h-[40px] px-3 rounded-lg bg-surface-container-lowest text-error text-xs hover:bg-error-container hover:text-on-error-container drishti-btn border border-error/20 font-semibold"
        >
          <span className="material-symbols-outlined text-base">call</span>
          <span>National Health 104</span>
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        aria-label="Clinical Application Navigation"
        className="hidden lg:flex fixed left-0 top-0 h-full w-72 z-50 flex-col"
      >
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs drishti-modal-backdrop"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 h-full w-72 drishti-drawer-enter">{navContent}</div>
        </div>
      )}
    </>
  );
};
