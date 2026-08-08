import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Tv,
  IndianRupee,
  ShieldAlert,
  FileSpreadsheet,
  Calculator,
  MapPin,
} from 'lucide-react';
import { Header } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { AgenciesTab } from './components/AgenciesTab';
import { HoardingsTab } from './components/HoardingsTab';
import { QuarterlyFeesTab } from './components/QuarterlyFeesTab';
import { StabilityCertificatesTab } from './components/StabilityCertificatesTab';
import { ReportsTab } from './components/ReportsTab';
import { FeeCalculatorTab } from './components/FeeCalculatorTab';
import { TpSchemesTab } from './components/TpSchemesTab';
import { Agency, Hoarding, QuarterlyFee, StabilityCertificate, SystemStats, TpScheme } from './types';
import { initialAgencies, initialHoardings, initialQuarterlyFees, initialStabilityCertificates, initialTpSchemes } from './data/mockData';
import {
  calculateAnnualFee,
  calculateQuarterlyBreakdown,
  checkStabilityStatus,
  detectFinancialYear,
  getCurrentFinancialYear,
  getFinancialYearsList,
  isHoardingActiveInFy,
} from './utils/calculations';
import {
  clearAllFirestoreData,
  subscribeAgencies,
  subscribeHoardings,
  subscribeQuarterlyFees,
  subscribeStabilityCertificates,
  subscribeTpSchemes,
  saveAgency,
  deleteAgency as removeAgencyFs,
  saveHoarding,
  saveQuarterlyFee,
  deleteQuarterlyFee as removeQuarterlyFeeFs,
  saveStabilityCertificate,
  saveTpScheme,
  deleteTpScheme as removeTpSchemeFs,
  seedInitialFirestoreData,
  resetFirestoreToSampleData,
} from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedFy, setSelectedFy] = useState<string>(getCurrentFinancialYear());
  const [lang, setLang] = useState<'gu' | 'en'>('gu');
  const [fyList, setFyList] = useState<string[]>(getFinancialYearsList(2024, 10));

  // State Stores with localStorage fallback support
const handleAddAgency = async (agencyData: any) => {
    try {
      const newAgency: Agency = {
        id: `ag-${Date.now()}`,
        agencyNo: `AG-${new Date().getFullYear()}-${String(agencies.length + 1).padStart(3, '0')}`,
        name: agencyData.name,
        gstNumber: agencyData.gstNumber || '',
        contactPerson: agencyData.contactPerson || '',
        phone: agencyData.phone || '',
        email: agencyData.email || '',
        address: agencyData.address || '',
        createdDate: new Date().toISOString().split('T')[0],
      };
      
      // જૂના ડેટાને સુરક્ષિત રાખીને નવી એજન્સી ઉમેરવા માટે
      setAgencies((prev) => [newAgency, ...prev]);
      await saveAgency(newAgency);
    } catch (e) {
      console.error('Error adding agency:', e);
    }
  };
  const [hoardings, setHoardings] = useState<Hoarding[]>(() => {
    const saved = localStorage.getItem('ezb_hoardings');
    return saved ? JSON.parse(saved) : [];
  });
  const [quarterlyFees, setQuarterlyFees] = useState<QuarterlyFee[]>(() => {
    const saved = localStorage.getItem('ezb_quarterly_fees');
    return saved ? JSON.parse(saved) : [];
  });
  const [certificates, setCertificates] = useState<StabilityCertificate[]>(() => {
    const saved = localStorage.getItem('ezb_certificates');
    return saved ? JSON.parse(saved) : [];
  });
  const [tpSchemes, setTpSchemes] = useState<TpScheme[]>(() => {
    const saved = localStorage.getItem('ezb_tp_schemes');
    return saved ? JSON.parse(saved) : initialTpSchemes;
  });

  const [stats, setStats] = useState<SystemStats>({
    totalAgencies: 0,
    totalHoardings: 0,
    activeHoardings: 0,
    cancelledHoardings: 0,
    computerizedCount: 0,
    totalRevenue: 0,
    pendingFees: 0,
    stabilityAlertsCount: 0,
    totalTpSchemes: 0,
  });

  // Save to localStorage whenever states change
  useEffect(() => {
    localStorage.setItem('ezb_agencies', JSON.stringify(agencies));
  }, [agencies]);

  useEffect(() => {
    localStorage.setItem('ezb_hoardings', JSON.stringify(hoardings));
  }, [hoardings]);

  useEffect(() => {
    localStorage.setItem('ezb_quarterly_fees', JSON.stringify(quarterlyFees));
  }, [quarterlyFees]);

  useEffect(() => {
    localStorage.setItem('ezb_certificates', JSON.stringify(certificates));
  }, [certificates]);

  useEffect(() => {
    localStorage.setItem('ezb_tp_schemes', JSON.stringify(tpSchemes));
  }, [tpSchemes]);

  // 1. Seed initial TP schemes if empty on startup
  useEffect(() => {
    seedInitialFirestoreData();
  }, []);

  // 2. Real-time Firebase Subscriptions with Local Fallback Syncing
  useEffect(() => {
    const unsubAgencies = subscribeAgencies((data) => {
      if (data && data.length > 0) {
        setAgencies(data);
      }
    });
        // જો ફાયરબેઝમાંથી ડેટા મળે તો તેને લોકલ સાથે સેટ કરો
        setAgencies(data);
      }
    });

    const unsubHoardings = subscribeHoardings((data) => {
      if (data && data.length > 0) setHoardings(data);
    });

    const unsubQuarterlyFees = subscribeQuarterlyFees((data) => {
      if (data && data.length > 0) setQuarterlyFees(data);
    });

    const unsubCerts = subscribeStabilityCertificates((data) => {
      if (data && data.length > 0) setCertificates(data);
    });

    const unsubTp = subscribeTpSchemes((data) => {
      if (data && data.length > 0) setTpSchemes(data);
    });

    return () => {
      unsubAgencies();
      unsubHoardings();
      unsubQuarterlyFees();
      unsubCerts();
      unsubTp();
    };
  }, []);

  // 3. Dynamic Stats Recalculation based on real-time state & selected financial year
  useEffect(() => {
    const filteredHrd = selectedFy === 'ALL'
      ? hoardings
      : hoardings.filter((h) => isHoardingActiveInFy(h, selectedFy));

    const totalHoardings = filteredHrd.length;
    const activeHoardings = filteredHrd.filter((h) => h.status === 'Active').length;
    const cancelledHoardings = filteredHrd.filter((h) => h.status === 'Cancelled').length;
    const computerizedCount = filteredHrd.filter((h) => h.type === 'Computerized').length;

    const filteredQf = selectedFy === 'ALL'
      ? quarterlyFees
      : quarterlyFees.filter((q) => q.financialYear === selectedFy);

    const totalRevenue = filteredQf
      .filter((q) => q.paymentStatus === 'Paid')
      .reduce((sum, q) => sum + q.totalAmount, 0);

    const pendingFees = filteredQf
      .filter((q) => q.paymentStatus === 'Pending' || q.paymentStatus === 'Overdue')
      .reduce((sum, q) => sum + q.totalAmount, 0);

    const refreshedCerts = certificates.map((cert) => {
      const statusInfo = checkStabilityStatus(cert.validUntilDate);
      return {
        ...cert,
        daysRemaining: statusInfo.daysRemaining,
        isAlertActive: statusInfo.isAlertActive,
        status: statusInfo.status,
      };
    });

    const stabilityAlertsCount = refreshedCerts.filter((s) => s.isAlertActive).length;

    setStats({
      totalAgencies: agencies.length,
      totalHoardings,
      activeHoardings,
      cancelledHoardings,
      computerizedCount,
      totalRevenue,
      pendingFees,
      stabilityAlertsCount,
      totalTpSchemes: tpSchemes.length,
    });
  }, [agencies, hoardings, quarterlyFees, certificates, selectedFy, tpSchemes]);

  // --- TP Scheme CRUD Handlers ---
  const handleAddTpScheme = async (schemeData: Omit<TpScheme, 'id'>) => {
    try {
      const newScheme: TpScheme = {
        ...schemeData,
        id: `tp-${Date.now()}`,
      };
      setTpSchemes((prev) => [newScheme, ...prev]);
      await saveTpScheme(newScheme);
    } catch (e) {
      console.error('Error adding TP scheme:', e);
    }
  };

  const handleEditTpScheme = async (id: string, schemeData: Partial<TpScheme>) => {
    try {
      const existing = tpSchemes.find((s) => s.id === id);
      if (!existing) return;
      const updated: TpScheme = {
        ...existing,
        ...schemeData,
      };
      setTpSchemes((prev) => prev.map((s) => (s.id === id ? updated : s)));
      await saveTpScheme(updated);
    } catch (e) {
      console.error('Error updating TP scheme:', e);
    }
  };

  const handleDeleteTpScheme = async (id: string) => {
    try {
      setTpSchemes((prev) => prev.filter((s) => s.id !== id));
      await removeTpSchemeFs(id);
    } catch (e) {
      console.error('Error deleting TP scheme:', e);
    }
  };

  const handleSeedDefaultTpSchemes = async () => {
    try {
      for (const scheme of initialTpSchemes) {
        await saveTpScheme(scheme);
      }
      setTpSchemes(initialTpSchemes);
    } catch (e) {
      console.error('Error seeding default TP schemes:', e);
    }
  };

  // --- Real-time Firestore Handlers ---
  const handleAddAgency = async (agencyData: any) => {
    try {
      const newAgency: Agency = {
        id: `ag-${Date.now()}`,
        agencyNo: `AG-${new Date().getFullYear()}-${String(agencies.length + 1).padStart(3, '0')}`,
        name: agencyData.name,
        gstNumber: agencyData.gstNumber || '',
        contactPerson: agencyData.contactPerson || '',
        phone: agencyData.phone || '',
        email: agencyData.email || '',
        address: agencyData.address || '',
        createdDate: new Date().toISOString().split('T')[0],
      };
      
      // જૂના ડેટાને રાખવા માટે prev નો ઉપયોગ કરો
      setAgencies((prev) => [newAgency, ...prev]);
      await saveAgency(newAgency);
    } catch (e) {
      console.error('Error adding agency:', e);
    }
  };

  const handleEditAgency = async (id: string, agencyData: any) => {
    try {
      const existing = agencies.find((a) => a.id === id);
      if (!existing) return;
      const updated: Agency = { ...existing, ...agencyData };
      setAgencies((prev) => prev.map((a) => (a.id === id ? updated : a)));
      await saveAgency(updated);

      if (agencyData.name && agencyData.name !== existing.name) {
        setHoardings((prev) =>
          prev.map((h) => (h.agencyId === id ? { ...h, agencyName: agencyData.name } : h))
        );
        const affectedHoardings = hoardings.filter((h) => h.agencyId === id);
        for (const h of affectedHoardings) {
          await saveHoarding({ ...h, agencyName: agencyData.name });
        }
      }
    } catch (e) {
      console.error('Error updating agency:', e);
    }
  };

  const handleDeleteAgency = async (id: string) => {
    try {
      setAgencies((prev) => prev.filter((a) => a.id !== id));
      await removeAgencyFs(id);
    } catch (e) {
      console.error('Error deleting agency:', e);
    }
  };

  const handleAddHoarding = async (hoardingData: any) => {
    try {
      const {
        agencyId,
        tpNumber,
        fpRsNumber,
        location,
        ownerName,
        remarks,
        type,
        ownershipType,
        width,
        length,
        baseRatePerSqFt,
        permissionDate,
      } = hoardingData;

      const agency = agencies.find((a) => a.id === agencyId);
      if (!agency) {
        alert(lang === 'gu' ? 'કૃપા કરીને માન્ય એજન્સી પસંદ કરો' : 'Please select a valid agency');
        return;
      }

      const w = Number(width) || 0;
      const l = Number(length) || 0;
      const rate = Number(baseRatePerSqFt) || 250;
      const permDate = permissionDate || new Date().toISOString().split('T')[0];

      const calc = calculateAnnualFee(w, l, type || 'Single', rate);
      const autoFY = detectFinancialYear(permDate);

      const newHoarding: Hoarding = {
        id: `hrd-${Date.now()}`,
        hoardingNo: `HRD-${new Date().getFullYear()}-${String(hoardings.length + 101).padStart(3, '0')}`,
        agencyId,
        agencyName: agency.name,
        tpNumber: tpNumber || 'TP-General',
        fpRsNumber: fpRsNumber || 'FP-01',
        location: location || '',
        ownerName: ownerName || '',
        remarks: remarks || '',
        type: type || 'Single',
        ownershipType: ownershipType || 'Private',
        width: w,
        length: l,
        rawArea: calc.rawArea,
        roundedArea: calc.roundedArea,
        baseRatePerSqFt: rate,
        fyRates: { [autoFY]: rate },
        effectiveRate: calc.effectiveRate,
        calculatedAnnualFee: calc.annualFee,
        calculatedQuarterlyFee: calc.quarterlyFee,
        permissionDate: permDate,
        financialYear: autoFY,
        status: 'Active',
        createdAt: new Date().toISOString().split('T')[0],
      };

      setHoardings((prev) => [newHoarding, ...prev]);
      await saveHoarding(newHoarding);
    } catch (e) {
      console.error('Error adding hoarding:', e);
    }
  };

  const handleEditHoarding = async (id: string, hoardingData: any) => {
    try {
      const hoarding = hoardings.find((h) => h.id === id);
      if (!hoarding) return;

      if (hoarding.status === 'Cancelled') {
        alert(
          lang === 'gu'
            ? 'રદ કરેલ હોર્ડિંગના રેકોર્ડમાં ફેરફાર કરવાનો પ્રતિબંધ છે!'
            : 'Cancelled hoarding record is locked against edits.'
        );
        return;
      }

      const agency = agencies.find((a) => a.id === (hoardingData.agencyId || hoarding.agencyId));
      const w = Number(hoardingData.width ?? hoarding.width);
      const l = Number(hoardingData.length ?? hoarding.length);
      const type = hoardingData.type || hoarding.type;
      const rate = Number(hoardingData.baseRatePerSqFt ?? hoarding.baseRatePerSqFt);
      const permDate = hoardingData.permissionDate || hoarding.permissionDate;
      const targetFy = hoardingData.targetFy || hoardingData.selectedFy || hoarding.financialYear;

      const updatedFyRates = {
        ...(hoarding.fyRates || {}),
        [targetFy]: rate,
      };

      const calc = calculateAnnualFee(w, l, type, rate);

      const updated: Hoarding = {
        ...hoarding,
        ...hoardingData,
        agencyName: agency ? agency.name : hoarding.agencyName,
        width: w,
        length: l,
        rawArea: calc.rawArea,
        roundedArea: calc.roundedArea,
        baseRatePerSqFt: rate,
        fyRates: updatedFyRates,
        effectiveRate: calc.effectiveRate,
        calculatedAnnualFee: calc.annualFee,
        calculatedQuarterlyFee: calc.quarterlyFee,
        permissionDate: permDate,
      };

      setHoardings((prev) => prev.map((h) => (h.id === id ? updated : h)));
      await saveHoarding(updated);
    } catch (e) {
      console.error('Error editing hoarding:', e);
    }
  };

  const handleCancelHoarding = async (id: string, cancellationData: any) => {
    try {
      const hoarding = hoardings.find((h) => h.id === id);
      if (!hoarding) return;

      const { officerDesignation, reason, letterNo, cancellationDate, uploadedDocName, uploadedDocData } =
        cancellationData;

      if (!officerDesignation || !reason || !letterNo) {
        alert(
          lang === 'gu'
            ? 'અધિકારીનો હોદ્દો, કારણ અને પત્ર નંબર ફરજિયાત છે'
            : 'Officer designation, reason & letter no. are required'
        );
        return;
      }

      const updated: Hoarding = {
        ...hoarding,
        status: 'Cancelled',
        cancellationDetails: {
          officerDesignation,
          reason,
          letterNo,
          cancellationDate: cancellationDate || new Date().toISOString().split('T')[0],
          uploadedDocName: uploadedDocName || 'cancellation_letter.pdf',
          uploadedDocData,
        },
      };

      setHoardings((prev) => prev.map((h) => (h.id === id ? updated : h)));
      await saveHoarding(updated);
    } catch (e) {
      console.error('Error cancelling hoarding:', e);
    }
  };

  const handleAddQuarterlyFee = async (feeData: any) => {
    try {
      const {
        hoardingId,
        quarter,
        interest,
        deductions,
        paymentStatus,
        paymentMode,
        remarks,
        receiptNo,
        receiptDate,
      } = feeData;

      const hoarding = hoardings.find((h) => h.id === hoardingId);
      if (!hoarding) {
        alert(lang === 'gu' ? 'કૃપા કરીને માન્ય હોર્ડિંગ પસંદ કરો' : 'Please select a valid hoarding');
        return;
      }

      const calc = calculateQuarterlyBreakdown(hoarding.calculatedAnnualFee, interest, deductions);

      const newFee: QuarterlyFee = {
        id: `qf-${Date.now()}`,
        hoardingId: hoarding.id,
        hoardingNo: hoarding.hoardingNo,
        agencyName: hoarding.agencyName,
        financialYear: hoarding.financialYear,
        quarter: quarter || 'Q1',
        quarterlyLicenseFee: calc.quarterlyLicenseFee,
        interest: calc.interest,
        deductions: calc.deductions,
        taxableAmount: calc.taxableAmount,
        sgst: calc.sgst,
        cgst: calc.cgst,
        totalAmount: calc.totalAmount,
        receiptNo:
          receiptNo ||
          `RCP-${new Date().getFullYear()}-${String(quarterlyFees.length + 101).padStart(4, '0')}`,
        receiptDate: receiptDate || new Date().toISOString().split('T')[0],
        paymentStatus: paymentStatus || 'Pending',
        paymentMode: paymentMode || 'Online',
        remarks: remarks || '',
      };

      setQuarterlyFees((prev) => [newFee, ...prev]);
      await saveQuarterlyFee(newFee);
    } catch (e) {
      console.error('Error adding quarterly fee:', e);
    }
  };

  const handleUpdateQuarterlyFee = async (id: string, feeData: any) => {
    try {
      const existing = quarterlyFees.find((q) => q.id === id);
      if (!existing) return;

      const hoarding = hoardings.find((h) => h.id === existing.hoardingId);
      const annualFee = hoarding ? hoarding.calculatedAnnualFee : existing.quarterlyLicenseFee * 4;

      const calc = calculateQuarterlyBreakdown(
        annualFee,
        feeData.interest !== undefined ? feeData.interest : existing.interest,
        feeData.deductions !== undefined ? feeData.deductions : existing.deductions
      );

      const updated: QuarterlyFee = {
        ...existing,
        ...feeData,
        quarterlyLicenseFee: calc.quarterlyLicenseFee,
        interest: calc.interest,
        deductions: calc.deductions,
        taxableAmount: calc.taxableAmount,
        sgst: calc.sgst,
        cgst: calc.cgst,
        totalAmount: calc.totalAmount,
      };

      setQuarterlyFees((prev) => prev.map((q) => (q.id === id ? updated : q)));
      await saveQuarterlyFee(updated);
    } catch (e) {
      console.error('Error updating quarterly fee:', e);
    }
  };

  const handleDeleteQuarterlyFee = async (id: string) => {
    try {
      setQuarterlyFees((prev) => prev.filter((q) => q.id !== id));
      await removeQuarterlyFeeFs(id);
    } catch (e) {
      console.error('Error deleting quarterly fee:', e);
    }
  };

  const handleAddCertificate = async (certData: any) => {
    try {
      const { hoardingId, certificateNo, engineerName, engineerLicenseNo, issueDate, validUntilDate } =
        certData;

      const hoarding = hoardings.find((h) => h.id === hoardingId);
      if (!hoarding) {
        alert(lang === 'gu' ? 'કૃપા કરીને માન્ય હોર્ડિંગ પસંદ કરો' : 'Please select a valid hoarding');
        return;
      }

      const statusInfo = checkStabilityStatus(validUntilDate);

      const newCert: StabilityCertificate = {
        id: `stb-${Date.now()}`,
        hoardingId: hoarding.id,
        hoardingNo: hoarding.hoardingNo,
        agencyName: hoarding.agencyName,
        location: hoarding.location || '',
        certificateNo:
          certificateNo ||
          `STB-MNC-${new Date().getFullYear()}-${String(certificates.length + 101).padStart(3, '0')}`,
        engineerName: engineerName || 'Structural Engineer',
        engineerLicenseNo: engineerLicenseNo || '',
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        validUntilDate: validUntilDate || new Date().toISOString().split('T')[0],
        daysRemaining: statusInfo.daysRemaining,
        isAlertActive: statusInfo.isAlertActive,
        status: statusInfo.status,
      };

      setCertificates((prev) => [newCert, ...prev]);
      await saveStabilityCertificate(newCert);
    } catch (e) {
      console.error('Error adding certificate:', e);
    }
  };

  const handleUpdateCertificate = async (id: string, certData: any) => {
    try {
      const existing = certificates.find((c) => c.id === id);
      if (!existing) return;

      const validUntilDate = certData.validUntilDate || existing.validUntilDate;
      const statusInfo = checkStabilityStatus(validUntilDate);

      const updated: StabilityCertificate = {
        ...existing,
        ...certData,
        daysRemaining: statusInfo.daysRemaining,
        isAlertActive: statusInfo.isAlertActive,
        status: statusInfo.status,
      };

      setCertificates((prev) => prev.map((c) => (c.id === id ? updated : c)));
      await saveStabilityCertificate(updated);
    } catch (e) {
      console.error('Error updating certificate:', e);
    }
  };

  const handleResetData = async () => {
    if (
      confirm(
        lang === 'gu'
          ? 'શું તમે તમામ ડેટા સાફ (Clear) કરવા માંગો છો?'
          : 'Are you sure you want to clear all data?'
      )
    ) {
      try {
        localStorage.clear();
        setAgencies([]);
        setHoardings([]);
        setQuarterlyFees([]);
        setCertificates([]);
        await clearAllFirestoreData();
      } catch (e) {
        console.error('Error clearing data:', e);
      }
    }
  };

  const alertCertificates = certificates.filter((c) => c.isAlertActive);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* App Header */}
      <Header
        selectedFy={selectedFy}
        onFyChange={setSelectedFy}
        fyList={fyList}
        alertCount={alertCertificates.length}
        lang={lang}
        onLangToggle={() => setLang(lang === 'gu' ? 'en' : 'gu')}
        onResetData={handleResetData}
        onAlertsClick={() => setActiveTab(4)}
        isLiveDb={true}
      />

      {/* Main Tab Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
            {/* Tab 0: Dashboard */}
            <button
              onClick={() => setActiveTab(0)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 0
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{lang === 'gu' ? 'ડેશબોર્ડ' : 'Dashboard'}</span>
            </button>

            {/* Tab 1: Agencies */}
            <button
              onClick={() => setActiveTab(1)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{lang === 'gu' ? 'એજન્સીઓ' : 'Agencies'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 1 ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {agencies.length}
              </span>
            </button>

            {/* Tab 2: Hoardings */}
            <button
              onClick={() => setActiveTab(2)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 2
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>{lang === 'gu' ? 'હોર્ડિંગ્સ' : 'Hoardings'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 2 ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {hoardings.length}
              </span>
            </button>

            {/* Tab 3: Quarterly Fees */}
            <button
              onClick={() => setActiveTab(3)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 3
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <IndianRupee className="w-4 h-4" />
              <span>{lang === 'gu' ? 'ત્રિમાસિક ફી' : 'Quarterly Fees'}</span>
            </button>

            {/* Tab 4: Stability Certificates */}
            <button
              onClick={() => setActiveTab(4)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 4
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{lang === 'gu' ? 'સ્ટેબિલિટી & ૪૫-દિવસ એલર્ટ' : 'Stability & 45-Day Alerts'}</span>
              {alertCertificates.length > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse">
                  {alertCertificates.length}
                </span>
              )}
            </button>

            {/* Tab 5: Reports */}
            <button
              onClick={() => setActiveTab(5)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 5
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{lang === 'gu' ? 'અહેવાલ & એક્સપોર્ટ' : 'Reports & Export'}</span>
            </button>

            {/* Tab 6: License Fee Calculator */}
            <button
              onClick={() => setActiveTab(6)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 6
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{lang === 'gu' ? 'લાયસન્સ ફી ગણતરી' : 'License Fee Calculator'}</span>
            </button>

            {/* Tab 7: TP Schemes */}
            <button
              onClick={() => setActiveTab(7)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 7
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>{lang === 'gu' ? 'ટી.પી. સ્કીમ' : 'TP Schemes'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 7 ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tpSchemes.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 0 && (
          <DashboardTab
            stats={stats}
            alerts={alertCertificates}
            hoardings={hoardings}
            agencies={agencies}
            quarterlyFees={quarterlyFees}
            lang={lang}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 1 && (
          <AgenciesTab
            agencies={agencies}
            onAddAgency={handleAddAgency}
            onEditAgency={handleEditAgency}
            onDeleteAgency={handleDeleteAgency}
            lang={lang}
          />
        )}

        {activeTab === 2 && (
          <HoardingsTab
            hoardings={hoardings}
            agencies={agencies}
            tpSchemes={tpSchemes}
            onAddHoarding={handleAddHoarding}
            onEditHoarding={handleEditHoarding}
            onCancelHoarding={handleCancelHoarding}
            selectedFy={selectedFy}
            lang={lang}
          />
        )}

        {activeTab === 3 && (
          <QuarterlyFeesTab
            quarterlyFees={quarterlyFees}
            hoardings={hoardings}
            onAddQuarterlyFee={handleAddQuarterlyFee}
            onUpdateQuarterlyFee={handleUpdateQuarterlyFee}
            onDeleteQuarterlyFee={handleDeleteQuarterlyFee}
            selectedFy={selectedFy}
            lang={lang}
          />
        )}

        {activeTab === 4 && (
          <StabilityCertificatesTab
            certificates={certificates}
            hoardings={hoardings}
            onAddCertificate={handleAddCertificate}
            onUpdateCertificate={handleUpdateCertificate}
            lang={lang}
          />
        )}

        {activeTab === 5 && (
          <ReportsTab
            stats={stats}
            agencies={agencies}
            hoardings={hoardings}
            quarterlyFees={quarterlyFees}
            certificates={certificates}
            tpSchemes={tpSchemes}
            selectedFy={selectedFy}
            lang={lang}
          />
        )}

        {activeTab === 6 && <FeeCalculatorTab lang={lang} agencies={agencies} />}

        {activeTab === 7 && (
          <TpSchemesTab
            tpSchemes={tpSchemes}
            hoardings={hoardings}
            onAddTpScheme={handleAddTpScheme}
            onEditTpScheme={handleEditTpScheme}
            onDeleteTpScheme={handleDeleteTpScheme}
            onSeedDefaults={handleSeedDefaultTpSchemes}
            lang={lang}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            {lang === 'gu'
              ? '© 2026 હોર્ડિંગ મેનેજમેન્ટ સોફ્ટવેર - સેન્ટ્રલ ફાયરબેઝ લાઈવ ડેટાબેઝ & લોકલ સ્ટોરેજ સિંક'
              : '© 2026 Hoarding Management System - Central Firebase Live Firestore & Local Storage Platform'}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span>Rules: Math.ceil() | 2x Computerized Rate | Auto-FY | 45-Day Alert</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
