import React from 'react';
import { AlertTriangle, Building2, Calendar, RefreshCw, Languages, ShieldAlert } from 'lucide-react';
import { getCurrentFinancialYear } from '../utils/calculations';

interface HeaderProps {
  selectedFy: string;
  onFyChange: (fy: string) => void;
  fyList: string[];
  alertCount: number;
  lang: 'gu' | 'en';
  onLangToggle: () => void;
  onResetData: () => void;
  onAlertsClick: () => void;
  isLiveDb?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedFy,
  onFyChange,
  fyList,
  alertCount,
  lang,
  onLangToggle,
  onResetData,
  onAlertsClick,
  isLiveDb = true,
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      {/* Top Banner for Stability Certificate Alert */}
      {alertCount > 0 && (
        <div className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs md:text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer animate-pulse" onClick={onAlertsClick}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {lang === 'gu'
                ? `ચેતવણી: ${alertCount} સ્ટેબિલિટી સર્ટિફિકેટ ૪૫ દિવસ અથવા તેથી ઓછા સમયમાં એક્સપાયર થાય છે / થઈ ગયા છે!`
                : `ALERT: ${alertCount} Stability Certificate(s) expiring within 45 days or expired!`}
            </span>
          </div>
          <span className="underline text-xs flex items-center gap-1 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            {lang === 'gu' ? 'વિગતો જુઓ' : 'View Alerts'} &rarr;
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-inner border border-blue-400/30">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                {lang === 'gu' ? 'હોર્ડિંગ મેનેજમેન્ટ સોફ્ટવેર' : 'Hoarding Management System'}
              </h1>
              {isLiveDb && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>
                    {lang === 'gu'
                      ? 'સેન્ટ્રલ ફ્લાયાવર & સેન્ટ્રલ લાઈવ ડેટાબેઝ (Firebase Live Multi-User)'
                      : 'Central Firestore Live DB (Multi-User Shared)'}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'gu'
                ? 'મહાનગરપાલિકા લાયસન્સ, ત્રિમાસિક ફી, સ્ટેબિલિટી સર્ટિફિકેટ અને ૪૫-દિવસ એલર્ટ સિસ્ટમ'
                : 'Municipal Billboard Licensing, Quarterly Fee Ledger, Stability & Alert System'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
          {/* Financial Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-400 font-medium hidden sm:inline">
              {lang === 'gu' ? 'નાણાકીય વર્ષ:' : 'FY:'}
            </span>
            <select
              value={selectedFy}
              onChange={(e) => onFyChange(e.target.value)}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            >
              <option value="ALL">{lang === 'gu' ? 'તમામ વર્ષો (All FY)' : 'All Financial Years'}</option>
              {fyList.map((fy) => {
                const isCurrent = fy === getCurrentFinancialYear();
                return (
                  <option key={fy} value={fy}>
                    {fy} {isCurrent ? (lang === 'gu' ? '★ ચાલુ વર્તમાન વર્ષ' : '★ Current FY') : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Language Toggle */}
          <button
            onClick={onLangToggle}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            title="ભાષા બદલો / Toggle Language"
          >
            <Languages className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'gu' ? 'English' : 'ગુજરાતી'}</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            title="નમૂના ડેટા રીસેટ કરો"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'gu' ? 'રીસેટ' : 'Reset Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
