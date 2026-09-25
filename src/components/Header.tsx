import React from 'react';
import { Language } from '../types';
import { ASHA_WORKER } from '../data/mockData';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  highGlareMode: boolean;
  onToggleHighGlare: () => void;
  onOpenMobileNav: () => void;
  queuedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  highGlareMode,
  onToggleHighGlare,
  onOpenMobileNav,
  queuedCount,
}) => {
  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/95 backdrop-blur-xl z-40 border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.03)] select-none">
      <div className="h-16 w-full px-4 lg:px-6 flex items-center justify-between gap-3">
        {/* Mobile Hamburger & Camp Location Path */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-container text-on-surface"
            aria-label="Open Navigation Menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>

          <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0">
            check_circle
          </span>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant truncate">
            <span className="font-medium hidden sm:inline">MH Mission</span>
            <span className="text-slate-400 hidden sm:inline">›</span>
            <span className="font-medium hidden md:inline">Nandurbar</span>
            <span className="text-slate-400 hidden md:inline">›</span>
            <span className="text-on-surface font-bold truncate">
              Vadbare Anganwadi Camp #03
            </span>
          </div>
        </div>

        {/* Header Status Badges & Utilities */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            Active Session
          </span>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
            <span className="material-symbols-outlined text-blue-600 text-sm">
              offline_pin
            </span>
            <span>Offline Mode • Local Storage Ready</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
            <span className="material-symbols-outlined text-amber-600 text-sm">
              cloud_sync
            </span>
            <span>{queuedCount} Queued</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <span className="material-symbols-outlined text-emerald-600 text-sm">
              lens
            </span>
            <span>Funduscope Ready</span>
          </div>

          {/* Outdoor High-Glare Mode Button */}
          <button
            type="button"
            onClick={onToggleHighGlare}
            aria-label="High-Glare Outdoor Mode"
            title={
              highGlareMode
                ? 'Outdoor High-Glare Mode Active'
                : 'Turn On High-Glare Outdoor Mode'
            }
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
              highGlareMode
                ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">light_mode</span>
          </button>

          {/* Language Switcher */}
          <div
            aria-label="Language switch"
            className="inline-flex items-center p-0.5 rounded-lg bg-surface-container text-on-surface-variant text-xs border border-outline-variant/30"
            role="group"
          >
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
                language === 'en'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'hover:text-on-surface text-slate-600'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('hi')}
              lang="hi"
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                language === 'hi'
                  ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                  : 'hover:text-on-surface text-slate-600'
              }`}
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('mr')}
              lang="mr"
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                language === 'mr'
                  ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                  : 'hover:text-on-surface text-slate-600'
              }`}
            >
              मराठी
            </button>
          </div>

          {/* User Profile Avatar with Live Status Indicator */}
          <div className="relative flex items-center pl-1">
            <img
              alt={ASHA_WORKER.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300"
              src={ASHA_WORKER.avatarUrl}
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
        </div>
      </div>
    </header>
  );
};
