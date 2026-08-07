import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  Building2,
  Tv,
  IndianRupee,
  ShieldAlert,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Landmark,
  Search,
  MapPin,
} from 'lucide-react';
import { Agency, Hoarding, QuarterlyFee, StabilityCertificate, SystemStats, TpScheme } from '../types';
import { getCurrentFinancialYear, isHoardingActiveInFy } from '../utils/calculations';

interface ReportsTabProps {
  stats: SystemStats;
  agencies: Agency[];
  hoardings: Hoarding[];
  quarterlyFees: QuarterlyFee[];
  certificates: StabilityCertificate[];
  tpSchemes?: TpScheme[];
  selectedFy: string;
  lang: 'gu' | 'en';
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  stats,
  agencies,
  hoardings,
  quarterlyFees,
  certificates,
  tpSchemes = [],
  selectedFy: parentFy,
  lang,
}) => {
  // Local FY filter inside Reports tab (defaults to current FY e.g. 2026-27 or parent selected)
  const [reportFy, setReportFy] = useState<string>(
    parentFy && parentFy !== 'ALL' ? parentFy : getCurrentFinancialYear()
  );
  const [reportOwnership, setReportOwnership] = useState<'ALL' | 'Private' | 'SMC'>('ALL');
  const [reportTpScheme, setReportTpScheme] = useState<string>('ALL');
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('');

  // Active Report Tab: 1=Hoardings, 2=Agencies, 3=Quarterly Fees, 4=Stability Certificates, 5=Audit Summary, 6=TP Schemes Summary
  const [activeReportTab, setActiveReportTab] = useState<number>(1);

  const currentFyStr = getCurrentFinancialYear();

  // Find selected TP scheme object if any
  const selectedSchemeObj = tpSchemes.find(
    (s) => s.id === reportTpScheme || s.schemeNo === reportTpScheme
  );

  // Filtered data based on reportFy, reportOwnership, reportTpScheme & reportSearchTerm
  const filteredHoardings = hoardings.filter((h) => {
    const matchesFy = reportFy === 'ALL' ? true : isHoardingActiveInFy(h, reportFy);
    const matchesOwnership = reportOwnership === 'ALL' ? true : (h.ownershipType || 'Private') === reportOwnership;
    
    let matchesTpScheme = true;
    if (reportTpScheme !== 'ALL') {
      if (selectedSchemeObj) {
        matchesTpScheme =
          (h.tpNumber || '').toLowerCase().includes((selectedSchemeObj.schemeNo || '').toLowerCase()) ||
          (h.tpNumber || '').toLowerCase().includes((selectedSchemeObj.nameGu || '').toLowerCase()) ||
          (selectedSchemeObj.areaName ? (h.tpNumber || '').toLowerCase().includes(selectedSchemeObj.areaName.toLowerCase()) : false);
      } else {
        matchesTpScheme = (h.tpNumber || '').toLowerCase().includes(reportTpScheme.toLowerCase());
      }
    }

    const term = reportSearchTerm.trim().toLowerCase();
    const matchesSearch = !term ? true : (
      h.hoardingNo.toLowerCase().includes(term) ||
      h.agencyName.toLowerCase().includes(term) ||
      h.location.toLowerCase().includes(term) ||
      h.tpNumber.toLowerCase().includes(term) ||
      h.fpRsNumber.toLowerCase().includes(term) ||
      (h.ownerName || '').toLowerCase().includes(term)
    );
    return matchesFy && matchesOwnership && matchesTpScheme && matchesSearch;
  });

  const filteredHoardingNosSet = new Set(filteredHoardings.map((h) => h.hoardingNo.toLowerCase()));

  const filteredQuarterlyFees = quarterlyFees.filter((q) => {
    const matchesFy = reportFy === 'ALL' ? true : q.financialYear === reportFy;
    const isFilterApplied = reportTpScheme !== 'ALL' || reportOwnership !== 'ALL' || !!reportSearchTerm.trim();
    const matchesHoarding = !isFilterApplied ? true : filteredHoardingNosSet.has(q.hoardingNo.toLowerCase());
    return matchesFy && matchesHoarding;
  });

  const filteredCertificates = certificates.filter((c) => {
    const isFilterApplied = reportTpScheme !== 'ALL' || reportOwnership !== 'ALL' || !!reportSearchTerm.trim();
    return !isFilterApplied ? true : filteredHoardingNosSet.has(c.hoardingNo.toLowerCase());
  });

  // --- Helper: Format Gujarati / Standard Currency ---
  const formatMoney = (val: number) => `₹${(Number(val) || 0).toLocaleString('en-IN')}`;

  // --- CSV Exporter with UTF-8 BOM & mandatory SMC Headers ---
  const exportCsvWithSmcHeader = (
    reportTitle: string,
    headers: string[],
    rows: (string | number)[][],
    filename: string
  ) => {
    if (!rows || !rows.length) return;
    const currentDate = new Date().toLocaleDateString('en-IN');
    const bom = '\uFEFF';
    let csv = bom;

    // Mandatory Header Lines
    csv += `"સુરત મહાનગરપાલિકા"\n`;
    csv += `"નવો પુર્વ (સરથાણા) ઝોન-બી"\n`;
    csv += `"અહેવાલ: ${reportTitle}" , "નાણાકીય વર્ષ: ${reportFy}" , "તારીખ: ${currentDate}"\n\n`;

    // Headers
    csv += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

    // Data rows
    rows.forEach((row) => {
      csv +=
        row
          .map((cell) => {
            const cellStr = cell === null || cell === undefined ? '' : String(cell);
            return `"${cellStr.replace(/"/g, '""')}"`;
          })
          .join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${reportFy}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- HTML Formatted Document Download with SMC Header Banner & Custom Styling ---
  const downloadHtmlReport = (
    reportTitle: string,
    summaryCardsHtml: string,
    tableHeadersHtml: string,
    tableBodyHtml: string,
    tableFooterHtml: string,
    filename: string
  ) => {
    const currentDate = new Date().toLocaleDateString('gu-IN');
    const currentTime = new Date().toLocaleTimeString('gu-IN');

    const html = `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>સુરત મહાનગરપાલિકા - ${reportTitle}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .header-banner { background: linear-gradient(135deg, #064e3b 0%, #0f766e 100%); color: #ffffff; text-align: center; padding: 24px 20px; border-radius: 10px; margin-bottom: 24px; border-bottom: 4px solid #f59e0b; }
    .header-banner h1 { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 1px; color: #fef08a; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .header-banner h2 { margin: 6px 0 0 0; font-size: 18px; font-weight: 800; color: #ffffff; }
    .header-banner p { margin: 8px 0 0 0; font-size: 13px; font-weight: 600; color: #a7f3d0; background: rgba(0,0,0,0.25); display: inline-block; padding: 4px 16px; border-radius: 20px; }
    
    .report-meta { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; font-weight: 700; color: #166534; }
    
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; text-align: center; }
    .summary-card span { display: block; font-size: 11px; color: #64748b; font-weight: 700; }
    .summary-card strong { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; display: block; }

    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #0f2922; color: #ffffff; font-weight: 800; text-align: left; padding: 10px 12px; border: 1px solid #115e59; }
    td { padding: 9px 12px; border: 1px solid #e2e8f0; color: #334155; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    tr:hover { background-color: #f0fdf4; }
    
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; }
    .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

    tfoot tr { background: #e2e8f0; font-weight: 900; color: #0f172a; }
    tfoot td { border-top: 2px solid #0f172a; padding: 12px; font-size: 13px; }

    .footer-signatures { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 2px dashed #cbd5e1; }
    .sig-box { text-align: center; width: 220px; font-size: 12px; font-weight: 700; color: #475569; }
    .sig-line { border-bottom: 1.5px solid #0f172a; height: 40px; margin-bottom: 6px; }

    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .header-banner { background: #0f2922 !important; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <h1>સુરત મહાનગરપાલિકા</h1>
      <h2>નવો પુર્વ (સરથાણા) ઝોન-બી</h2>
      <p>હોર્ડિંગ એસ્ટેટ શાખા - અધિકૃત ઝોનલ વિગતવાર અહેવાલ</p>
    </div>

    <div class="report-meta">
      <span>📌 અહેવાલ: <strong>${reportTitle}</strong></span>
      <span>📅 નાણાકીય વર્ષ: <strong>${reportFy}</strong></span>
      <span>🕒 સમય: <strong>${currentDate} (${currentTime})</strong></span>
    </div>

    ${summaryCardsHtml}

    <table>
      <thead>
        <tr>${tableHeadersHtml}</tr>
      </thead>
      <tbody>
        ${tableBodyHtml}
      </tbody>
      <tfoot>
        ${tableFooterHtml}
      </tfoot>
    </table>

    <div class="footer-signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <span>તપાસનાર અધિકારીશ્રી</span>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <span>હેડ લાયસન્સ ઇન્સ્પેક્ટર</span>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <span>ઝોનલ હેડ અધિકારીશ્રી<br>નવો પુર્વ (સરથાણા) ઝોન-બી</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${reportFy}_${new Date().toISOString().split('T')[0]}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct Print Trigger
  const handlePrintReport = () => {
    window.print();
  };

  // --- Calculations for Summaries ---
  const totalHoardingsCount = filteredHoardings.length;
  const totalAreaSqM = filteredHoardings.reduce((sum, h) => sum + (h.rawArea || 0), 0);
  const totalAnnualFeeSum = filteredHoardings.reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);
  const totalQuarterlyFeeSum = filteredHoardings.reduce(
    (sum, h) => sum + (h.calculatedQuarterlyFee || Math.ceil((h.calculatedAnnualFee || 0) / 4)),
    0
  );
  const totalPaidRevenue = filteredQuarterlyFees
    .filter((q) => q.paymentStatus === 'Paid')
    .reduce((sum, q) => sum + q.totalAmount, 0);
  const totalPendingFees = filteredQuarterlyFees
    .filter((q) => q.paymentStatus === 'Pending' || q.paymentStatus === 'Overdue')
    .reduce((sum, q) => sum + q.totalAmount, 0);

  const totalTaxableSum = filteredQuarterlyFees.reduce((sum, q) => sum + (q.taxableAmount || 0), 0);
  const totalGstSum = filteredQuarterlyFees.reduce((sum, q) => sum + (q.sgst || 0) + (q.cgst || 0), 0);
  const totalAllQuarterlySum = filteredQuarterlyFees.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Controls Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              {lang === 'gu'
                ? 'અહેવાલ અને ડાઉનલોડ સેન્ટર (Official Reports Center)'
                : 'Municipal Reports & Data Export Center'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'gu'
                ? 'સુરત મહાનગરપાલિકા નવો પુર્વ (સરથાણા) ઝોન-બી ના તમામ અહેવાલો એક્સલ (CSV), HTML તથા પ્રિન્ટ/PDF માં ડાઉનલોડ કરો.'
                : 'Export and print official Surat Municipal Corporation Zone-B reports with official titles.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Financial Year Selector for Reports */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3 py-2 rounded-xl text-xs shrink-0">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-700">
                {lang === 'gu' ? 'નાણાકીય વર્ષ:' : 'FY:'}
              </span>
              <select
                value={reportFy}
                onChange={(e) => setReportFy(e.target.value)}
                className="bg-white border border-slate-300 font-extrabold text-blue-900 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">{lang === 'gu' ? 'તમામ વર્ષો' : 'All FY'}</option>
                <option value="2026-27">
                  2026-27 {currentFyStr === '2026-27' ? (lang === 'gu' ? '★' : '★') : ''}
                </option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
              </select>
            </div>

            {/* TP Scheme Filter Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-indigo-200 px-3 py-2 rounded-xl text-xs shrink-0">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-700">
                {lang === 'gu' ? 'ટી.પી. સ્કીમ:' : 'TP Scheme:'}
              </span>
              <select
                value={reportTpScheme}
                onChange={(e) => setReportTpScheme(e.target.value)}
                className="bg-white border border-indigo-300 font-extrabold text-indigo-900 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[200px] truncate"
              >
                <option value="ALL">{lang === 'gu' ? 'તમામ ટી.પી. સ્કીમો (All)' : 'All TP Schemes'}</option>
                {tpSchemes.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.schemeNo ? `સ્કીમ નં. ${tp.schemeNo} - ${tp.nameGu}` : tp.nameGu}
                  </option>
                ))}
              </select>
            </div>

            {/* Ownership Type Selector for Reports */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3 py-2 rounded-xl text-xs shrink-0">
              <span className="font-bold text-slate-700">
                {lang === 'gu' ? 'માલિકી:' : 'Ownership:'}
              </span>
              <select
                value={reportOwnership}
                onChange={(e) => setReportOwnership(e.target.value as any)}
                className="bg-white border border-slate-300 font-extrabold text-blue-900 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">{lang === 'gu' ? 'તમામ માલિકી' : 'All Ownerships'}</option>
                <option value="Private">{lang === 'gu' ? 'ખાનગી માલિકાના હોડીંગ્સ' : 'Private Ownership'}</option>
                <option value="SMC">{lang === 'gu' ? 'સુ.મ.પા.ની માલિકીના હોડીંગ્સ' : 'SMC Owned'}</option>
              </select>
            </div>

            {/* Live Search Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl text-xs grow md:grow-0 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={reportSearchTerm}
                onChange={(e) => setReportSearchTerm(e.target.value)}
                placeholder={lang === 'gu' ? 'હોર્ડિંગ નં, એજન્સી, લોકેશન શોધો...' : 'Search hoarding, agency, location...'}
                className="bg-transparent border-none focus:outline-none text-slate-800 w-full font-medium"
              />
              {reportSearchTerm && (
                <button
                  onClick={() => setReportSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Category Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveReportTab(1)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 1
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>૧. હોર્ડિંગ્સ માસ્ટર રજીસ્ટર</span>
          </button>

          <button
            onClick={() => setActiveReportTab(2)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 2
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>૨. એજન્સી વાર સમરી</span>
          </button>

          <button
            onClick={() => setActiveReportTab(3)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 3
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>૩. ત્રિમાસિક ફી ચોપડો</span>
          </button>

          <button
            onClick={() => setActiveReportTab(4)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 4
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>૪. સ્ટેબિલિટી સર્ટિફિકેટ્સ</span>
          </button>

          <button
            onClick={() => setActiveReportTab(5)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 5
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>૫. ઝોનલ આવક ઓડિટ અહેવાલ</span>
          </button>

          <button
            onClick={() => setActiveReportTab(6)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 6
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>૬. ટી.પી. સ્કીમ વાર સમરી અહેવાલ</span>
          </button>
        </div>
      </div>

      {/* Main Report Formatted Preview & Print View Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md space-y-6 print:border-none print:shadow-none print:p-0">
        {/* MANDATORY MUNICIPAL HEADER BANNER */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 rounded-xl border border-emerald-500/30 text-center space-y-1.5 shadow-sm print:bg-emerald-950 print:text-white print:p-4">
          <div className="flex justify-center mb-1">
            <Building2 className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wide text-amber-300 uppercase">
            સુરત મહાનગરપાલિકા
          </h1>
          <h2 className="text-base md:text-lg font-extrabold text-emerald-100">
            નવો પુર્વ (સરથાણા) ઝોન-બી
          </h2>
          <p className="text-xs font-bold text-emerald-200 bg-white/10 backdrop-blur-md px-4 py-1 rounded-full inline-block border border-white/20 mt-1">
            હોર્ડિંગ એસ્ટેટ શાખા - અધિકૃત ઝોનલ વિગતવાર અહેવાલ
          </p>
        </div>

        {/* Report Title & Metadata Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/80 p-3.5 rounded-xl border border-teal-200 text-xs font-bold text-teal-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>
              અહેવાલ:{' '}
              <strong className="text-blue-900 text-sm">
                {activeReportTab === 1 && '૧. હોર્ડિંગ્સ માસ્ટર રજીસ્ટર વિગતવાર અહેવાલ'}
                {activeReportTab === 2 && '૨. એજન્સી વાર હોર્ડિંગ્સ અને આવક સમરી અહેવાલ'}
                {activeReportTab === 3 && '૩. ત્રિમાસિક ફી વસૂલાત અને પહોંચ હિસાબી ચોપડો'}
                {activeReportTab === 4 && '૪. સ્ટેબિલિટી સર્ટિફિકેટ્સ અને ૪૫-દિવસ એલર્ટ્સ રજીસ્ટર'}
                {activeReportTab === 5 && '૫. ઝોનલ આવક ઓડિટ અને વાર્ષિક ટાર્ગેટ અહેવાલ'}
                {activeReportTab === 6 && '૬. નગર રચના યોજના (ટી.પી. સ્કીમ) વાર સમરી અહેવાલ'}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-teal-800 shrink-0">
            {reportTpScheme !== 'ALL' && (
              <span className="bg-indigo-700 text-white font-sans px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                ટી.પી. સ્કીમ: {selectedSchemeObj ? `સ્કીમ નં. ${selectedSchemeObj.schemeNo} (${selectedSchemeObj.nameGu})` : reportTpScheme}
              </span>
            )}
            <span>નાણાકીય વર્ષ: <strong className="text-slate-900 font-extrabold">{reportFy}</strong></span>
            <span>|</span>
            <span>તારીખ: <strong className="text-slate-900">{new Date().toLocaleDateString('gu-IN')}</strong></span>
          </div>
        </div>

        {/* Export Buttons Bar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-bold mr-auto">
            {lang === 'gu' ? 'ડાઉનલોડ / પ્રિન્ટ વિકલ્પો:' : 'Export / Print Actions:'}
          </span>

          {/* Export CSV Button */}
          <button
            onClick={() => {
              if (activeReportTab === 1) {
                exportCsvWithSmcHeader(
                  'હોર્ડિંગ્સ માસ્ટર રજીસ્ટર',
                  ['અનુ.નં', 'હોર્ડિંગ નં', 'એજન્સી', 'લોકેશન', 'ટીપી નં', 'એફપી નં', 'માલિક', 'માલિકીનો પ્રકાર', 'પ્રકાર', 'પહોળાઈ(m)', 'લંબાઈ(m)', 'ક્ષેત્રફળ(sq.m)', 'દર/sq.m', 'વાર્ષિક ફી(₹)', 'ત્રિમાસિક ફી(₹)', 'પરવાનગી તારીખ', 'નાણાકીય વર્ષ', 'સ્ટેટસ', 'રીમાર્ક્સ'],
                  filteredHoardings.map((h, i) => [
                    i + 1,
                    h.hoardingNo,
                    h.agencyName,
                    h.location,
                    h.tpNumber,
                    h.fpRsNumber,
                    h.ownerName || '-',
                    h.ownershipType === 'SMC' ? 'સુ.મ.પા.ની માલિકીના' : 'ખાનગી માલિકાના',
                    h.type,
                    h.width,
                    h.length,
                    Number(h.rawArea || 0).toFixed(2),
                    h.effectiveRate,
                    h.calculatedAnnualFee,
                    h.calculatedQuarterlyFee || Math.ceil(h.calculatedAnnualFee / 4),
                    h.permissionDate,
                    h.financialYear,
                    h.status,
                    h.remarks || '',
                  ]),
                  'hoardings_master_register'
                );
              } else if (activeReportTab === 2) {
                exportCsvWithSmcHeader(
                  'એજન્સી વાર સમરી અહેવાલ',
                  ['અનુ.નં', 'એજન્સી નં', 'એજન્સીનું નામ', 'જીએસટી નં', 'સંપર્ક સભ્ય', 'ફોન', 'કુલ હોર્ડિંગ્સ', 'એકટીવ હોર્ડિંગ્સ', 'કુલ ક્ષેત્રફળ(sq.m)', 'કુલ વાર્ષિક ફી(₹)'],
                  agencies.map((a, i) => {
                    const agH = filteredHoardings.filter((h) => h.agencyId === a.id || h.agencyName === a.name);
                    const agArea = agH.reduce((sum, h) => sum + (h.rawArea || 0), 0);
                    const agFee = agH.reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);
                    return [
                      i + 1,
                      a.agencyNo,
                      a.name,
                      a.gstNumber,
                      a.contactPerson,
                      a.phone,
                      agH.length,
                      agH.filter((h) => h.status === 'Active').length,
                      agArea.toFixed(2),
                      agFee,
                    ];
                  }),
                  'agency_summary_report'
                );
              } else if (activeReportTab === 3) {
                exportCsvWithSmcHeader(
                  'ત્રિમાસિક ફી વસૂલાત ચોપડો',
                  ['અનુ.નં', 'રસીદ નં', 'તારીખ', 'હોર્ડિંગ નં', 'એજન્સી', 'વર્ષ', 'ક્વાર્ટર', 'મૂળ ફી(₹)', 'વ્યાજ(₹)', 'મુક્તિ(₹)', 'કરપાત્ર રકમ(₹)', 'SGST 9%(₹)', 'CGST 9%(₹)', 'કુલ રકમ(₹)', 'મોડ', 'સ્ટેટસ'],
                  filteredQuarterlyFees.map((q, i) => [
                    i + 1,
                    q.receiptNo,
                    q.receiptDate,
                    q.hoardingNo,
                    q.agencyName,
                    q.financialYear,
                    q.quarter,
                    q.quarterlyLicenseFee,
                    q.interest,
                    q.deductions,
                    q.taxableAmount,
                    q.sgst,
                    q.cgst,
                    q.totalAmount,
                    q.paymentMode,
                    q.paymentStatus,
                  ]),
                  'quarterly_fee_ledger'
                );
              } else if (activeReportTab === 4) {
                exportCsvWithSmcHeader(
                  'સ્ટેબિલિટી સર્ટિફિકેટ્સ અહેવાલ',
                  ['અનુ.નં', 'સર્ટિફિકેટ નં', 'હોર્ડિંગ નં', 'એજન્સી', 'લોકેશન', 'એન્જિનિયર', 'ઇશ્યુ તારીખ', 'માન્ય તારીખ', 'બાકી દિવસો', 'એલર્ટ સક્રિય', 'સ્ટેટસ'],
                  filteredCertificates.map((c, i) => [
                    i + 1,
                    c.certificateNo,
                    c.hoardingNo,
                    c.agencyName,
                    c.location || '-',
                    c.engineerName,
                    c.issueDate,
                    c.validUntilDate,
                    c.daysRemaining,
                    c.isAlertActive ? 'હા (Yes)' : 'ના (No)',
                    c.status,
                  ]),
                  'stability_certificates_report'
                );
              } else if (activeReportTab === 5) {
                exportCsvWithSmcHeader(
                  'ઝોનલ આવક ઓડિટ અહેવાલ',
                  ['અનુ.નં', 'કેટેગરી', 'વિગત', 'સંખ્યા', 'કુલ રકમ (₹)'],
                  [
                    [1, 'હોર્ડિંગ્સ', 'કુલ હોર્ડિંગ્સ સંખ્યા', filteredHoardings.length, totalAnnualFeeSum],
                    [2, 'હોર્ડિંગ્સ', 'એકટીવ હોર્ડિંગ્સ', filteredHoardings.filter((h) => h.status === 'Active').length, totalAnnualFeeSum],
                    [3, 'ક્ષેત્રફળ', 'કુલ હોર્ડિંગ ક્ષેત્રફળ (sq.m)', totalAreaSqM.toFixed(2), '-'],
                    [4, 'આવક', 'વસૂલાયેલ ફી', filteredQuarterlyFees.filter((q) => q.paymentStatus === 'Paid').length, totalPaidRevenue],
                    [5, 'બાકી', 'બાકી રહેલ લાયસન્સ ફી', filteredQuarterlyFees.filter((q) => q.paymentStatus !== 'Paid').length, totalPendingFees],
                  ],
                  'zonal_revenue_audit'
                );
              } else {
                exportCsvWithSmcHeader(
                  'ટી.પી. સ્કીમ વાર સમરી અહેવાલ',
                  ['અનુ.નં', 'ટી.પી. સ્કીમ નં', 'ગુજરાતી નામ', 'અંગ્રેજી નામ', 'વિસ્તાર', 'હોર્ડિંગ્સ સંખ્યા', 'કુલ ક્ષેત્રફળ (sq.m)', 'કુલ વાર્ષિક ફી (₹)'],
                  tpSchemes.map((tp, i) => {
                    const tpH = filteredHoardings.filter((h) =>
                      h.tpNumber?.toLowerCase().includes(tp.schemeNo?.toLowerCase()) ||
                      h.tpNumber?.toLowerCase().includes(tp.nameGu?.toLowerCase())
                    );
                    const area = tpH.reduce((sum, h) => sum + (h.rawArea || 0), 0);
                    const fee = tpH.reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);
                    return [
                      i + 1,
                      tp.schemeNo,
                      tp.nameGu,
                      tp.nameEn || '',
                      tp.areaName || '',
                      tpH.length,
                      area.toFixed(2),
                      fee,
                    ];
                  }),
                  'tp_schemes_summary_report'
                );
              }
            }}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'gu' ? 'એક્સલ / CSV ડાઉનલોડ' : 'Export CSV / Excel'}</span>
          </button>

          {/* Download HTML Formatted Report */}
          <button
            onClick={() => {
              if (activeReportTab === 1) {
                const summaryHtml = `
                  <div class="summary-grid">
                    <div class="summary-card"><span>કુલ હોર્ડિંગ્સ</span><strong>${filteredHoardings.length} Nos</strong></div>
                    <div class="summary-card"><span>કુલ ક્ષેત્રફળ (sq.m)</span><strong>${totalAreaSqM.toFixed(2)} sq.m</strong></div>
                    <div class="summary-card"><span>કુલ વાર્ષિક લાયસન્સ ફી</span><strong>${formatMoney(totalAnnualFeeSum)}</strong></div>
                    <div class="summary-card"><span>કુલ ત્રિમાસિક હપ્તો</span><strong>${formatMoney(totalQuarterlyFeeSum)}</strong></div>
                  </div>
                `;
                const headersHtml = `<th>અનુ.નં</th><th>હોર્ડિંગ નં</th><th>એજન્સીનું નામ</th><th>લોકેશન & માલિક</th><th>માલિકી પ્રકાર</th><th>પ્રકાર</th><th>ક્ષેત્રફળ(sq.m)</th><th>દર/sq.m</th><th>વાર્ષિક ફી(₹)</th><th>ત્રિમાસિક ફી(₹)</th><th>સ્ટેટસ</th><th>રીમાર્ક્સ</th>`;
                const bodyHtml = filteredHoardings
                  .map(
                    (h, i) => `<tr>
                      <td>${i + 1}</td>
                      <td><strong>${h.hoardingNo}</strong></td>
                      <td>${h.agencyName}</td>
                      <td>${h.location}<br><small style="color:#64748b;">માલિક: ${h.ownerName || '-'}</small></td>
                      <td><strong>${h.ownershipType === 'SMC' ? 'સુ.મ.પા. માલિકી' : 'ખાનગી માલિકી'}</strong></td>
                      <td>${h.type}</td>
                      <td style="text-align:right;"><strong>${Number(h.rawArea || 0).toFixed(2)}</strong></td>
                      <td style="text-align:right;">₹${h.effectiveRate}</td>
                      <td style="text-align:right;"><strong>${formatMoney(h.calculatedAnnualFee)}</strong></td>
                      <td style="text-align:right;"><strong>${formatMoney(h.calculatedQuarterlyFee || Math.ceil((h.calculatedAnnualFee || 0) / 4))}</strong></td>
                      <td style="text-align:center;"><span class="badge ${h.status === 'Active' ? 'badge-success' : 'badge-danger'}">${h.status}</span></td>
                      <td>${h.remarks || '-'}</td>
                    </tr>`
                  )
                  .join('');
                const footHtml = `<tr><td colspan="6" style="text-align:right;"><strong>કુલ સરવાળો (Grand Total):</strong></td><td style="text-align:right;"><strong>${totalAreaSqM.toFixed(2)} sq.m</strong></td><td style="text-align:right;">-</td><td style="text-align:right;"><strong>${formatMoney(totalAnnualFeeSum)}</strong></td><td style="text-align:right;"><strong>${formatMoney(totalQuarterlyFeeSum)}</strong></td><td colspan="2"></td></tr>`;

                downloadHtmlReport('૧. હોર્ડિંગ્સ માસ્ટર રજીસ્ટર', summaryHtml, headersHtml, bodyHtml, footHtml, 'hoardings_master_report');
              } else if (activeReportTab === 2) {
                const headersHtml = `<th>અનુ.નં</th><th>એજન્સી નં</th><th>એજન્સીનું નામ</th><th>જીએસટી નં</th><th>સંપર્ક સભ્ય & ફોન</th><th>કુલ હોર્ડિંગ્સ</th><th>કુલ ક્ષેત્રફળ(sq.m)</th><th>કુલ વાર્ષિક ફી(₹)</th>`;
                const bodyHtml = agencies
                  .map((a, i) => {
                    const agH = filteredHoardings.filter((h) => h.agencyId === a.id || h.agencyName === a.name);
                    const agArea = agH.reduce((sum, h) => sum + (h.rawArea || 0), 0);
                    const agFee = agH.reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);
                    return `<tr>
                      <td>${i + 1}</td>
                      <td><strong>${a.agencyNo}</strong></td>
                      <td><strong>${a.name}</strong></td>
                      <td>${a.gstNumber}</td>
                      <td>${a.contactPerson}<br><small style="color:#64748b;">${a.phone}</small></td>
                      <td>${agH.length}</td>
                      <td style="text-align:right;"><strong>${agArea.toFixed(2)}</strong></td>
                      <td style="text-align:right;"><strong>${formatMoney(agFee)}</strong></td>
                    </tr>`;
                  })
                  .join('');
                const footHtml = `<tr><td colspan="5" style="text-align:right;"><strong>કુલ સરવાળો (Grand Total):</strong></td><td style="text-align:center;"><strong>${filteredHoardings.length} Nos</strong></td><td style="text-align:right;"><strong>${totalAreaSqM.toFixed(2)} sq.m</strong></td><td style="text-align:right;"><strong>${formatMoney(totalAnnualFeeSum)}</strong></td></tr>`;

                downloadHtmlReport('૨. એજન્સી વાર સમરી અહેવાલ', '', headersHtml, bodyHtml, footHtml, 'agency_summary_report');
              } else if (activeReportTab === 3) {
                const headersHtml = `<th>અનુ.નં</th><th>રસીદ નં</th><th>તારીખ</th><th>હોર્ડિંગ નં</th><th>એજન્સી</th><th>વર્ષ & ક્વાર્ટર</th><th>કરપાત્ર રકમ(₹)</th><th>SGST+CGST(₹)</th><th>કુલ ચૂકવેલ રકમ(₹)</th><th>સ્ટેટસ</th>`;
                const bodyHtml = filteredQuarterlyFees
                  .map(
                    (q, i) => `<tr>
                      <td>${i + 1}</td>
                      <td><strong>${q.receiptNo}</strong></td>
                      <td>${q.receiptDate}</td>
                      <td>${q.hoardingNo}</td>
                      <td>${q.agencyName}</td>
                      <td>${q.financialYear} (${q.quarter})</td>
                      <td>${formatMoney(q.taxableAmount)}</td>
                      <td>${formatMoney(q.sgst + q.cgst)}</td>
                      <td><strong>${formatMoney(q.totalAmount)}</strong></td>
                      <td><span class="badge ${q.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${q.paymentStatus}</span></td>
                    </tr>`
                  )
                  .join('');
                const footHtml = `<tr><td colspan="8" style="text-align:right;"><strong>કુલ વસૂલાયેલ ફી:</strong></td><td><strong>${formatMoney(totalPaidRevenue)}</strong></td><td></td></tr>`;

                downloadHtmlReport('૩. ત્રિમાસિક ફી વસૂલાત ચોપડો', '', headersHtml, bodyHtml, footHtml, 'quarterly_fee_ledger');
              } else if (activeReportTab === 4) {
                const headersHtml = `<th>અનુ.નં</th><th>સર્ટિફિકેટ નં</th><th>હોર્ડિંગ નં</th><th>એજન્સી</th><th>એન્જિનિયર</th><th>ઇશ્યુ તારીખ</th><th>માન્ય તારીખ</th><th>બાકી દિવસો</th><th>સ્ટેટસ</th>`;
                const bodyHtml = filteredCertificates
                  .map(
                    (c, i) => `<tr>
                      <td>${i + 1}</td>
                      <td><strong>${c.certificateNo}</strong></td>
                      <td>${c.hoardingNo}</td>
                      <td>${c.agencyName}</td>
                      <td>${c.engineerName}</td>
                      <td>${c.issueDate}</td>
                      <td>${c.validUntilDate}</td>
                      <td><strong>${c.daysRemaining} દિવસ</strong></td>
                      <td><span class="badge ${c.isAlertActive ? 'badge-danger' : 'badge-success'}">${c.status}</span></td>
                    </tr>`
                  )
                  .join('');

                downloadHtmlReport('૪. સ્ટેબિલિટી સર્ટિફિકેટ એલર્ટ્સ', '', headersHtml, bodyHtml, '', 'stability_certificate_alerts');
              } else if (activeReportTab === 5) {
                const headersHtml = `<th>અનુ.નં</th><th>વિગત</th><th>સંખ્યા / માપ</th><th>રકમ (₹)</th>`;
                const bodyHtml = `
                  <tr><td>1</td><td>કુલ નોંધાયેલ હોર્ડિંગ્સ</td><td>${filteredHoardings.length}</td><td>${formatMoney(totalAnnualFeeSum)}</td></tr>
                  <tr><td>2</td><td>એકટીવ હોર્ડિંગ્સ</td><td>${filteredHoardings.filter((h) => h.status === 'Active').length}</td><td>${formatMoney(totalAnnualFeeSum)}</td></tr>
                  <tr><td>3</td><td>કુલ વસૂલાયેલ ત્રિમાસિક ફી</td><td>${filteredQuarterlyFees.filter((q) => q.paymentStatus === 'Paid').length} પહોંચો</td><td><strong>${formatMoney(totalPaidRevenue)}</strong></td></tr>
                  <tr><td>4</td><td>બાકી રહેલ લાયસન્સ ફી dues</td><td>${filteredQuarterlyFees.filter((q) => q.paymentStatus !== 'Paid').length} ગાળા</td><td><strong style="color:#b91c1c;">${formatMoney(totalPendingFees)}</strong></td></tr>
                `;
                downloadHtmlReport('૫. ઝોનલ આવક ઓડિટ અહેવાલ', '', headersHtml, bodyHtml, '', 'zonal_revenue_audit');
              } else {
                const headersHtml = `<th>અનુ.નં</th><th>ટી.પી. સ્કીમ નં</th><th>ગુજરાતી નામ</th><th>વિસ્તાર</th><th>હોર્ડિંગ્સ સંખ્યા</th><th>કુલ ક્ષેત્રફળ (sq.m)</th><th>કુલ વાર્ષિક ફી (₹)</th>`;
                const bodyHtml = tpSchemes
                  .map((tp, i) => {
                    const tpH = filteredHoardings.filter((h) =>
                      h.tpNumber?.toLowerCase().includes(tp.schemeNo?.toLowerCase()) ||
                      h.tpNumber?.toLowerCase().includes(tp.nameGu?.toLowerCase())
                    );
                    const area = tpH.reduce((sum, h) => sum + (h.rawArea || 0), 0);
                    const fee = tpH.reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);
                    return `<tr>
                      <td>${i + 1}</td>
                      <td><strong>${tp.schemeNo}</strong></td>
                      <td><strong>${tp.nameGu}</strong></td>
                      <td>${tp.areaName || '-'}</td>
                      <td><strong>${tpH.length} Nos</strong></td>
                      <td style="text-align:right;"><strong>${area.toFixed(2)}</strong></td>
                      <td style="text-align:right;"><strong>${formatMoney(fee)}</strong></td>
                    </tr>`;
                  })
                  .join('');

                downloadHtmlReport('૬. ટી.પી. સ્કીમ વાર સમરી અહેવાલ', '', headersHtml, bodyHtml, '', 'tp_schemes_summary_report');
              }
            }}
            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{lang === 'gu' ? 'HTML ફાઈલ ડાઉનલોડ' : 'Download HTML Report'}</span>
          </button>

          {/* Direct Print / PDF Button */}
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === 'gu' ? 'પ્રિન્ટ / PDF સેવ કરો' : 'Print / Save PDF'}</span>
          </button>
        </div>

        {/* --- REPORT TAB 1: HOARDINGS MASTER REGISTER --- */}
        {activeReportTab === 1 && (
          <div className="space-y-4">
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-slate-500 font-bold block">કુલ હોર્ડિંગ્સ</span>
                <strong className="text-lg text-slate-900 font-black">{filteredHoardings.length} Nos</strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <span className="text-emerald-800 font-bold block">કુલ ક્ષેત્રફળ</span>
                <strong className="text-lg text-emerald-950 font-black">{totalAreaSqM.toFixed(2)} sq.m</strong>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <span className="text-blue-800 font-bold block">કુલ વાર્ષિક ફી</span>
                <strong className="text-lg text-blue-950 font-black">{formatMoney(totalAnnualFeeSum)}</strong>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span className="text-amber-800 font-bold block">ત્રિમાસિક ફી હપ્તો</span>
                <strong className="text-lg text-amber-950 font-black">
                  {formatMoney(Math.ceil(totalAnnualFeeSum / 4))}
                </strong>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="px-3 py-2.5 border-b border-slate-800">અનુ.</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">હોર્ડિંગ નં</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">એજન્સીનું નામ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">લોકેશન & માલિક</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">માલિકીનો પ્રકાર</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">પ્રકાર</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">ક્ષેત્રફળ (sq.m)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">દર/sq.m</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">વાર્ષિક ફી (₹)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right text-amber-300">ત્રિમાસિક ફી (₹)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-center">સ્ટેટસ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">રીમાર્ક્સ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredHoardings.map((h, idx) => (
                    <tr key={h.id} className="hover:bg-teal-50/50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-black text-blue-900">{h.hoardingNo}</td>
                      <td className="px-3 py-2 font-bold text-slate-800">{h.agencyName}</td>
                      <td className="px-3 py-2 text-slate-700">
                        <div>{h.location}</div>
                        <div className="text-[10px] text-slate-500">
                          {h.tpNumber} / {h.fpRsNumber} | માલિક: {h.ownerName || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {h.ownershipType === 'SMC' ? (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-2 py-0.5 rounded text-[11px]">
                            સુ.મ.પા. માલિકી
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-slate-300">
                            ખાનગી માલિકી
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-slate-300">
                          {h.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{Number(h.rawArea || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">₹{h.effectiveRate}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-emerald-800">
                        {formatMoney(h.calculatedAnnualFee)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-amber-800">
                        {formatMoney(h.calculatedQuarterlyFee || Math.ceil((h.calculatedAnnualFee || 0) / 4))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            h.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 italic text-[11px]">{h.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                  <tr>
                    <td colSpan={6} className="px-3 py-2.5 text-right font-sans">
                      કુલ સરવાળો (Grand Total):
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-900 font-black">
                      {totalAreaSqM.toFixed(2)} sq.m
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">-</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-900 text-sm font-black">
                      {formatMoney(totalAnnualFeeSum)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-900 text-sm font-black">
                      {formatMoney(totalQuarterlyFeeSum)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* --- REPORT TAB 2: AGENCY SUMMARY REPORT --- */}
        {activeReportTab === 2 && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="px-3 py-2.5 border-b border-slate-800">અનુ.</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">એજન્સી નંબર</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">એજન્સીનું નામ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">જીએસટી નંબર (GSTIN)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">સંપર્ક સભ્ય & ફોન</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-center">કુલ હોર્ડિંગ્સ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">કુલ ક્ષેત્રફળ (sq.m)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">કુલ વાર્ષિક ફી (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {agencies.map((a, idx) => {
                    const agH = filteredHoardings.filter((h) => h.agencyId === a.id || h.agencyName === a.name);
                    const agArea = agH.reduce((sum, h) => sum + (h.rawArea || 0), 0);
                    const agFee = agH.reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);
                    return (
                      <tr key={a.id} className="hover:bg-teal-50/50 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-black text-blue-900">{a.agencyNo}</td>
                        <td className="px-3 py-2 font-extrabold text-slate-900">{a.name}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{a.gstNumber}</td>
                        <td className="px-3 py-2 text-slate-700">
                          <div>{a.contactPerson}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{a.phone}</div>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-black text-blue-900">
                          <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                            {agH.length}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{agArea.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-black text-emerald-800">
                          {formatMoney(agFee)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                  <tr>
                    <td colSpan={5} className="px-3 py-2.5 text-right font-sans">
                      કુલ સરવાળો (Grand Total):
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-blue-950 font-black">{filteredHoardings.length} Nos</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-900 font-black">{totalAreaSqM.toFixed(2)} sq.m</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-900 text-sm font-black">
                      {formatMoney(totalAnnualFeeSum)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* --- REPORT TAB 3: QUARTERLY FEE LEDGER --- */}
        {activeReportTab === 3 && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="px-3 py-2.5 border-b border-slate-800">અનુ.</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">રસીદ નં</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">તારીખ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">હોર્ડિંગ નં</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">એજન્સી</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">નાણાકીય વર્ષ (ગાળો)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">કરપાત્ર રકમ (₹)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">SGST+CGST (18%)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">કુલ પહોંચ રકમ (₹)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-center">સ્ટેટસ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredQuarterlyFees.map((q, idx) => (
                    <tr key={q.id} className="hover:bg-teal-50/50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-black text-blue-900">{q.receiptNo}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{q.receiptDate}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">{q.hoardingNo}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{q.agencyName}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">
                        {q.financialYear} ({q.quarter})
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">{formatMoney(q.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">
                        {formatMoney(q.sgst + q.cgst)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-emerald-800">
                        {formatMoney(q.totalAmount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            q.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {q.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                  <tr>
                    <td colSpan={6} className="px-3 py-2.5 text-right font-sans">
                      કુલ વસૂલાયેલ ત્રિમાસિક ફી (Total Revenue):
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800 font-extrabold">
                      {formatMoney(totalTaxableSum)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700 font-bold">
                      {formatMoney(totalGstSum)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-900 text-sm font-black">
                      {formatMoney(totalAllQuarterlySum)}
                    </td>
                    <td className="px-3 py-2.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* --- REPORT TAB 4: STABILITY CERTIFICATES --- */}
        {activeReportTab === 4 && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="px-3 py-2.5 border-b border-slate-800">અનુ.</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">સર્ટિફિકેટ નં</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">હોર્ડિંગ નં</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">એજન્સીનું નામ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">સ્ટ્રક્ચરલ એન્જિનિયર</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">ઇશ્યુ તારીખ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">માન્ય તારીખ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-center">બાકી દિવસો</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-center">સ્થિતિ / એલર્ટ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCertificates.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-teal-50/50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-black text-blue-900">{c.certificateNo}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">{c.hoardingNo}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{c.agencyName}</td>
                      <td className="px-3 py-2 font-medium text-slate-700">{c.engineerName}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{c.issueDate}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{c.validUntilDate}</td>
                      <td className="px-3 py-2 text-center font-mono font-black">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            c.daysRemaining <= 0
                              ? 'bg-rose-600 text-white'
                              : c.daysRemaining <= 45
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {c.daysRemaining} {lang === 'gu' ? 'દિવસ' : 'days'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            c.isAlertActive
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- REPORT TAB 5: ZONAL REVENUE AUDIT SUMMARY --- */}
        {activeReportTab === 5 && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <span>નવો પુર્વ (સરથાણા) ઝોન-બી નાણાકીય આંકડાકીય સમીક્ષા (Audit Summary)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold block">કુલ સક્રિય લાયસન્સ હોર્ડિંગ્સ</span>
                  <strong className="text-base text-slate-900 font-black">{filteredHoardings.length} નોસ</strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold block">કુલ આવરણ ક્ષેત્રફળ</span>
                  <strong className="text-base text-teal-900 font-black">{totalAreaSqM.toFixed(2)} sq.meters</strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold block">કુલ વાર્ષિક લાયસન્સ ફી ટાર્ગેટ</span>
                  <strong className="text-base text-blue-900 font-black">{formatMoney(totalAnnualFeeSum)}</strong>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-800 font-sans font-semibold block">કુલ વસૂલાયેલ વાસ્તવિક આવક</span>
                  <strong className="text-base text-emerald-950 font-black">{formatMoney(totalPaidRevenue)}</strong>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <span className="text-rose-800 font-sans font-semibold block">કુલ બાકી લાયસન્સ ફી રકમ</span>
                  <strong className="text-base text-rose-950 font-black">{formatMoney(totalPendingFees)}</strong>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="text-amber-800 font-sans font-semibold block">સ્ટેબિલિટી એલર્ટ હોર્ડિંગ્સ</span>
                  <strong className="text-base text-amber-950 font-black">
                    {certificates.filter((c) => c.isAlertActive).length} નોસ
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- REPORT TAB 6: TP SCHEMES SUMMARY REPORT --- */}
        {activeReportTab === 6 && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="px-3 py-2.5 border-b border-slate-800">અનુ.</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">ટી.પી. સ્કીમ નં</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">ટી.પી. સ્કીમનું નામ (ગુજરાતી)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800">વિસ્તાર</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-center">લિંક થયેલ હોર્ડિંગ્સ</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">કુલ ક્ષેત્રફળ (sq.m)</th>
                    <th className="px-3 py-2.5 border-b border-slate-800 text-right">કુલ વાર્ષિક ફી (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tpSchemes.map((tp, idx) => {
                    const tpH = filteredHoardings.filter((h) =>
                      h.tpNumber?.toLowerCase().includes(tp.schemeNo?.toLowerCase()) ||
                      h.tpNumber?.toLowerCase().includes(tp.nameGu?.toLowerCase())
                    );
                    const area = tpH.reduce((sum, h) => sum + (h.rawArea || 0), 0);
                    const fee = tpH.reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);
                    return (
                      <tr key={tp.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono font-black text-indigo-900">
                          {tp.schemeNo ? `સ્કીમ નં. ${tp.schemeNo}` : '-'}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          <div>{tp.nameGu}</div>
                          {tp.nameEn && <div className="text-[10px] text-slate-500 font-mono">{tp.nameEn}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 font-medium">{tp.areaName || '-'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              tpH.length > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {tpH.length} Nos
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{area.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-800">{formatMoney(fee)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OFFICIAL SIGNATURE BLOCK FOR PRINT / REPORT */}
        <div className="pt-8 mt-6 border-t-2 border-dashed border-slate-300 flex justify-between items-end text-xs font-bold text-slate-700">
          <div className="text-center w-48 space-y-8">
            <div className="border-b border-slate-800 h-8"></div>
            <span>તપાસનાર અધિકારીશ્રી ની સહી</span>
          </div>
          <div className="text-center w-48 space-y-8">
            <div className="border-b border-slate-800 h-8"></div>
            <span>હેડ લાયસન્સ ઇન્સ્પેક્ટર</span>
          </div>
          <div className="text-center w-56 space-y-8">
            <div className="border-b border-slate-800 h-8"></div>
            <span>
              ઝોનલ હેડ લાયસન્સ અધિકારી<br />
              નવો પુર્વ (સરથાણા) ઝોન-બી
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
