import React, { useState } from 'react';
import {
  Plus,
  Search,
  IndianRupee,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Building,
  CheckSquare,
  Square,
  Trash2,
  Download,
  X,
  Filter,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Hoarding, QuarterlyFee, QuarterType, PaymentStatus } from '../types';
import { calculateQuarterlyBreakdown, getCurrentFinancialYear, getHoardingPendingQuartersSummary } from '../utils/calculations';
import { PrintReceiptModal } from './PrintReceiptModal';

interface QuarterlyFeesTabProps {
  quarterlyFees: QuarterlyFee[];
  hoardings: Hoarding[];
  onAddQuarterlyFee: (feeData: any) => void;
  onUpdateQuarterlyFee: (id: string, feeData: any) => void;
  onDeleteQuarterlyFee: (id: string) => void;
  selectedFy: string;
  lang: 'gu' | 'en';
}

export const QuarterlyFeesTab: React.FC<QuarterlyFeesTabProps> = ({
  quarterlyFees,
  hoardings,
  onAddQuarterlyFee,
  onUpdateQuarterlyFee,
  onDeleteQuarterlyFee,
  selectedFy,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'Paid' | 'Pending' | 'Overdue'>('ALL');

  // Multi-select state
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printingFee, setPrintingFee] = useState<QuarterlyFee | null>(null);
  const [batchPrintFees, setBatchPrintFees] = useState<QuarterlyFee[] | null>(null);
  const [draftPrintFees, setDraftPrintFees] = useState<QuarterlyFee[] | null>(null);

  // Form State for Multi-Hoarding Selection & Editable Quarterly Fee Column
  const [modalAgencyFilter, setModalAgencyFilter] = useState('ALL');
  const [modalSelectedHoardingIds, setModalSelectedHoardingIds] = useState<string[]>([]);
  const [modalCustomFees, setModalCustomFees] = useState<Record<string, number>>({});
  const [receiptFy, setReceiptFy] = useState(getCurrentFinancialYear());
  const [quarter, setQuarter] = useState<QuarterType>('Q1');
  const [interest, setInterest] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [paymentMode, setPaymentMode] = useState<'Cheque' | 'Online' | 'DD' | 'Cash'>('Online');
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  // Extract unique agency names for modal filter
  const uniqueAgencies = Array.from(
    new Set(hoardings.map((h) => h.agencyName).filter(Boolean))
  ).sort();

  // Open modal with pre-selected agency / hoarding or default
  const openAddModal = (preselectedAgency?: string, preselectedHoardingId?: string) => {
    const agName = preselectedAgency || 'ALL';
    setModalAgencyFilter(agName);

    const matchingHoardings = hoardings.filter(
      (h) => h.status === 'Active' && (agName === 'ALL' || h.agencyName === agName)
    );

    if (preselectedHoardingId) {
      setModalSelectedHoardingIds([preselectedHoardingId]);
    } else {
      setModalSelectedHoardingIds(matchingHoardings.map((h) => h.id));
    }

    const feesMap: Record<string, number> = {};
    matchingHoardings.forEach((h) => {
      feesMap[h.id] = h.calculatedQuarterlyFee || Math.ceil(h.calculatedAnnualFee / 4);
    });
    setModalCustomFees(feesMap);

    setReceiptFy(selectedFy === 'ALL' ? getCurrentFinancialYear() : selectedFy);
    setQuarter('Q1');
    setInterest(0);
    setDeductions(0);
    setPaymentStatus('Paid');
    setPaymentMode('Online');
    setReceiptNo(`RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setRemarks('Fee paid to municipal treasury');
    setIsModalOpen(true);
  };

  const handleModalAgencyChange = (agName: string) => {
    setModalAgencyFilter(agName);
    const matchingHoardings = hoardings.filter(
      (h) => h.status === 'Active' && (agName === 'ALL' || h.agencyName === agName)
    );
    setModalSelectedHoardingIds(matchingHoardings.map((h) => h.id));

    const feesMap: Record<string, number> = { ...modalCustomFees };
    matchingHoardings.forEach((h) => {
      if (feesMap[h.id] === undefined) {
        feesMap[h.id] = h.calculatedQuarterlyFee || Math.ceil(h.calculatedAnnualFee / 4);
      }
    });
    setModalCustomFees(feesMap);
  };

  const toggleModalSelectAll = (matchingHoardings: Hoarding[]) => {
    const allIds = matchingHoardings.map((h) => h.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => modalSelectedHoardingIds.includes(id));
    if (isAllSelected) {
      setModalSelectedHoardingIds([]);
    } else {
      setModalSelectedHoardingIds(allIds);
    }
  };

  const toggleModalSelectRow = (id: string) => {
    setModalSelectedHoardingIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalSelectedHoardingIds.length === 0) {
      alert(lang === 'gu' ? 'કૃપા કરીને ઓછામાં ઓછું એક હોર્ડિંગ પસંદ કરો' : 'Please select at least one hoarding');
      return;
    }

    const createdFees: QuarterlyFee[] = [];

    modalSelectedHoardingIds.forEach((hId, index) => {
      const h = hoardings.find((item) => item.id === hId);
      if (!h) return;

      const customBaseFee =
        modalCustomFees[hId] ?? (h.calculatedQuarterlyFee || Math.ceil(h.calculatedAnnualFee / 4));
      const taxableAmount = Math.max(0, Math.ceil(customBaseFee + interest - deductions));
      const sgst = Math.ceil(taxableAmount * 0.09);
      const cgst = Math.ceil(taxableAmount * 0.09);
      const totalAmount = taxableAmount + sgst + cgst;

      const uniqueReceiptNo =
        modalSelectedHoardingIds.length === 1
          ? receiptNo
          : `${receiptNo}-${h.hoardingNo.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;

      createdFees.push({
        id: `fee-${Date.now()}-${index}`,
        hoardingId: h.id,
        hoardingNo: h.hoardingNo,
        agencyName: h.agencyName,
        financialYear: receiptFy,
        quarter,
        quarterlyLicenseFee: customBaseFee,
        interest,
        deductions,
        taxableAmount,
        sgst,
        cgst,
        totalAmount,
        paymentStatus,
        paymentMode,
        receiptNo: uniqueReceiptNo,
        receiptDate,
        remarks: remarks || `Quarterly License Fee Payment for ${h.hoardingNo}`,
      });
    });

    setIsModalOpen(false);
    // Show Print Preview Modal first before saving!
    setDraftPrintFees(createdFees);
  };

  const filtered = quarterlyFees.filter((q) => {
    const matchesSearch =
      q.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.hoardingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.agencyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = paymentFilter === 'ALL' || q.paymentStatus === paymentFilter;
    const matchesFy = selectedFy === 'ALL' || q.financialYear === selectedFy;

    return matchesSearch && matchesStatus && matchesFy;
  });

  // Multi-select handlers
  const isAllSelected = filtered.length > 0 && filtered.every((f) => selectedFeeIds.includes(f.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFeeIds([]);
    } else {
      setSelectedFeeIds(filtered.map((f) => f.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedFeeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Batch actions
  const handleBatchStatusUpdate = (newStatus: PaymentStatus) => {
    selectedFeeIds.forEach((id) => {
      onUpdateQuarterlyFee(id, { paymentStatus: newStatus });
    });
    alert(
      lang === 'gu'
        ? `${selectedFeeIds.length} રસીદોનું પેમેન્ટ સ્ટેટસ '${newStatus}' માં અપડેટ થયું.`
        : `Updated ${selectedFeeIds.length} receipts status to ${newStatus}.`
    );
  };

  const handleBatchDelete = () => {
    if (
      window.confirm(
        lang === 'gu'
          ? `શું તમે ખરેખર પસંદ કરેલ ${selectedFeeIds.length} ત્રિમાસિક લાયસન્સ ફી રસીદો ડિલીટ કરવા માંગો છો?`
          : `Are you sure you want to delete ${selectedFeeIds.length} selected fee receipts?`
      )
    ) {
      selectedFeeIds.forEach((id) => {
        onDeleteQuarterlyFee(id);
      });
      setSelectedFeeIds([]);
    }
  };

  const handleBatchPrint = () => {
    const selectedList = quarterlyFees.filter((f) => selectedFeeIds.includes(f.id));
    setBatchPrintFees(selectedList);
  };

  const handleExportSelectedCsv = () => {
    const selectedList = quarterlyFees.filter((f) => selectedFeeIds.includes(f.id));
    if (selectedList.length === 0) return;

    const headers = [
      'ReceiptNo',
      'ReceiptDate',
      'HoardingNo',
      'AgencyName',
      'Quarter',
      'FinancialYear',
      'BaseQuarterFee',
      'Interest',
      'Deductions',
      'TaxableAmount',
      'SGST',
      'CGST',
      'TotalAmount',
      'PaymentStatus',
      'PaymentMode',
    ];

    const rows = selectedList.map((f) => [
      f.receiptNo,
      f.receiptDate,
      f.hoardingNo,
      f.agencyName,
      f.quarter,
      f.financialYear,
      f.quarterlyLicenseFee,
      f.interest,
      f.deductions,
      f.taxableAmount,
      f.sgst,
      f.cgst,
      f.totalAmount,
      f.paymentStatus,
      f.paymentMode,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `selected_quarterly_receipts_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'gu'
                  ? 'રસીદ નં, હોર્ડિંગ નં કે એજન્સી શોધો...'
                  : 'Search receipt, hoarding, or agency...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs md:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">{lang === 'gu' ? 'તમામ ચૂકવણીઓ (All Payments)' : 'All Payments'}</option>
            <option value="Paid">{lang === 'gu' ? 'વસૂલાયેલ / ચૂકવેલ (Paid)' : 'Paid'}</option>
            <option value="Pending">{lang === 'gu' ? 'બાકી (Pending)' : 'Pending'}</option>
            <option value="Overdue">{lang === 'gu' ? 'મુદત વિતેલ (Overdue)' : 'Overdue'}</option>
          </select>
        </div>

        <button
          onClick={() => openAddModal()}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs md:text-sm px-4 py-2 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'gu' ? '+ નવી ત્રિમાસિક ફી નોધો' : '+ Record Quarterly Fee'}</span>
        </button>
      </div>

      {/* Multi-Select Action Banner (Displays when 1 or more receipts selected) */}
      {selectedFeeIds.length > 0 && (
        <div className="bg-blue-900 text-white p-3.5 rounded-xl shadow-md border border-blue-800 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white font-mono font-bold px-2.5 py-1 rounded-md text-xs border border-blue-400 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" />
              {selectedFeeIds.length} {lang === 'gu' ? 'રસીદો પસંદ કરી' : 'Receipts Selected'}
            </span>
            <button
              onClick={() => setSelectedFeeIds([])}
              className="text-xs text-blue-200 hover:text-white underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{lang === 'gu' ? 'પસંદગી રદ કરો' : 'Clear Selection'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Print */}
            <button
              onClick={handleBatchPrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-blue-200" />
              <span>{lang === 'gu' ? 'બેચ પ્રિન્ટ રસીદો' : 'Batch Print Receipts'}</span>
            </button>

            {/* Batch Export CSV */}
            <button
              onClick={handleExportSelectedCsv}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-200" />
              <span>{lang === 'gu' ? 'CSV ડાઉનલોડ' : 'Export CSV'}</span>
            </button>

            {/* Batch Status Change */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-300 font-medium px-1">
                {lang === 'gu' ? 'સ્ટેટસ:' : 'Status:'}
              </span>
              <button
                onClick={() => handleBatchStatusUpdate('Paid')}
                className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] rounded font-medium"
              >
                Paid
              </button>
              <button
                onClick={() => handleBatchStatusUpdate('Pending')}
                className="px-2 py-0.5 bg-amber-700 hover:bg-amber-600 text-white text-[11px] rounded font-medium"
              >
                Pending
              </button>
              <button
                onClick={() => handleBatchStatusUpdate('Overdue')}
                className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-[11px] rounded font-medium"
              >
                Overdue
              </button>
            </div>

            {/* Batch Delete */}
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'gu' ? 'ડિલીટ કરો' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                {/* Select Checkbox Column */}
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    title={lang === 'gu' ? 'બધા પસંદ કરો / રદ કરો' : 'Select / Deselect All'}
                  />
                </th>
                <th className="px-4 py-3">{lang === 'gu' ? 'રસીદ નં & તારીખ' : 'Receipt No & Date'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'હોર્ડિંગ & એજન્સી' : 'Hoarding & Agency'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'ત્રિમાસ (Quarter / FY)' : 'Quarter / FY'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'ફી & ટેક્સ ગણતરી' : 'Fee & Tax Breakdown'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'કુલ રકમ' : 'Total Amount'}</th>
                <th className="px-4 py-3">{lang === 'gu' ? 'સ્ટેટસ & મોડ' : 'Status & Mode'}</th>
                <th className="px-4 py-3 text-right">{lang === 'gu' ? 'પહોંચ પ્રિન્ટ' : 'Receipt'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    {lang === 'gu' ? 'કોઈ ત્રિમાસિક ફી રેકોર્ડ મળ્યો નથી.' : 'No quarterly fee records found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((fee) => {
                  const isSelected = selectedFeeIds.includes(fee.id);
                  return (
                    <tr
                      key={fee.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(fee.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Receipt No */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <div>{fee.receiptNo}</div>
                        <div className="text-slate-500 text-[11px] font-normal">{fee.receiptDate}</div>
                      </td>

                      {/* Hoarding & Agency */}
                      <td className="px-4 py-3 font-medium">
                        <div className="font-bold text-slate-800 font-mono">{fee.hoardingNo}</div>
                        <div className="text-xs text-slate-500">{fee.agencyName}</div>
                      </td>

                      {/* Quarter & FY */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                          {fee.quarter} ({fee.financialYear})
                        </span>
                      </td>

                      {/* Breakdown */}
                      <td className="px-4 py-3 font-mono text-xs space-y-0.5">
                        <div>Base: ₹{fee.quarterlyLicenseFee.toLocaleString('en-IN')}</div>
                        {fee.interest > 0 && <div className="text-amber-700">Int: +₹{fee.interest}</div>}
                        {fee.deductions > 0 && <div className="text-rose-700">Ded: -₹{fee.deductions}</div>}
                        <div className="text-slate-500">GST: ₹{fee.sgst + fee.cgst}</div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-3 font-mono font-extrabold text-sm text-slate-900">
                        ₹{fee.totalAmount.toLocaleString('en-IN')}
                      </td>

                      {/* Status & Mode */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {fee.paymentStatus === 'Paid' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-md font-bold border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {lang === 'gu' ? 'ચૂકવેલ (Paid)' : 'Paid'}
                            </span>
                          ) : fee.paymentStatus === 'Pending' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-md font-bold border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {lang === 'gu' ? 'બાકી (Pending)' : 'Pending'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-md font-bold border border-red-300">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              {lang === 'gu' ? 'મુદત વિતેલ (Overdue)' : 'Overdue'}
                            </span>
                          )}
                          <div className="text-[11px] text-slate-500 font-medium">Mode: {fee.paymentMode}</div>
                        </div>
                      </td>

                      {/* Print Receipt Button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setPrintingFee(fee)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-400" />
                          <span>{lang === 'gu' ? 'પહોંચ પ્રિન્ટ' : 'Print Receipt'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Quarterly Fee Modal with Multi-Hoarding Selection & Custom Editable Fee Column */}
      {isModalOpen && (() => {
        const matchingModalHoardings = hoardings.filter(
          (h) => h.status === 'Active' && (modalAgencyFilter === 'ALL' || h.agencyName === modalAgencyFilter)
        );
        const isAllModalSelected =
          matchingModalHoardings.length > 0 &&
          matchingModalHoardings.every((h) => modalSelectedHoardingIds.includes(h.id));

        // Calculate sum across selected hoardings
        let totalModalBaseFee = 0;
        let totalModalNetPayable = 0;
        modalSelectedHoardingIds.forEach((hId) => {
          const h = hoardings.find((item) => item.id === hId);
          if (h) {
            const base =
              modalCustomFees[hId] ?? (h.calculatedQuarterlyFee || Math.ceil(h.calculatedAnnualFee / 4));
            const taxable = Math.max(0, Math.ceil(base + interest - deductions));
            const total = taxable + Math.ceil(taxable * 0.09) + Math.ceil(taxable * 0.09);
            totalModalBaseFee += base;
            totalModalNetPayable += total;
          }
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-5 md:p-6 shadow-2xl border border-slate-200 my-auto space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-900">
                  <IndianRupee className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-base md:text-lg font-bold">
                    {lang === 'gu'
                      ? 'ત્રિમાસિક લાયસન્સ ફી રસીદ નોંધો (મલ્ટી-સિલેક્ટ અને એડિટેબલ ફી કોલમ)'
                      : 'Record Quarterly License Fee (Multi-Select & Custom Fee Column)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
                {/* Agency Selection & FY / Quarter Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? '૧. એજન્સી પસંદ કરો *' : '1. Select Agency *'}
                    </label>
                    <select
                      value={modalAgencyFilter}
                      onChange={(e) => handleModalAgencyChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">
                        {lang === 'gu' ? 'તમામ એજન્સીઓ (All Agencies)' : 'All Agencies'}
                      </option>
                      {uniqueAgencies.map((ag) => (
                        <option key={ag} value={ag}>
                          {ag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? '૨. નાણાકીય વર્ષ *' : '2. Financial Year *'}
                    </label>
                    <select
                      value={receiptFy}
                      onChange={(e) => setReceiptFy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="2024-25">2024-25 (ગત નાણાકીય વર્ષ)</option>
                      <option value="2025-26">2025-26 (વર્તમાન વર્ષ)</option>
                      <option value="2026-27">2026-27 (આગામી વર્ષ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? '૩. ત્રિમાસ (Quarter) *' : '3. Quarter *'}
                    </label>
                    <select
                      value={quarter}
                      onChange={(e) => setQuarter(e.target.value as QuarterType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Q1">Q1 (એપ્રિલ - જૂન / Apr - Jun)</option>
                      <option value="Q2">Q2 (જુલાઈ - સપ્ટેમ્બર / Jul - Sep)</option>
                      <option value="Q3">Q3 (ઓક્ટોબર - ડિસેમ્બર / Oct - Dec)</option>
                      <option value="Q4">Q4 (જાન્યુઆરી - માર્ચ / Jan - Mar)</option>
                      <option value="Annual">સંપૂર્ણ વાર્ષિક ફી (Full Annual Fee)</option>
                    </select>
                  </div>
                </div>

                {/* Hoardings Multi-Select Table with Editable Quarterly Fee Column */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-800 font-bold">
                      {lang === 'gu'
                        ? '૪. એજન્સીના તમામ હોર્ડિંગ્સ અને ત્રિમાસિક લાયસન્સ ફી (મલ્ટી-સિલેક્ટ કરો):'
                        : '4. Select Agency Hoardings & Set Custom Quarterly License Fees:'}
                    </label>
                    <span className="text-xs text-slate-500 font-medium">
                      {modalSelectedHoardingIds.length} / {matchingModalHoardings.length}{' '}
                      {lang === 'gu' ? 'હોર્ડિંગ્સ પસંદ કરેલ' : 'hoardings selected'}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={isAllModalSelected}
                              onChange={() => toggleModalSelectAll(matchingModalHoardings)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-3 py-2">{lang === 'gu' ? 'હોર્ડિંગ નં & લોકેશન' : 'Hoarding & Location'}</th>
                          <th className="px-3 py-2">{lang === 'gu' ? 'પ્રકાર & માપ' : 'Type & Size'}</th>
                          <th className="px-3 py-2 text-center bg-blue-50 border-x border-blue-200 text-blue-900">
                            {lang === 'gu' ? 'ત્રિમાસિક લાયસન્સ ફી (₹) * [જાતે લખી શકાય]' : 'Quarterly License Fee (₹) * [Editable]'}
                          </th>
                          <th className="px-3 py-2 text-right">{lang === 'gu' ? 'GST (18%) સાથે કુલ રકમ' : 'Total with 18% GST'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {matchingModalHoardings.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                              {lang === 'gu' ? 'કોઈ એક્ટિવ હોર્ડિંગ્સ મળ્યા નથી.' : 'No active hoardings found.'}
                            </td>
                          </tr>
                        ) : (
                          matchingModalHoardings.map((h) => {
                            const isSelected = modalSelectedHoardingIds.includes(h.id);
                            const currentCustomBase =
                              modalCustomFees[h.id] ?? (h.calculatedQuarterlyFee || Math.ceil(h.calculatedAnnualFee / 4));

                            const taxable = Math.max(0, Math.ceil(currentCustomBase + interest - deductions));
                            const sgst = Math.ceil(taxable * 0.09);
                            const cgst = Math.ceil(taxable * 0.09);
                            const rowTotal = taxable + sgst + cgst;

                            return (
                              <tr
                                key={h.id}
                                className={`hover:bg-blue-50/50 transition-colors ${
                                  isSelected ? 'bg-blue-50/40 font-medium' : ''
                                }`}
                              >
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleModalSelectRow(h.id)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-bold text-slate-900 font-mono">{h.hoardingNo}</div>
                                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>{h.location}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                                  {h.type === 'Computerized' ? '💻 કોમ્પ્યુટરાઈઝ્ડ' : '🖼️ સિંગલ'}
                                  <div>
                                    {h.widthMeters}m x {h.lengthMeters}m ({h.areaSqMeters} sq.m)
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center bg-blue-50/30 border-x border-blue-100">
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentCustomBase}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setModalCustomFees((prev) => ({
                                        ...prev,
                                        [h.id]: val,
                                      }));
                                    }}
                                    className="w-28 px-2.5 py-1 bg-white border border-blue-400 rounded text-center font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-extrabold text-emerald-700">
                                  ₹{rowTotal.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Multi-Hoarding Summary Card */}
                <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-1.5 text-xs font-mono border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400">
                      {lang === 'gu' ? 'પસંદ કરેલ હોર્ડિંગ્સ:' : 'Selected Hoardings:'}{' '}
                      <strong className="text-amber-400">{modalSelectedHoardingIds.length}</strong>
                    </p>
                    <p className="text-slate-300">
                      {lang === 'gu' ? 'કુલ બેઝ ત્રિમાસિક ફી:' : 'Total Base Fee:'}{' '}
                      <span>₹{totalModalBaseFee.toLocaleString('en-IN')}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-slate-400">{lang === 'gu' ? 'કુલ ચૂકવવાપાત્ર રકમ (૧૮% GST સહ):' : 'Total Payable Dues:'}</p>
                    <p className="text-lg font-black text-emerald-400">
                      ₹{totalModalNetPayable.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Payment & Receipt Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? 'વ્યાજ / લેટ ફી (₹)' : 'Interest / Late Fee (₹)'}
                    </label>
                    <input
                      type="number"
                      value={interest}
                      onChange={(e) => setInterest(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? 'મજરે / વળતર (₹)' : 'Deductions (₹)'}
                    </label>
                    <input
                      type="number"
                      value={deductions}
                      onChange={(e) => setDeductions(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? 'ચૂકવણી મોડ' : 'Payment Mode'}
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                    >
                      <option value="Online">ઓનલાઇન / NEFT / UPI</option>
                      <option value="Cheque">ચેક (Cheque)</option>
                      <option value="DD">ડિમાન્ડ ડ્રાફ્ટ (DD)</option>
                      <option value="Cash">રોકડ (Cash)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? 'રસીદ નંબર પ્રિફિક્સ/નંબર *' : 'Receipt No *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'gu' ? 'રસીદ તારીખ *' : 'Receipt Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                  >
                    {lang === 'gu' ? 'કેન્સલ' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-colors"
                  >
                    {lang === 'gu'
                      ? `${modalSelectedHoardingIds.length} હોર્ડિંગ્સની રસીદો સેવ કરો`
                      : `Save ${modalSelectedHoardingIds.length} Fee Receipts`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Official Print Receipt Modal Trigger */}
      {printingFee && (
        <PrintReceiptModal
          fee={printingFee}
          onClose={() => setPrintingFee(null)}
          lang={lang}
        />
      )}

      {/* Batch Print Receipt Modal Trigger */}
      {batchPrintFees && (
        <PrintReceiptModal
          fees={batchPrintFees}
          onClose={() => setBatchPrintFees(null)}
          lang={lang}
        />
      )}

      {/* Draft Print Receipt Modal Preview before Save */}
      {draftPrintFees && (
        <PrintReceiptModal
          fees={draftPrintFees}
          isDraft={true}
          onConfirmSave={() => {
            draftPrintFees.forEach((feeData) => {
              onAddQuarterlyFee(feeData);
            });
            setDraftPrintFees(null);
          }}
          onClose={() => setDraftPrintFees(null)}
          lang={lang}
        />
      )}
    </div>
  );
};
