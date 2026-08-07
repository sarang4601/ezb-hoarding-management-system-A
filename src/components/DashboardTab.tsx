import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Users,
  Tv,
  CheckCircle2,
  XCircle,
  IndianRupee,
  AlertOctagon,
  ShieldAlert,
  Calculator,
  Monitor,
  CalendarCheck,
  Zap,
  MapPin,
  Building2,
  PlusCircle,
  FileSpreadsheet,
  PieChart,
  ArrowUpRight,
  Sparkles,
  Clock,
  AlertTriangle,
  CreditCard,
  ArrowRight,
  Bell,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
  Search,
  Landmark,
  TrendingUp,
  Target,
  ShieldCheck,
  Layers,
  Building,
  BarChart3,
  Award,
} from 'lucide-react';
import { Agency, Hoarding, QuarterlyFee, StabilityCertificate, SystemStats } from '../types';
import { calculateAnnualFee, detectFinancialYear, getHoardingPendingQuartersSummary } from '../utils/calculations';

interface DashboardTabProps {
  stats: SystemStats;
  alerts: StabilityCertificate[];
  hoardings?: Hoarding[];
  agencies?: Agency[];
  quarterlyFees?: QuarterlyFee[];
  lang: 'gu' | 'en';
  onNavigateTab: (tabIndex: number) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  alerts,
  hoardings = [],
  agencies = [],
  quarterlyFees = [],
  lang,
  onNavigateTab,
}) => {
  // Live Rule Calculator State
  const [calcWidth, setCalcWidth] = useState<number>(45.4);
  const [calcLength, setCalcLength] = useState<number>(10);
  const [calcType, setCalcType] = useState<'Single' | 'Computerized'>('Computerized');
  const [calcRate, setCalcRate] = useState<number>(250);
  const [calcPermDate, setCalcPermDate] = useState<string>('2025-05-15');

  const liveCalc = calculateAnnualFee(calcWidth, calcLength, calcType, calcRate);
  const liveFY = detectFinancialYear(calcPermDate);

  // Financial Year Filter State for Quarterly Summary & Expanded Quarter Accordion
  const [summaryFy, setSummaryFy] = useState<string>('2025-26');
  const [expandedQuarter, setExpandedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | null>('Q1');

  // Quick Search & Instant Lookup State
  const [quickSearch, setQuickSearch] = useState<string>('');

  // Total Expected Annual Target Revenue across Active Hoardings
  const totalExpectedTargetFee = hoardings
    .filter((h) => h.status === 'Active')
    .reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);

  const collectionPercentage =
    totalExpectedTargetFee > 0
      ? Math.min(100, Math.round((stats.totalRevenue / totalExpectedTargetFee) * 100))
      : 0;

  // Land / Category Breakdown (Municipal Land vs Private Premises)
  const municipalLandHoardings = hoardings.filter(
    (h) =>
      (h.category || '').toLowerCase().includes('municipal') ||
      (h.location || '').toLowerCase().includes('smc') ||
      (h.location || '').toLowerCase().includes('મહાનગરપાલિકા') ||
      (h.location || '').toLowerCase().includes('કોર્પોરેશન')
  );
  const privateLandHoardings = hoardings.filter((h) => !municipalLandHoardings.includes(h));

  // Quick Search Filtered Results
  const quickSearchResults = quickSearch.trim()
    ? hoardings.filter(
        (h) =>
          h.hoardingNo.toLowerCase().includes(quickSearch.toLowerCase()) ||
          h.agencyName.toLowerCase().includes(quickSearch.toLowerCase()) ||
          h.location.toLowerCase().includes(quickSearch.toLowerCase()) ||
          (h.permitNo || '').toLowerCase().includes(quickSearch.toLowerCase())
      )
    : [];

  // Agency-wise Hoarding Distribution
  const agencySummary = agencies.map((ag) => {
    const agHoardings = hoardings.filter((h) => h.agencyId === ag.id || h.agencyName === ag.name);
    const activeCount = agHoardings.filter((h) => h.status === 'Active').length;
    const totalAnnual = agHoardings
      .filter((h) => h.status === 'Active')
      .reduce((sum, h) => sum + h.calculatedAnnualFee, 0);
    return {
      agency: ag,
      hoardingCount: agHoardings.length,
      activeCount,
      totalAnnual,
    };
  });

  // Active Hoardings List
  const activeHoardingsList = hoardings.filter((h) => h.status === 'Active');

  // Booking Expiry Alerts (Permit / Rent validity expiring within 10-45 days or expired)
  const todayDate = new Date();
  const upcomingBookingExpiries = hoardings
    .filter((h) => h.status === 'Active' && h.permissionDate)
    .map((h) => {
      const permDate = new Date(h.permissionDate);
      const expiryDate = new Date(permDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const diffTime = expiryDate.getTime() - todayDate.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: `bexp-${h.id}`,
        hoardingNo: h.hoardingNo,
        agencyName: h.agencyName,
        location: h.location,
        expiryDateStr: expiryDate.toISOString().split('T')[0],
        daysRemaining,
        isUrgent: daysRemaining <= 10,
        hoardingObj: h,
      };
    })
    .filter((e) => e.daysRemaining <= 45)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const urgentBookingExpiriesCount = upcomingBookingExpiries.filter((e) => e.daysRemaining <= 10).length;

  // Compute per-hoarding pending quarters summary across FYs
  const hoardingPendingSummaries = activeHoardingsList.map((h) =>
    getHoardingPendingQuartersSummary(h, quarterlyFees, '2026-27')
  );

  const hoardingsWithPendingDues = hoardingPendingSummaries.filter((s) => s.hasPendingDues);

  // Agency-wise Pending Alerts for Notification Feed (કઈ એજન્સીની ફી કયા ક્વાર્ટરથી બાકી)
  const agencyDuesAlerts = agencies
    .map((ag) => {
      const agHoardings = activeHoardingsList.filter(
        (h) => h.agencyName === ag.name || h.agencyId === ag.id
      );
      const agSummaries = hoardingPendingSummaries.filter(
        (s) => s.agencyName === ag.name
      );

      const pendingSummaries = agSummaries.filter((s) => s.hasPendingDues);
      const totalPendingHoardings = pendingSummaries.length;

      let earliestFy: string | null = null;
      let earliestQ: string | null = null;
      let earliestLabel = '';
      let totalPendingDues = 0;
      const pendingQuartersSet = new Set<string>();

      pendingSummaries.forEach((s) => {
        totalPendingDues += s.estimatedPendingTotal;

        Object.entries(s.quartersMatrix).forEach(([fy, qMap]) => {
          Object.entries(qMap).forEach(([q, status]) => {
            if (!status.isPaid) {
              pendingQuartersSet.add(`${fy} ${q}`);
              if (!earliestFy || fy < earliestFy || (fy === earliestFy && q < (earliestQ || 'Q9'))) {
                earliestFy = fy;
                earliestQ = q;
                earliestLabel = `FY ${fy} ${q}`;
              }
            }
          });
        });
      });

      return {
        agency: ag,
        totalHoardings: agHoardings.length,
        pendingHoardingsCount: totalPendingHoardings,
        hasPendingDues: totalPendingHoardings > 0,
        firstPendingLabel: earliestLabel ? `FY ${earliestFy} ${earliestQ} થી બાકી` : 'All Paid',
        pendingQuartersList: Array.from(pendingQuartersSet).sort(),
        totalPendingDues,
      };
    })
    .filter((a) => a.hasPendingDues);

  // Quarter-wise Summary per FY for the Quarterly Collection Summary Card
  const quarters: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

  const fyQuarterSummary = quarters.map((q) => {
    // Paid fees for this FY and Quarter
    const qPaidFees = quarterlyFees.filter(
      (f) => f.financialYear === summaryFy && f.quarter === q && f.paymentStatus === 'Paid'
    );
    const totalPaid = qPaidFees.reduce((sum, f) => sum + (f.totalAmount || f.netPaidAmount || 0), 0);

    // Check each agency for this quarter (summaryFy, q)
    const agencyQuarterDetails = agencies.map((ag) => {
      const agHoardings = activeHoardingsList.filter(
        (h) => h.agencyName === ag.name || h.agencyId === ag.id
      );

      // Check paid vs pending hoardings for this agency in this FY & Q
      const paidHoardings = agHoardings.filter((h) =>
        qPaidFees.some((f) => f.hoardingNo === h.hoardingNo || f.hoardingId === h.id)
      );
      const pendingHoardings = agHoardings.filter(
        (h) => !qPaidFees.some((f) => f.hoardingNo === h.hoardingNo || f.hoardingId === h.id)
      );

      // Find earliest pending quarter label for agency if pending
      const agAlert = agencyDuesAlerts.find((a) => a.agency.name === ag.name);

      return {
        agencyName: ag.name,
        gstNumber: ag.gstNumber,
        totalHoardings: agHoardings.length,
        paidCount: paidHoardings.length,
        pendingCount: pendingHoardings.length,
        isFullyPaid: pendingHoardings.length === 0 && agHoardings.length > 0,
        isPending: pendingHoardings.length > 0 && agHoardings.length > 0,
        earliestPendingLabel: agAlert ? agAlert.firstPendingLabel : `FY ${summaryFy} ${q} થી બાકી`,
        pendingHoardingNos: pendingHoardings.map((h) => h.hoardingNo),
      };
    });

    const pendingAgenciesList = agencyQuarterDetails.filter((d) => d.isPending);
    const paidAgenciesList = agencyQuarterDetails.filter((d) => d.isFullyPaid);

    return {
      quarter: q,
      totalPaid,
      paidReceiptsCount: qPaidFees.length,
      pendingAgenciesCount: pendingAgenciesList.length,
      paidAgenciesCount: paidAgenciesList.length,
      pendingAgenciesList,
      paidAgenciesList,
    };
  });

  // Recharts Monthly Revenue Collection vs Target State & Data Calculation
  const [chartFy, setChartFy] = useState<string>('2025-26');

  const monthlyChartData = React.useMemo(() => {
    // 12 Months of standard Financial Year (April to March)
    const fyMonths = [
      { key: '04', nameEn: 'Apr', nameGu: 'એપ્રિલ', monthIdx: 4, quarter: 'Q1' },
      { key: '05', nameEn: 'May', nameGu: 'મે', monthIdx: 5, quarter: 'Q1' },
      { key: '06', nameEn: 'Jun', nameGu: 'જૂન', monthIdx: 6, quarter: 'Q1' },
      { key: '07', nameEn: 'Jul', nameGu: 'જુલાઈ', monthIdx: 7, quarter: 'Q2' },
      { key: '08', nameEn: 'Aug', nameGu: 'ઓગસ્ટ', monthIdx: 8, quarter: 'Q2' },
      { key: '09', nameEn: 'Sep', nameGu: 'સપ્ટેમ્બર', monthIdx: 9, quarter: 'Q2' },
      { key: '10', nameEn: 'Oct', nameGu: 'ઓક્ટોબર', monthIdx: 10, quarter: 'Q3' },
      { key: '11', nameEn: 'Nov', nameGu: 'નવેમ્બર', monthIdx: 11, quarter: 'Q3' },
      { key: '12', nameEn: 'Dec', nameGu: 'ડિસેમ્બર', monthIdx: 12, quarter: 'Q3' },
      { key: '01', nameEn: 'Jan', nameGu: 'જાન્યુઆરી', monthIdx: 1, quarter: 'Q4' },
      { key: '02', nameEn: 'Feb', nameGu: 'ફેબ્રુઆરી', monthIdx: 2, quarter: 'Q4' },
      { key: '03', nameEn: 'Mar', nameGu: 'માર્ચ', monthIdx: 3, quarter: 'Q4' },
    ];

    // Compute annual expected target for active hoardings
    const totalActiveAnnualTarget = hoardings
      .filter((h) => h.status === 'Active')
      .reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0);

    const monthlyTarget = Math.round(totalActiveAnnualTarget / 12);

    // Paid fees for selected chart FY
    const paidFeesForFy = quarterlyFees.filter(
      (f) => f.financialYear === chartFy && f.paymentStatus === 'Paid'
    );

    return fyMonths.map((m) => {
      let monthCollection = 0;

      // Filter receipts that fall into this month
      paidFeesForFy.forEach((f) => {
        let isMatch = false;
        if (f.receiptDate) {
          const parts = f.receiptDate.split('-');
          if (parts.length === 3 && parts[1] === m.key) {
            isMatch = true;
          }
        }
        if (isMatch) {
          monthCollection += f.totalAmount || f.netPaidAmount || 0;
        }
      });

      // If no receipt dates matched directly, distribute fees for this quarter evenly to middle month
      if (paidFeesForFy.length > 0 && monthCollection === 0) {
        const middleMonths = ['05', '08', '11', '02'];
        if (middleMonths.includes(m.key)) {
          const qFees = paidFeesForFy.filter((f) => f.quarter === m.quarter);
          const unmatchedInQuarter = qFees.filter((f) => {
            if (!f.receiptDate) return true;
            const parts = f.receiptDate.split('-');
            return parts.length !== 3 || !['04','05','06','07','08','09','10','11','12','01','02','03'].includes(parts[1]);
          });
          monthCollection += unmatchedInQuarter.reduce((sum, f) => sum + (f.totalAmount || f.netPaidAmount || 0), 0);
        }
      }

      const variance = monthCollection - monthlyTarget;
      const achievementPct = monthlyTarget > 0 ? Math.round((monthCollection / monthlyTarget) * 100) : 0;

      return {
        monthKey: m.key,
        monthLabel: lang === 'gu' ? m.nameGu : m.nameEn,
        quarter: m.quarter,
        target: monthlyTarget,
        collection: monthCollection,
        variance,
        achievementPct,
      };
    });
  }, [quarterlyFees, hoardings, chartFy, lang]);

  // Aggregate Chart KPIs
  const totalFyTarget = monthlyChartData.reduce((sum, d) => sum + d.target, 0);
  const totalFyCollection = monthlyChartData.reduce((sum, d) => sum + d.collection, 0);
  const totalFyAchievementPct = totalFyTarget > 0 ? Math.round((totalFyCollection / totalFyTarget) * 100) : 0;
  const sortedByCollection = [...monthlyChartData].sort((a, b) => b.collection - a.collection);
  const bestMonthItem = sortedByCollection[0];
  const avgMonthlyCollection = Math.round(totalFyCollection / 12);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-md border border-blue-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{lang === 'gu' ? 'મહાનગરપાલિકા હોર્ડિંગ્સ મેનેજમેન્ટ સિસ્ટમ' : 'Municipal Hoarding Management Dashboard'}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            {lang === 'gu' ? 'ડેશબોર્ડ અને રિયલ-ટાઇમ ઓવરવ્યૂ' : 'Executive Overview & Real-time Analytics'}
          </h2>
          <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
            {lang === 'gu'
              ? 'હોર્ડિંગ લાયસન્સ ફી, ત્રિમાસિક હપ્તા વસૂલાત, સ્ટેબિલિટી સર્ટિફિકેટ ૪૫-દિવસ એલર્ટ અને એજન્સી આધારિત વિગતોનું કેન્દ્રિય સંચાલન.'
              : 'Centralized management of outdoor advertising permits, quarterly fee collections, 45-day structural stability alerts, and agency compliance.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab(2)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'gu' ? '+ નવું હોર્ડિંગ' : '+ New Hoarding'}</span>
          </button>
          <button
            onClick={() => onNavigateTab(3)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
          >
            <IndianRupee className="w-4 h-4" />
            <span>{lang === 'gu' ? '+ ફી રસીદ' : '+ Fee Receipt'}</span>
          </button>
          <button
            onClick={() => onNavigateTab(5)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'gu' ? 'રિપોર્ટસ' : 'Reports'}</span>
          </button>
        </div>
      </div>

      {/* Quick Search & Revenue Target Meter Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Search Widget */}
        <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {lang === 'gu' ? 'ઇન્સ્ટન્ટ હોર્ડિંગ / એજન્સી શોધખોળ (Quick Search)' : 'Instant Hoarding & Agency Lookup'}
              </h3>
            </div>
            {quickSearch && (
              <button
                onClick={() => setQuickSearch('')}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                {lang === 'gu' ? 'સાફ કરો' : 'Clear'}
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={
                lang === 'gu'
                  ? 'હોર્ડિંગ નં, એજન્સીનું નામ, લોકેશન અથવા પરવાનગી નં લખો...'
                  : 'Search by Hoarding No, Agency Name, Location, or Permit No...'
              }
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          {quickSearch.trim() && (
            <div className="pt-2 border-t border-slate-100 max-h-52 overflow-y-auto space-y-2">
              {quickSearchResults.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  {lang === 'gu' ? 'કોઈ પરિણામ મળ્યું નથી.' : 'No matching hoardings found.'}
                </p>
              ) : (
                quickSearchResults.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-900 font-mono">{h.hoardingNo}</span>
                        <span
                          className={`px-1.5 py-0.2 text-[10px] rounded font-bold ${
                            h.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {h.status}
                        </span>
                        <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-semibold border border-purple-200">
                          {h.hoardingType}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px] font-medium">🏢 {h.agencyName}</p>
                      <p className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[240px]">{h.location}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="font-mono font-black text-slate-800 text-xs block">
                        ₹{h.calculatedAnnualFee.toLocaleString('en-IN')}/yr
                      </span>
                      <button
                        onClick={() => onNavigateTab(2)}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition-colors"
                      >
                        {lang === 'gu' ? 'જુઓ' : 'View'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Annual Target Revenue Collection Progress Bar */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white p-4 rounded-2xl border border-emerald-500/30 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-emerald-100">
                {lang === 'gu' ? 'વાર્ષિક ફી વસૂલાત ટાર્ગેટ ઓવરવ્યૂ' : 'Annual Fee Target Collection'}
              </h3>
            </div>
            <span className="bg-emerald-500 text-slate-950 font-mono text-xs px-2.5 py-0.5 rounded-full font-black">
              {collectionPercentage}% {lang === 'gu' ? 'પૂર્ણ' : 'Achieved'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs font-mono">
              <span className="text-emerald-200">
                {lang === 'gu' ? 'વસૂલાયેલ:' : 'Collected:'}
                <strong className="text-white text-sm font-black ml-1">
                  ₹{stats.totalRevenue.toLocaleString('en-IN')}
                </strong>
              </span>
              <span className="text-slate-300">
                {lang === 'gu' ? 'કુલ ટાર્ગેટ:' : 'Target:'}
                <strong className="text-amber-300 font-extrabold ml-1">
                  ₹{totalExpectedTargetFee.toLocaleString('en-IN')}
                </strong>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-emerald-500/30">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${Math.max(collectionPercentage, 5)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-emerald-200/80 pt-0.5">
              <span>{lang === 'gu' ? 'વર્તમાન નાણાકીય વર્ષ ૨૦૨૫-૨૬' : 'Current FY 2025-26 Target'}</span>
              <span>
                {lang === 'gu' ? 'બાકી લક્ષ્યાંક:' : 'Remaining:'} ₹
                {Math.max(0, totalExpectedTargetFee - stats.totalRevenue).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Cards Grid (Total, Booked, Available, Pending Payments, Total Revenue) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Hoardings */}
        <div
          onClick={() => onNavigateTab(2)}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'gu' ? 'કુલ હોર્ડિંગ્સ' : 'Total Hoardings'}
            </p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Tv className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-slate-900">{stats.totalHoardings}</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>{lang === 'gu' ? 'તમામ હોર્ડિંગ્સ જુઓ' : 'View All Hoardings'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>

        {/* Card 2: Booked / Active Hoardings */}
        <div
          onClick={() => onNavigateTab(2)}
          className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group bg-gradient-to-b from-white to-emerald-50/30"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {lang === 'gu' ? 'બુક થયેલ / સક્રિય' : 'Booked Hoardings'}
            </p>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-emerald-900">{stats.activeHoardings}</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {lang === 'gu' ? 'સક્રિય ભાડૂઆત કવરેજ' : 'Active Active Leases'}
            </p>
          </div>
        </div>

        {/* Card 3: Available / Vacant / Cancelled Hoardings */}
        <div
          onClick={() => onNavigateTab(2)}
          className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group bg-gradient-to-b from-white to-amber-50/30"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              {lang === 'gu' ? 'ઉપલબ્ધ / ખાલી હોર્ડિંગ્સ' : 'Available Hoardings'}
            </p>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-amber-900">
              {Math.max(0, stats.totalHoardings - stats.activeHoardings)}
            </p>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              {lang === 'gu' ? 'નવી બુકિંગ માટે ખાલી' : 'Vacant / Ready to Rent'}
            </p>
          </div>
        </div>

        {/* Card 4: Pending Payments Notification */}
        <div
          onClick={() => onNavigateTab(3)}
          className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group bg-gradient-to-b from-white to-rose-50/30"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              {lang === 'gu' ? 'પેમેન્ટ બાકી રકમ' : 'Pending Payments'}
            </p>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-rose-900">
              ₹{stats.pendingFees.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-rose-700 font-medium mt-1">
              {hoardingsWithPendingDues.length} {lang === 'gu' ? 'હોર્ડિંગ્સની ફી બાકી' : 'hoardings pending'}
            </p>
          </div>
        </div>

        {/* Card 5: Total Revenue Collected */}
        <div
          onClick={() => onNavigateTab(3)}
          className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              {lang === 'gu' ? 'વસૂલાયેલી કુલ ફી' : 'Total Revenue'}
            </p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-indigo-900">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>{lang === 'gu' ? 'ત્રિમાસિક રસીદો' : 'Fee Receipts'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </div>

      {/* Recharts Visual Dashboard Summary: Monthly Revenue Collection vs Targets Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'gu'
                  ? 'રીઅલ-ટાઇમ માસિક ફી વસૂલાત અને લક્ષ્યાંક ચાર્ટ'
                  : 'Real-time Monthly Revenue vs Target Chart'}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {lang === 'gu'
                ? 'નાણાકીય વર્ષ વાઇઝ માસિક આવક વસૂલાત વિરૂદ્ધ લક્ષ્યાંક વિશ્લેષણ'
                : 'Monthly Revenue Collection vs Target Analysis'}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {lang === 'gu'
                ? 'દરેક મહિનાની એકત્રિત ફી (Actual Collection) અને નિર્ધારિત લક્ષ્યાંક (Monthly Target) ની સરખામણી'
                : 'Monthly fee collections compared against expected target benchmarks for selected Financial Year.'}
            </p>
          </div>

          {/* Financial Year Selector & Target Summary Badges */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'gu' ? 'નાણાકીય વર્ષ:' : 'Select FY:'}
              </span>
              <select
                value={chartFy}
                onChange={(e) => setChartFy(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1 font-mono font-extrabold text-xs text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                <option value="2024-25">2024-25</option>
                <option value="2025-26">2025-26</option>
                <option value="2026-27">2026-27</option>
              </select>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
              <Award className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] text-emerald-700 font-semibold block uppercase">
                  {lang === 'gu' ? 'સિદ્ધિ દર' : 'Achievement'}
                </span>
                <span className="font-mono font-black text-emerald-950 text-xs">
                  {totalFyAchievementPct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl space-y-1">
            <span className="text-[11px] text-blue-700 font-sans font-semibold block">
              {lang === 'gu' ? 'કુલ વાર્ષિક લક્ષ્યાંક:' : 'Annual Target:'}
            </span>
            <span className="font-black text-blue-950 text-sm md:text-base">
              ₹{totalFyTarget.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-blue-600 font-sans block">
              (₹{Math.round(totalFyTarget / 12).toLocaleString('en-IN')}/{lang === 'gu' ? 'મહિનો' : 'mo'})
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-1">
            <span className="text-[11px] text-emerald-700 font-sans font-semibold block">
              {lang === 'gu' ? 'એકત્રિત કુલ ફી:' : 'Total Collected:'}
            </span>
            <span className="font-black text-emerald-950 text-sm md:text-base">
              ₹{totalFyCollection.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-600 font-sans block font-semibold">
              FY {chartFy} {lang === 'gu' ? 'જમા રકમ' : 'Received'}
            </span>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl space-y-1">
            <span className="text-[11px] text-indigo-700 font-sans font-semibold block">
              {lang === 'gu' ? 'સૌથી વધુ આવક મહિનો:' : 'Best Collection Month:'}
            </span>
            <span className="font-black text-indigo-950 text-sm">
              {bestMonthItem ? bestMonthItem.monthLabel : '-'}
            </span>
            <span className="text-[10px] text-indigo-600 font-sans block">
              ₹{bestMonthItem ? bestMonthItem.collection.toLocaleString('en-IN') : 0}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-600 font-sans font-semibold block">
              {lang === 'gu' ? 'સરેરાશ માસિક વસૂલાત:' : 'Avg Monthly Revenue:'}
            </span>
            <span className="font-black text-slate-900 text-sm">
              ₹{avgMonthlyCollection.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 font-sans block">
              {lang === 'gu' ? 'દર મહિને સરેરાશ' : 'per month average'}
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="h-72 sm:h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyChartData}
              margin={{ top: 15, right: 15, left: 15, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                tickFormatter={(value) =>
                  value >= 100000
                    ? `₹${(value / 100000).toFixed(1)}L`
                    : value >= 1000
                    ? `₹${(value / 1000).toFixed(0)}k`
                    : `₹${value}`
                }
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isAhead = data.variance >= 0;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 font-sans">
                        <p className="font-black text-amber-400 border-b border-slate-700 pb-1 flex items-center justify-between gap-3">
                          <span>{label} (FY {chartFy})</span>
                          <span className="text-[10px] text-slate-300 font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                            {data.quarter}
                          </span>
                        </p>
                        <div className="space-y-1 font-mono pt-1">
                          <p className="flex justify-between gap-4 text-emerald-400">
                            <span>{lang === 'gu' ? 'એકત્રિત આવક:' : 'Collected:'}</span>
                            <strong>₹{data.collection.toLocaleString('en-IN')}</strong>
                          </p>
                          <p className="flex justify-between gap-4 text-blue-300">
                            <span>{lang === 'gu' ? 'માસિક લક્ષ્યાંક:' : 'Target:'}</span>
                            <strong>₹{data.target.toLocaleString('en-IN')}</strong>
                          </p>
                          <p className={`flex justify-between gap-4 pt-1 border-t border-slate-800 font-bold ${isAhead ? 'text-emerald-300' : 'text-rose-300'}`}>
                            <span>{lang === 'gu' ? (isAhead ? 'તફાવત (વધારો):' : 'તફાવત (ઘટાડો):') : (isAhead ? 'Surplus:' : 'Shortfall:')}</span>
                            <span>{isAhead ? '+' : ''}₹{data.variance.toLocaleString('en-IN')} ({data.achievementPct}%)</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
              />
              <Bar
                dataKey="collection"
                name={lang === 'gu' ? 'એકત્રિત આવક (Actual Collection)' : 'Actual Collection'}
                fill="#059669"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="target"
                name={lang === 'gu' ? 'માસિક લક્ષ્યાંક (Monthly Target)' : 'Monthly Target'}
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agency-Wise Quarterly License Fee Pending Notifications Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-amber-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm md:text-base text-amber-200">
                  {lang === 'gu'
                    ? 'એજન્સી વાઈઝ ક્વાર્ટરલી બાકી ફી એલર્ટ નોટિફિકેશન'
                    : 'Agency Quarterly License Fee Pending Alerts'}
                </h3>
                <span className="bg-rose-600 text-white font-mono text-xs px-2.5 py-0.5 rounded-full font-black">
                  {agencyDuesAlerts.length} {lang === 'gu' ? 'એજન્સીઓ બાકી' : 'Agencies Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'gu'
                  ? 'કઈ એજન્સીની લાયસન્સ ફી કયા ક્વાર્ટરથી અને કયા નાણાકીય વર્ષથી બાકી છે તેનું સ્વચાલિત નોટિફિકેશન.'
                  : 'Automated notification tracking which agency has pending license fee starting from which quarter and FY.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab(3)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            <span>{lang === 'gu' ? 'ત્રિમાસિક ફી ચૂકવણીઓ →' : 'Pay Fees →'}</span>
          </button>
        </div>

        {agencyDuesAlerts.length === 0 ? (
          <div className="bg-slate-900/60 rounded-xl p-4 text-center text-xs text-emerald-400 border border-emerald-500/20 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>
              {lang === 'gu'
                ? 'અભિનંદન! તમામ એજન્સીઓની ત્રિમાસિક ફી સમયસર ચૂકવાયેલ છે.'
                : 'All agencies have paid their quarterly license fees up to date.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agencyDuesAlerts.map((alertItem) => (
              <div
                key={alertItem.agency.id}
                className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3.5 space-y-2 hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-xs md:text-sm font-sans">
                      🏢 {alertItem.agency.name}
                    </span>
                    <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                      {alertItem.pendingHoardingsCount} {lang === 'gu' ? 'હોર્ડિંગ બાકી' : 'hoardings'}
                    </span>
                  </div>

                  <div className="bg-rose-950/60 border border-rose-800/60 p-2 rounded-lg space-y-1">
                    <p className="text-xs font-bold text-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{alertItem.firstPendingLabel}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {alertItem.pendingQuartersList.map((qLabel) => (
                        <span
                          key={qLabel}
                          className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                        >
                          {qLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{lang === 'gu' ? 'અંદાજિત બાકી ફી:' : 'Est. Dues:'}</span>
                    <span className="font-mono font-black text-rose-400 text-xs md:text-sm">
                      ₹{alertItem.totalPendingDues.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigateTab(3)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <span>{lang === 'gu' ? 'ફી ભરો' : 'Pay'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Agency Distribution & Quarterly Fee Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agency Wise Distribution Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                {lang === 'gu' ? 'એજન્સી વાઈઝ હોર્ડિંગ્સ વિતરણ' : 'Agency-wise Hoarding Distribution'}
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab(1)}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {lang === 'gu' ? 'વિગતો જુઓ →' : 'View Details →'}
            </button>
          </div>

          <div className="space-y-3">
            {agencySummary.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {lang === 'gu' ? 'કોઈ એજન્સી ડેટા મળ્યો નથી.' : 'No agency data found.'}
              </p>
            ) : (
              agencySummary.map((item) => {
                const totalH = stats.totalHoardings || 1;
                const percentage = Math.round((item.hoardingCount / totalH) * 100);
                return (
                  <div key={item.agency.id} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{item.agency.name}</span>
                      <span className="font-mono text-slate-600">
                        {item.hoardingCount} {lang === 'gu' ? 'હોર્ડિંગ્સ' : 'hoardings'} ({item.activeCount} {lang === 'gu' ? 'એક્ટિવ' : 'Active'})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 10)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-0.5">
                      <span>GST: {item.agency.gstNumber || '-'}</span>
                      <span className="font-bold text-slate-700">
                        {lang === 'gu' ? 'વાર્ષિક ફી:' : 'Annual Fee:'} ₹{item.totalAnnual.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Land / Premises Type Breakdown Summary Badge */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-sans font-bold">
                <Landmark className="w-4 h-4 text-amber-700" />
                <span>{lang === 'gu' ? 'મહાનગરપાલિકા જમીન / જગ્યા' : 'Municipal Premises'}</span>
              </div>
              <p className="text-base font-black text-amber-950">
                {municipalLandHoardings.length} {lang === 'gu' ? 'હોર્ડિંગ્સ' : 'Hoardings'}
              </p>
              <p className="text-[11px] text-amber-800 font-sans font-medium">
                {lang === 'gu' ? 'વાર્ષિક ફી:' : 'Annual Fee:'} ₹
                {municipalLandHoardings
                  .reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0)
                  .toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-indigo-50/80 border border-indigo-200 p-2.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-900 font-sans font-bold">
                <Building className="w-4 h-4 text-indigo-700" />
                <span>{lang === 'gu' ? 'ખાનગી મિલકત / પ્રાઇવેટ' : 'Private Premises'}</span>
              </div>
              <p className="text-base font-black text-indigo-950">
                {privateLandHoardings.length} {lang === 'gu' ? 'હોર્ડિંગ્સ' : 'Hoardings'}
              </p>
              <p className="text-[11px] text-indigo-800 font-sans font-medium">
                {lang === 'gu' ? 'વાર્ષિક ફી:' : 'Annual Fee:'} ₹
                {privateLandHoardings
                  .reduce((sum, h) => sum + (h.calculatedAnnualFee || 0), 0)
                  .toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Quarterly Fee Collection Overview Card with FY Selector & Quarter-wise Agency Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                  {lang === 'gu'
                    ? 'ત્રિમાસિક લાયસન્સ ફી વસૂલાત સમરી (નાણાકીય વર્ષ & એજન્સી વાઈઝ)'
                    : 'Quarterly License Fee Collection Summary (FY & Agency-wise)'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'gu'
                    ? 'નાણાકીય વર્ષ અને દરેક ક્વાર્ટર (Q1-Q4) વાઈઝ ચૂકવાયેલ અને બાકી એજન્સીઓની યાદી'
                    : 'Quarter-wise paid and pending agencies list per financial year'}
                </p>
              </div>
            </div>

            {/* Financial Year Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 shrink-0">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'gu' ? 'નાણાકીય વર્ષ:' : 'FY:'}
              </span>
              <select
                value={summaryFy}
                onChange={(e) => setSummaryFy(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 font-mono font-bold text-xs text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="2024-25">2024-25 (ગત નાણાકીય વર્ષ)</option>
                <option value="2025-26">2025-26 (વર્તમાન વર્ષ)</option>
                <option value="2026-27">2026-27 (આગામી વર્ષ)</option>
              </select>
            </div>
          </div>

          {/* Quarter Cards Grid for Selected FY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {fyQuarterSummary.map((q) => {
              const isExpanded = expandedQuarter === q.quarter;

              return (
                <div
                  key={q.quarter}
                  className={`border rounded-xl p-3.5 transition-all space-y-2.5 ${
                    q.pendingAgenciesCount > 0
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-emerald-50/30 border-emerald-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="bg-indigo-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-md shadow-xs">
                      FY {summaryFy} — {q.quarter}
                    </span>
                    <button
                      onClick={() => setExpandedQuarter(isExpanded ? null : q.quarter)}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs"
                    >
                      <span>
                        {isExpanded
                          ? lang === 'gu'
                            ? 'સંકુચિત કરો'
                            : 'Hide Agencies'
                          : lang === 'gu'
                          ? 'એજન્સીઓ જુઓ'
                          : 'Show Agencies'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">
                        {lang === 'gu' ? 'વસૂલાયેલ આવક:' : 'Collected:'}
                      </span>
                      <span className="font-black text-emerald-700 text-sm">
                        ₹{q.totalPaid.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-sans">
                        ({q.paidReceiptsCount} {lang === 'gu' ? 'રસીદો' : 'receipts'})
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">
                        {lang === 'gu' ? 'બાકી લાયસન્સ ફી:' : 'Pending Dues:'}
                      </span>
                      {q.pendingAgenciesCount > 0 ? (
                        <span className="font-extrabold text-rose-700 text-xs block font-sans">
                          ⚠️ {q.pendingAgenciesCount} {lang === 'gu' ? 'એજન્સીઓ બાકી' : 'agencies pending'}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 text-xs block font-sans">
                          ✅ તમામ ચૂકવેલ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quarter-Wise Agency Names List (Expanded or Always visible summary) */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs">
                    {/* Pending Agencies for this Quarter */}
                    {q.pendingAgenciesList.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-bold text-rose-800 text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>
                            {lang === 'gu'
                              ? `બાકી ફી ધરાવતી એજન્સીઓ (${q.pendingAgenciesList.length}):`
                              : `Pending Agencies (${q.pendingAgenciesList.length}):`}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {q.pendingAgenciesList.map((agDetail) => (
                            <span
                              key={agDetail.agencyName}
                              className="bg-rose-100 text-rose-950 border border-rose-300 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                              title={`Hoardings: ${agDetail.pendingHoardingNos.join(', ')}`}
                            >
                              <span>{agDetail.agencyName}</span>
                              <span className="text-[10px] text-rose-700 font-normal font-mono">
                                ({agDetail.pendingCount} {lang === 'gu' ? 'બાકી' : 'pending'})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Paid Agencies for this Quarter */}
                    {q.paidAgenciesList.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {lang === 'gu'
                              ? `પૂર્ણ ચૂકવેલ એજન્સીઓ (${q.paidAgenciesList.length}):`
                              : `Paid Agencies (${q.paidAgenciesList.length}):`}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {q.paidAgenciesList.map((agDetail) => (
                            <span
                              key={agDetail.agencyName}
                              className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                            >
                              <span>{agDetail.agencyName}</span>
                              <span className="text-[10px] text-emerald-700 font-mono">✓</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Quarter Expanded Info */}
                    {isExpanded && q.pendingAgenciesList.length > 0 && (
                      <div className="bg-white p-2.5 rounded-lg border border-rose-200 mt-2 space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-800">
                          {lang === 'gu' ? 'બાકી ફી વિગતો (Starting Pending Point):' : 'Pending Details:'}
                        </p>
                        <ul className="space-y-1 text-[11px] text-slate-700 divide-y divide-slate-100">
                          {q.pendingAgenciesList.map((agDetail) => (
                            <li key={agDetail.agencyName} className="pt-1 flex items-center justify-between">
                              <div>
                                <strong className="text-slate-900">{agDetail.agencyName}</strong>
                                <span className="text-slate-500 text-[10px] block">
                                  {lang === 'gu' ? 'શરૂઆતનો બાકી ક્વાર્ટર:' : 'Pending starting:'}{' '}
                                  <span className="font-bold text-amber-700">{agDetail.earliestPendingLabel}</span>
                                </span>
                              </div>
                              <button
                                onClick={() => onNavigateTab(3)}
                                className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-500 transition-colors shrink-0"
                              >
                                {lang === 'gu' ? '+ રસીદ' : '+ Receipt'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex justify-between items-center font-mono">
            <span>{lang === 'gu' ? 'કુલ વસૂલાયેલ વાર્ષિક આવક:' : 'Total Collected Annual Revenue:'}</span>
            <span className="font-black text-sm text-emerald-800">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Pending Fees Tracker by FY & Quarter Card */}
      <div className="bg-white rounded-xl border border-amber-300 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-sm md:text-base">
            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>
              {lang === 'gu'
                ? 'નાણાકીય વર્ષ & ક્વાર્ટર મુજબ બાકી લાયસન્સ ફી ટ્રેકર'
                : 'Outstanding License Fees Tracker by FY & Quarter'}
            </span>
            <span className="bg-amber-500 text-slate-950 font-mono text-xs px-2 py-0.5 rounded-full font-black">
              {hoardingsWithPendingDues.length} {lang === 'gu' ? 'હોર્ડિંગ્સ બાકી' : 'Hoardings Pending'}
            </span>
          </div>

          <button
            onClick={() => onNavigateTab(3)}
            className="text-xs font-semibold text-amber-300 hover:text-white underline flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>{lang === 'gu' ? 'ત્રિમાસિક રસીદો વિભાગમાં જાઓ →' : 'Go to Fee Receipts →'}</span>
          </button>
        </div>

        <div className="p-4">
          {hoardingsWithPendingDues.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              {lang === 'gu'
                ? 'અભિનંદન! તમામ હોર્ડિંગ્સની ત્રિમાસિક ફી સમયસર ચૂકવાઈ ગઈ છે.'
                : 'All hoardings have paid their quarterly fees up to date.'}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-2">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-amber-800 font-medium">
                      {lang === 'gu' ? 'બાકી લાયસન્સ હોર્ડિંગ્સ' : 'Pending Fee Hoardings'}
                    </p>
                    <p className="text-lg font-black text-amber-950 font-mono mt-0.5">
                      {hoardingsWithPendingDues.length} / {activeHoardingsList.length}
                    </p>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 font-medium">
                      {lang === 'gu' ? 'કુલ બાકી ક્વાર્ટસ (હપ્તા)' : 'Total Pending Quarters'}
                    </p>
                    <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {hoardingPendingSummaries.reduce((sum, s) => sum + s.totalPendingQuartersCount, 0)}{' '}
                      {lang === 'gu' ? 'ક્વાર્ટસ' : 'Quarters'}
                    </p>
                  </div>
                  <Clock className="w-6 h-6 text-slate-500" />
                </div>

                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-rose-800 font-medium">
                      {lang === 'gu' ? 'અંદાજિત કુલ બાકી રકમ' : 'Estimated Total Dues'}
                    </p>
                    <p className="text-lg font-black text-rose-950 font-mono mt-0.5">
                      ₹
                      {hoardingPendingSummaries
                        .reduce((sum, s) => sum + s.estimatedPendingTotal, 0)
                        .toLocaleString('en-IN')}
                    </p>
                  </div>
                  <IndianRupee className="w-6 h-6 text-rose-600" />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">{lang === 'gu' ? 'હોર્ડિંગ & એજન્સી' : 'Hoarding & Agency'}</th>
                      <th className="px-3 py-2.5">{lang === 'gu' ? 'લોકેશન' : 'Location'}</th>
                      <th className="px-3 py-2.5">{lang === 'gu' ? 'કયા વર્ષ / ક્વાર્ટરથી બાકી?' : 'Pending Starting From'}</th>
                      <th className="px-3 py-2.5">{lang === 'gu' ? 'બાકી ક્વાર્ટસ યાદી' : 'Pending Quarters'}</th>
                      <th className="px-3 py-2.5 text-right">{lang === 'gu' ? 'અંદાજિત બાકી ફી' : 'Est. Amount'}</th>
                      <th className="px-3 py-2.5 text-center">{lang === 'gu' ? 'એક્શન' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hoardingsWithPendingDues.map((summary) => {
                      // Collect list of pending quarters e.g. ["2025-26 Q1", "2025-26 Q2"]
                      const pendingList: string[] = [];
                      Object.entries(summary.quartersMatrix).forEach(([fy, qMap]) => {
                        Object.entries(qMap).forEach(([q, status]) => {
                          if (!status.isPaid) {
                            pendingList.push(`${fy} ${q}`);
                          }
                        });
                      });

                      return (
                        <tr key={summary.hoardingId} className="hover:bg-amber-50/50 transition-colors">
                          <td className="px-3 py-2.5 font-medium">
                            <div className="font-bold font-mono text-slate-900">{summary.hoardingNo}</div>
                            <div className="text-[11px] text-slate-500">{summary.agencyName}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[180px]">{summary.location || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-extrabold text-xs px-2.5 py-1 rounded-md border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              {summary.firstPendingLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {pendingList.map((item) => (
                                <span
                                  key={item}
                                  className="bg-rose-100 text-rose-800 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border border-rose-200"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold text-rose-700">
                            ₹{summary.estimatedPendingTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => onNavigateTab(3)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 mx-auto"
                            >
                              <span>{lang === 'gu' ? 'ફી ભરો' : 'Pay Fee'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Expiry Alerts Feed (Upcoming 10-45 Days License / Rent Renewal Alerts) */}
      <div className="bg-white rounded-xl border border-amber-300 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-sm md:text-base">
            <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
            <span>
              {lang === 'gu'
                ? 'એપાયરી એલર્ટ - આગામી ૧૦ દિવસમાં ભાડું / પરમિશન રિન્યુઅલ (Booking Expiry Alerts)'
                : 'Booking & Permit Expiry Alerts (Upcoming 10-45 Days)'}
            </span>
            {urgentBookingExpiriesCount > 0 && (
              <span className="bg-rose-600 text-white text-xs px-2.5 py-0.5 rounded-full font-black animate-pulse">
                {urgentBookingExpiriesCount} {lang === 'gu' ? 'તાત્કાલિક રિન્યુઅલ' : 'Urgent Expiring'}
              </span>
            )}
            <span className="bg-amber-500 text-slate-950 font-mono text-xs px-2 py-0.5 rounded-full font-black">
              {upcomingBookingExpiries.length} {lang === 'gu' ? 'કુલ એલર્ટ' : 'Total Alerts'}
            </span>
          </div>

          <button
            onClick={() => onNavigateTab(2)}
            className="text-xs font-semibold text-amber-300 hover:text-white underline flex items-center gap-1.5"
          >
            <span>{lang === 'gu' ? 'હોર્ડિંગ્સ રજીસ્ટરમાં જુઓ →' : 'View in Hoarding Register →'}</span>
          </button>
        </div>

        <div className="p-4">
          {upcomingBookingExpiries.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              {lang === 'gu'
                ? 'સરસ! આગામી ૪૫ દિવસમાં કોઈપણ હોર્ડિંગનું ભાડું અથવા લાયસન્સ પૂરું થતું નથી.'
                : 'Great! No hoarding bookings or permits expiring within the next 45 days.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingBookingExpiries.map((item) => (
                <div
                  key={item.id}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 rounded-lg transition-colors ${
                    item.isUrgent ? 'bg-rose-50/70 border border-rose-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm">{item.hoardingNo}</span>
                      <span className="text-xs text-slate-600 font-semibold">({item.agencyName})</span>
                    </div>
                    <p className="text-xs text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{item.location}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {lang === 'gu' ? 'એક્સપાયરી તારીખ:' : 'Permit Expiry Date:'}{' '}
                      <strong className="text-slate-800 font-mono">{item.expiryDateStr}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div>
                      {item.daysRemaining < 0 ? (
                        <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-md shadow-xs">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          {lang === 'gu'
                            ? `એક્સપાયર થઈ ગયું (${Math.abs(item.daysRemaining)} દિવસ પહેલા)`
                            : `Expired (${Math.abs(item.daysRemaining)} days ago)`}
                        </span>
                      ) : item.isUrgent ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 text-xs font-black px-2.5 py-1 rounded-md border border-rose-300 animate-pulse">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                          {lang === 'gu'
                            ? `માત્ર ${item.daysRemaining} દિવસ બાકી!`
                            : `Only ${item.daysRemaining} Days Left!`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          {lang === 'gu'
                            ? `${item.daysRemaining} દિવસ બાકી`
                            : `${item.daysRemaining} Days Remaining`}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onNavigateTab(2)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                    >
                      {lang === 'gu' ? 'રિન્યુ કરો' : 'Renew Booking'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 45-Day Stability Certificate Alert Feed */}
      <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
        <div className="bg-red-50 border-b border-red-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm md:text-base">
            <ShieldAlert className="w-5 h-5 text-red-600 animate-bounce" />
            <span>
              {lang === 'gu'
                ? 'સ્ટેબિલિટી સર્ટિફિકેટ ૪૫-દિવસ એલર્ટ સિસ્ટમ'
                : 'Stability Certificate 45-Day Expiry Alert System'}
            </span>
            <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-extrabold">
              {stats.stabilityAlertsCount}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab(4)}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline flex items-center gap-1"
          >
            {lang === 'gu' ? 'તમામ સર્ટિફિકેટ્સ જુઓ →' : 'View All Certificates →'}
          </button>
        </div>

        <div className="p-4">
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              {lang === 'gu'
                ? 'સરસ! આગામી ૪૫ દિવસમાં કોઈપણ સર્ટિફિકેટ એક્સપાયર થતું નથી.'
                : 'Great! No stability certificates expiring within the next 45 days.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((cert) => {
                const hoardingObj = hoardings.find((h) => h.id === cert.hoardingId);
                const displayLocation = cert.location || (hoardingObj ? hoardingObj.location : '');

                return (
                  <div
                    key={cert.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm font-mono">{cert.hoardingNo}</span>
                        <span className="text-xs text-slate-500">({cert.agencyName})</span>
                      </div>
                      <p className="text-xs text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium">{displayLocation || 'N/A'}</span>
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>{lang === 'gu' ? 'સર્ટિફિકેટ નં:' : 'Cert No:'}</strong> {cert.certificateNo} |{' '}
                        <strong>{lang === 'gu' ? 'ઇજનેર:' : 'Engineer:'}</strong> {cert.engineerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {lang === 'gu' ? 'વેલિડ તારીખ:' : 'Valid Until:'}{' '}
                        <span className="font-semibold text-slate-700">{cert.validUntilDate}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {cert.daysRemaining < 0 ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-extrabold px-2.5 py-1 rounded-md border border-red-300">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            {lang === 'gu'
                              ? `એક્સપાયર થઇ ગયું (${Math.abs(cert.daysRemaining)} દિવસ પહેલા)`
                              : `Expired (${Math.abs(cert.daysRemaining)} days ago)`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-300">
                            <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
                            {lang === 'gu'
                              ? `માત્ર ${cert.daysRemaining} દિવસ બાકી`
                              : `Only ${cert.daysRemaining} Days Left`}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onNavigateTab(4)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-xs transition-colors"
                      >
                        {lang === 'gu' ? 'નવીનીકરણ' : 'Renew'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Business Rules & Calculation Engine Tester Widget */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-lg border border-slate-700">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-slate-100">
              {lang === 'gu'
                ? 'બિઝનેસ લોજિક ગણતરી ટેસ્ટર (Business Rules & Fee Calculator)'
                : 'Business Rules & Fee Calculation Engine Tester'}
            </h3>
          </div>
          <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30 font-mono">
            Math.ceil() Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 items-center">
          {/* Inputs */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {lang === 'gu' ? 'પહોળાઈ (Width in m):' : 'Width (meters):'}
              </label>
              <input
                type="number"
                step="0.1"
                value={calcWidth}
                onChange={(e) => setCalcWidth(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {lang === 'gu' ? 'લંબાઈ (Length in m):' : 'Length (meters):'}
              </label>
              <input
                type="number"
                step="0.1"
                value={calcLength}
                onChange={(e) => setCalcLength(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {lang === 'gu' ? 'હોર્ડિંગ ટાઈપ:' : 'Hoarding Type:'}
              </label>
              <select
                value={calcType}
                onChange={(e) => setCalcType(e.target.value as 'Single' | 'Computerized')}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white font-semibold focus:ring-1 focus:ring-blue-400 focus:outline-none"
              >
                <option value="Single">{lang === 'gu' ? 'સિંગલ (Single)' : 'Single'}</option>
                <option value="Computerized">{lang === 'gu' ? 'કોમ્પ્યુટરાઈઝ્ડ (Computerized 2x)' : 'Computerized (2x Rate)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {lang === 'gu' ? 'બેઝ રેટ (₹/sq.m):' : 'Base Rate (₹/sq.m):'}
              </label>
              <input
                type="number"
                value={calcRate}
                onChange={(e) => setCalcRate(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">
                {lang === 'gu' ? 'પરમિશન તારીખ (Permission Date for Auto-FY):' : 'Permission Date (Auto-detect FY):'}
              </label>
              <input
                type="date"
                value={calcPermDate}
                onChange={(e) => setCalcPermDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Results Box */}
          <div className="lg:col-span-5 bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center text-blue-300 bg-blue-500/10 p-1.5 rounded border border-blue-500/20">
              <span className="font-sans">{lang === 'gu' ? 'કાચું ક્ષેત્રફળ (Raw Area - No roundup):' : 'Raw Area (No roundup):'}</span>
              <span className="font-bold text-slate-100">{liveCalc.rawArea.toFixed(2)} sq.m</span>
            </div>

            <div className="flex justify-between items-center text-purple-300 bg-purple-500/10 p-1.5 rounded border border-purple-500/20">
              <span className="font-sans">{lang === 'gu' ? 'લાગુ પડેલ દર (Effective Rate):' : 'Effective Rate:'}</span>
              <span className="font-bold">
                ₹{liveCalc.effectiveRate}/sq.m {calcType === 'Computerized' && '(2x Applied)'}
              </span>
            </div>

            <div className="flex justify-between items-center text-emerald-300 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
              <span className="font-sans font-bold">{lang === 'gu' ? 'વાર્ષિક ફી (Math.ceil):' : 'Calculated Annual Fee:'}</span>
              <span className="font-extrabold text-sm">₹{liveCalc.annualFee.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
              <span className="flex items-center gap-1 font-sans font-bold">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'gu' ? 'ત્રિમાસીક લાયસન્સ ફી (Quarterly Fee):' : 'Quarterly License Fee:'}
              </span>
              <span className="font-extrabold text-sm">₹{liveCalc.quarterlyFee.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300 bg-slate-700/40 p-1.5 rounded border border-slate-600/30">
              <span className="flex items-center gap-1 font-sans">
                <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                {lang === 'gu' ? 'ઓટો-નાણાકીય વર્ષ (Auto-FY):' : 'Auto-FY:'}
              </span>
              <span className="font-bold text-sm text-slate-100">{liveFY}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

