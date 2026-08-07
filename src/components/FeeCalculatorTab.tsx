import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Save,
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Building2,
  Trash2,
  Archive,
  RefreshCw,
  Download,
  Upload,
  Search,
  CheckCircle2,
  IndianRupee,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

import { Agency } from '../types';
import { initialAgencies } from '../data/mockData';

interface FeeCalculatorTabProps {
  lang: 'gu' | 'en';
  agencies?: Agency[];
}

interface CalcRow {
  no: number;
  start: string; // ISO date 'YYYY-MM-DD'
  end: string;   // ISO date 'YYYY-MM-DD'
  fee: number;
}

interface ProcessedRow extends CalcRow {
  interestStart: string;
  days: number;
  interest: number;
  cgst?: number;
  sgst?: number;
  tds?: number;
  total: number;
}

interface SavedRecord {
  id: number;
  status: 'active' | 'archive';
  savedAt: string;
  createdAt: string;
  archivedAt?: string;
  mode: 'private' | 'municipal';
  partyName: string;
  gstNo: string;
  siteName: string;
  bcntGlac: string;
  bcntGlacFull: string;
  bcntGlacTitle: string;
  hoardingCount: string;
  interestRate: string;
  cgstRate: string;
  secondTaxRate: string;
  calculationDate: string;
  rows: CalcRow[];
  totals: {
    fee: number;
    days: number;
    interest: number;
    taxOne: number;
    taxTwo: number;
    total: number;
  };
}

const BCNT_OPTIONS = [
  { code: '51/1264', title: 'લાયસન્સ ફી (ખાનગી મિલ્કતોના હોડિંગ્સ ફી) GST લાગુ', label: '51/1264 (લાયસન્સ ફી - ખાનગી મિલ્કતોના હોડિંગ્સ GST લાગુ)' },
  { code: '51/1282', title: 'સુ.મ.પાની જગ્યા/મિલ્કત પર ઉભા કરેલ હોડિંગ્સ (RCM હેઠળ)', label: '51/1282 (સુ.મ.પાની જગ્યા/મિલ્કત પર ઉભા કરેલ હોડિંગ્સ RCM હેઠળ)' },
  { code: '51/1285', title: 'જાહેર આવક કિયોસ્ક (RCM હેઠળ)', label: '51/1285 (જાહેર આવક કિયોસ્ક RCM હેઠળ)' },
  { code: '51/1291', title: 'ખાનગી મિલ્કતોના હોડિંગ્સ/જાહેરાત (RCM હેઠળ)', label: '51/1291 (ખાનગી મિલ્કતોના હોડિંગ્સ/જાહેરાત RCM હેઠળ)' },
];

const STORAGE_KEY = 'licenseFeeRecords';
const SETTINGS_KEY = 'licenseFeeSettings';

// Helpers
function pad(n: number) {
  return String(n).padStart(2, '0');
}

function todayLocal(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(iso: string): Date {
  if (!iso) return todayLocal();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDateStr(input: Date | string): string {
  if (!input) return '';
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    return `${input.getFullYear()}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}`;
  }
  const str = String(input).trim();
  if (!str) return '';
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return str;
  }
  const parsed = parseDmy(str) || fromIso(str);
  if (parsed && !isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }
  return '';
}

function ddmmyyyy(input: Date | string): string {
  if (!input) return '';
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    return `${pad(input.getDate())}-${pad(input.getMonth() + 1)}-${input.getFullYear()}`;
  }
  const str = String(input).trim();
  if (str.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
    const parsed = parseDmy(str);
    if (parsed) {
      return `${pad(parsed.getDate())}-${pad(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
    }
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parsed = fromIso(str);
    return `${pad(parsed.getDate())}-${pad(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
  }
  return str;
}

function parseDmy(value: string): Date | null {
  const match = String(value || '').trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) {
    return null;
  }
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const originalDate = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDate, lastDay));
  return d;
}

function eomonthAfterThreeMonths(start: Date): Date {
  return addDays(addMonths(start, 3), -1);
}

function interestStartFor(startIso: string): Date {
  const d = fromIso(startIso);
  return new Date(d.getFullYear(), d.getMonth(), 21);
}

function diffDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / 86400000);
}

function money(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

export const FeeCalculatorTab: React.FC<FeeCalculatorTabProps> = ({ lang, agencies }) => {
  const availableAgencies = agencies && agencies.length > 0 ? agencies : initialAgencies;

  // Form State
  const [mode, setMode] = useState<'private' | 'municipal'>('private');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [partyName, setPartyName] = useState('');
  const [gstNo, setGstNo] = useState('');

  const handleAgencySelect = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    setIsSaved(false);

    if (agencyId === 'custom') {
      setPartyName('');
      setGstNo('Not Applicable');
    } else if (agencyId) {
      const selected = availableAgencies.find((a) => a.id === agencyId);
      if (selected) {
        setPartyName(selected.name);
        const rawGst = selected.gstNumber ? selected.gstNumber.trim() : '';
        setGstNo(rawGst && rawGst.length > 0 ? rawGst : 'Not Applicable');
      }
    } else {
      setPartyName('');
      setGstNo('');
    }
  };
  const [siteName, setSiteName] = useState('');
  const [bcntGlac, setBcntGlac] = useState('');
  const [hoardingCount, setHoardingCount] = useState('');
  const [startDateStr, setStartDateStr] = useState('01-01-2024');
  const [periodCount, setPeriodCount] = useState(10);
  const [licenseFeeInput, setLicenseFeeInput] = useState(0);
  const [interestRate, setInterestRate] = useState(18);
  const [cgstRate, setCgstRate] = useState(9);
  const [secondTaxRate, setSecondTaxRate] = useState(9); // SGST or TDS
  const [autoChain, setAutoChain] = useState(true);

  const [calculationDate, setCalculationDate] = useState<Date>(todayLocal());
  const [isSaved, setIsSaved] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [statusMessage, setStatusMessage] = useState('ફી, ગાળો અથવા તારીખ બદલો એટલે ગણતરી તરત જ રિટર્ન ગણાશે.');

  // Calculation Rows State
  const [rows, setRows] = useState<CalcRow[]>([]);

  // Records Store State
  const [activeRecords, setActiveRecords] = useState<SavedRecord[]>([]);
  const [archiveRecords, setArchiveRecords] = useState<SavedRecord[]>([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [retentionDays, setRetentionDays] = useState('2');

  // Print/Receipt Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Load Saved Records on Mount
  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.active) setActiveRecords(parsed.active);
        if (parsed.archive) setArchiveRecords(parsed.archive);
      }
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) {
        const parsedS = JSON.parse(rawSettings);
        if (parsedS.retentionDays) setRetentionDays(parsedS.retentionDays);
      }
    } catch (e) {
      console.error('Error loading records store', e);
    }
  };

  const saveStore = (nextActive: SavedRecord[], nextArchive: SavedRecord[]) => {
    setActiveRecords(nextActive);
    setArchiveRecords(nextArchive);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: nextActive, archive: nextArchive }));
  };

  // Rebuild rows when start date or period count changes
  useEffect(() => {
    makeDefaultRows(startDateStr, periodCount, licenseFeeInput);
  }, []);

  const makeDefaultRows = (startDStr: string, count: number, feeVal: number) => {
    const validCount = Math.max(1, Math.min(24, count || 10));
    let start = parseDmy(startDStr) || fromIso(startDStr) || todayLocal();

    const newRows: CalcRow[] = [];
    for (let i = 0; i < validCount; i++) {
      const end = eomonthAfterThreeMonths(start);
      newRows.push({
        no: i + 1,
        start: toIso(start),
        end: toIso(end),
        fee: feeVal,
      });
      start = addDays(end, 1);
    }
    setRows(newRows);
    setIsSaved(false);
  };

  const handleModeChange = (newMode: 'private' | 'municipal') => {
    setMode(newMode);
    if (newMode === 'private') {
      setSecondTaxRate(9); // SGST
    } else {
      setSecondTaxRate(2); // TDS
    }
    setIsSaved(false);
  };

  const handleFeeInputChange = (newFee: number) => {
    setLicenseFeeInput(newFee);
    setRows((prev) => prev.map((r) => ({ ...r, fee: newFee })));
    setIsSaved(false);
  };

  const handleRowCellChange = (index: number, field: keyof CalcRow, value: any) => {
    setRows((prevRows) => {
      const updated = [...prevRows];
      if (field === 'fee') {
        updated[index] = { ...updated[index], fee: Number(value || 0) };
      } else if (field === 'start' || field === 'end') {
        const parsed = parseDmy(value) || fromIso(value);
        if (parsed && !isNaN(parsed.getTime())) {
          updated[index] = { ...updated[index], [field]: toIso(parsed) };
        }
      }

      // If end date modified & autoChain enabled
      if (field === 'end' && autoChain) {
        for (let i = index + 1; i < updated.length; i++) {
          const prevEnd = fromIso(updated[i - 1].end);
          const nextStart = addDays(prevEnd, 1);
          const nextEnd = eomonthAfterThreeMonths(nextStart);
          updated[i] = {
            ...updated[i],
            start: toIso(nextStart),
            end: toIso(nextEnd),
          };
        }
      }

      return updated;
    });
    setIsSaved(false);
  };

  // Process rows calculation
  const processedRows: ProcessedRow[] = rows.map((row) => {
    const interestStart = interestStartFor(row.start);
    const days = Math.max(0, diffDays(calculationDate, interestStart) + 2);
    const fee = Math.ceil(Number(row.fee) || 0);
    const interest = Math.ceil((fee * (interestRate / 100) * days) / 365);

    let cgst = 0;
    let sgst = 0;
    let tds = 0;
    let total = 0;

    if (mode === 'private') {
      cgst = Math.ceil((fee + interest) * (cgstRate / 100));
      sgst = Math.ceil((fee + interest) * (secondTaxRate / 100));
      total = Math.ceil(fee + interest + cgst + sgst);
    } else {
      tds = Math.ceil(fee * (secondTaxRate / 100));
      total = Math.ceil(fee + interest + tds);
    }

    return {
      ...row,
      interestStart: toIso(interestStart),
      days,
      fee,
      interest,
      cgst: mode === 'private' ? cgst : undefined,
      sgst: mode === 'private' ? sgst : undefined,
      tds: mode === 'municipal' ? tds : undefined,
      total,
    };
  });

  const totals = processedRows.reduce(
    (acc, row) => {
      acc.fee += row.fee;
      acc.days += row.days;
      acc.interest += row.interest;
      acc.taxOne += row.cgst || row.tds || 0;
      acc.taxTwo += row.sgst || 0;
      acc.total += row.total;
      return acc;
    },
    { fee: 0, days: 0, interest: 0, taxOne: 0, taxTwo: 0, total: 0 }
  );

  const bcntInfo = BCNT_OPTIONS.find((b) => b.code === bcntGlac);

  // Save Record Handler
  const handleSaveRecord = () => {
    const nowIso = new Date().toISOString();
    const newRecord: SavedRecord = {
      id: Date.now(),
      status: 'active',
      savedAt: nowIso,
      createdAt: nowIso,
      mode,
      partyName: partyName.trim(),
      gstNo: gstNo.trim(),
      siteName: siteName.trim(),
      bcntGlac,
      bcntGlacFull: bcntInfo?.label || bcntGlac,
      bcntGlacTitle: bcntInfo?.title || '',
      hoardingCount: mode === 'private' ? hoardingCount : '',
      interestRate: String(interestRate),
      cgstRate: String(cgstRate),
      secondTaxRate: String(secondTaxRate),
      calculationDate: toIso(calculationDate),
      rows: rows.map((r) => ({ ...r })),
      totals,
    };

    const nextActive = [newRecord, ...activeRecords];
    saveStore(nextActive, archiveRecords);

    setIsSaved(true);
    setSavedAt(nowIso);
    setStatusMessage(`ગણતરી સેવ કરવામાં આવી: ${ddmmyyyy(new Date(nowIso))}. Excel/Word/PDF ડાઉનલોડ ઉપલબ્ધ છે.`);
  };

  const handleLoadRecord = (record: SavedRecord) => {
    setMode(record.mode);
    setPartyName(record.partyName || '');
    setGstNo(record.gstNo || '');
    const matchedAg = availableAgencies.find((a) => a.name.trim().toLowerCase() === (record.partyName || '').trim().toLowerCase());
    if (matchedAg) {
      setSelectedAgencyId(matchedAg.id);
    } else if (record.partyName) {
      setSelectedAgencyId('custom');
    } else {
      setSelectedAgencyId('');
    }
    setSiteName(record.siteName || '');
    setBcntGlac(record.bcntGlac || '');
    setHoardingCount(record.hoardingCount || '');
    setInterestRate(Number(record.interestRate) || 18);
    setCgstRate(Number(record.cgstRate) || 9);
    setSecondTaxRate(Number(record.secondTaxRate) || (record.mode === 'private' ? 9 : 2));
    setRows(record.rows || []);
    if (record.rows && record.rows.length > 0) {
      setStartDateStr(ddmmyyyy(record.rows[0].start));
      setPeriodCount(record.rows.length);
      setLicenseFeeInput(record.rows[0].fee || 0);
    }
    setIsSaved(true);
    setSavedAt(record.savedAt);
    setStatusMessage(`સેવ થયેલ રેકોર્ડ લોડ થયો: ${record.partyName || record.siteName || 'Record'}`);
  };

  const handleArchiveRecord = (id: number) => {
    const rec = activeRecords.find((r) => r.id === id);
    if (!rec) return;
    const nextActive = activeRecords.filter((r) => r.id !== id);
    const nextArchive = [{ ...rec, status: 'archive' as const, archivedAt: new Date().toISOString() }, ...archiveRecords];
    saveStore(nextActive, nextArchive);
    setStatusMessage('રેકોર્ડ આર્કાઇવમાં ખસેડવામાં આવ્યો.');
  };

  const handleDeleteArchived = (id: number) => {
    const nextArchive = archiveRecords.filter((r) => r.id !== id);
    saveStore(activeRecords, nextArchive);
    setStatusMessage('આર્કાઇવમાંથી રેકોર્ડ દૂર થયો.');
  };

  const handleDeleteAllArchive = () => {
    if (confirm(lang === 'gu' ? 'શું તમે તમામ આર્કાઇવ કરેલા રેકોર્ડ્સ કાઢી નાખવા માંગો છો?' : 'Delete all archived records?')) {
      saveStore(activeRecords, []);
      setStatusMessage('તમામ આર્કાઇવ રેકોર્ડ્સ કાઢી નાખવામાં આવ્યા.');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const isPrivate = mode === 'private';
    const title = bcntInfo?.title || (isPrivate ? 'ખાનગી મિલ્કત લાયસન્સ ફી' : 'સુ.મ.પા. મિલ્કત લાયસન્સ ફી');
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += `"${title}"\n`;
    csvContent += `"અરજદાર/માલિક:","${partyName || '-'}","GST No.:","${gstNo || '-'}"\n`;
    csvContent += `"સ્થળ:","${siteName || '-'}","BCNT/GLAC:","${bcntInfo?.label || bcntGlac || '-'}"\n`;
    csvContent += `"ગણતરી તારીખ:","${ddmmyyyy(calculationDate)}"\n\n`;

    const headers = ['ક્રમ', 'પ્રથમ ગાળો', 'અંતિમ ગાળો', 'લાયસન્સ ફી', 'વ્યાજ શરૂ તારીખ', 'દિવસ', 'વ્યાજ 18%'];
    if (isPrivate) headers.push('CGST 9%', 'SGST 9%');
    else headers.push('TDS 2%');
    headers.push('કુલ રકમ');

    csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';

    processedRows.forEach((r) => {
      const rowArr = [
        r.no,
        ddmmyyyy(r.start),
        ddmmyyyy(r.end),
        r.fee,
        ddmmyyyy(r.interestStart),
        r.days,
        r.interest,
      ];
      if (isPrivate) {
        rowArr.push(r.cgst || 0, r.sgst || 0);
      } else {
        rowArr.push(r.tds || 0);
      }
      rowArr.push(r.total);
      csvContent += rowArr.map((v) => `"${v}"`).join(',') + '\n';
    });

    const totalRow = ['', 'કુલ', '', totals.fee, '', totals.days, totals.interest];
    if (isPrivate) totalRow.push(totals.taxOne, totals.taxTwo);
    else totalRow.push(totals.taxOne);
    totalRow.push(totals.total);
    csvContent += totalRow.map((v) => `"${v}"`).join(',') + '\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `License_Fee_Calculation_${partyName || 'Party'}_${ddmmyyyy(calculationDate)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Word Document
  const handleExportWord = () => {
    const isPrivate = mode === 'private';
    const title = bcntInfo?.title || (isPrivate ? 'ખાનગી મિલ્કત લાયસન્સ ફી રસીદ' : 'સુ.મ.પા. મિલ્કત લાયસન્સ ફી રસીદ');
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${title}</title><style>
        body { font-family: 'Nirmala UI', Arial, sans-serif; padding: 20px; }
        h2 { text-align: center; color: #104e47; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 12px; }
        th { background: #f0f0f0; }
        .text-right { text-align: right; }
      </style></head>
      <body>
        <h2>${title}</h2>
        <p><strong>અરજદારશ્રી/પબ્લીસીટીનું નામ:</strong> ${partyName || '-'}</p>
        <p><strong>GST No.:</strong> ${gstNo || '-'}</p>
        <p><strong>સ્થળ:</strong> ${siteName || '-'}</p>
        <p><strong>BCNT/GLAC:</strong> ${bcntInfo?.label || bcntGlac || '-'}</p>
        <p><strong>તારીખ:</strong> ${ddmmyyyy(calculationDate)}</p>
        <table>
          <thead>
            <tr>
              <th>ક્રમ</th>
              <th>પ્રથમ ગાળો</th>
              <th>અંતિમ ગાળો</th>
              <th>લાયસન્સ ફી</th>
              <th>દિવસ</th>
              <th>વ્યાજ (૧૮%)</th>
              ${isPrivate ? '<th>CGST 9%</th><th>SGST 9%</th>' : '<th>TDS 2%</th>'}
              <th>કુલ રકમ</th>
            </tr>
          </thead>
          <tbody>
            ${processedRows
              .map(
                (r) => `
              <tr>
                <td>${r.no}</td>
                <td>${ddmmyyyy(r.start)}</td>
                <td>${ddmmyyyy(r.end)}</td>
                <td class="text-right">₹${r.fee.toLocaleString('en-IN')}</td>
                <td class="text-right">${r.days}</td>
                <td class="text-right">₹${r.interest.toLocaleString('en-IN')}</td>
                ${
                  isPrivate
                    ? `<td class="text-right">₹${(r.cgst || 0).toLocaleString('en-IN')}</td><td class="text-right">₹${(r.sgst || 0).toLocaleString('en-IN')}</td>`
                    : `<td class="text-right">₹${(r.tds || 0).toLocaleString('en-IN')}</td>`
                }
                <td class="text-right"><strong>₹${r.total.toLocaleString('en-IN')}</strong></td>
              </tr>
            `
              )
              .join('')}
            <tr style="background:#eef4fb; font-weight:bold;">
              <td colspan="3">કુલ સરવાળો</td>
              <td class="text-right">₹${totals.fee.toLocaleString('en-IN')}</td>
              <td class="text-right">${totals.days}</td>
              <td class="text-right">₹${totals.interest.toLocaleString('en-IN')}</td>
              ${
                isPrivate
                  ? `<td class="text-right">₹${totals.taxOne.toLocaleString('en-IN')}</td><td class="text-right">₹${totals.taxTwo.toLocaleString('en-IN')}</td>`
                  : `<td class="text-right">₹${totals.taxOne.toLocaleString('en-IN')}</td>`
              }
              <td class="text-right">₹${totals.total.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `License_Fee_Statement_${partyName || 'Party'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredArchive = archiveRecords.filter((r) => {
    const query = archiveSearch.toLowerCase();
    return (
      r.partyName.toLowerCase().includes(query) ||
      r.siteName.toLowerCase().includes(query) ||
      r.bcntGlac.toLowerCase().includes(query) ||
      r.bcntGlacFull.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-teal-700/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
              <Calculator className="w-6 h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-emerald-100">
              {lang === 'gu'
                ? 'લાયસન્સ ફી ગણતરી સોફ્ટવેર (License Fee Auto-Calculator)'
                : 'License Fee Calculator & Period Breakdown Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {lang === 'gu'
              ? 'ખાનગી / સુ.મ.પા.ની મિલ્કતો પર લગાવેલ હોર્ડિંગ્સ & કિયોસ્ક માટે ૧૮% વ્યાજ, CGST/SGST/TDS અને ૧-૨૪ ત્રિમાસિક ગાળા ગણતરી સિસ્ટમ.'
              : 'Auto calculate quarterly periods, 18% interest logic, CGST/SGST/TDS with official receipt generator.'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-right shrink-0 flex flex-col items-end">
          <span className="text-[11px] text-emerald-200 font-semibold block flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-300" />
            {lang === 'gu' ? 'ગણતરી તારીખ:' : 'Calculation Date:'}
          </span>
          <input
            type="date"
            value={toIsoDateStr(calculationDate)}
            onChange={(e) => {
              if (e.target.value) {
                setCalculationDate(fromIso(e.target.value));
                setIsSaved(false);
              }
            }}
            className="bg-teal-950/80 text-amber-300 font-mono font-black text-sm px-2 py-0.5 rounded-lg border border-teal-600/50 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer mt-0.5"
          />
        </div>
      </div>

      {/* Main Grid: Input Controls (Left Column) & Interactive Table / Metrics (Right Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Primary Inputs & Controls */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 sticky top-20">
          <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <span>{lang === 'gu' ? 'મુખ્ય ગણતરી પેરામીટર્સ' : 'Main Parameters'}</span>
          </h3>

          <div className="space-y-3 text-xs md:text-sm">
            {/* Calculation Mode */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {lang === 'gu' ? '૧. ગણતરી પ્રકાર (Mode) *' : '1. Calculation Mode *'}
              </label>
              <select
                value={mode}
                onChange={(e) => handleModeChange(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="private">ખાનગી માલિકી — CGST (9%) + SGST (9%)</option>
                <option value="municipal">સુ.મ.પા.ની માલિકી — TDS (2%) [RCM]</option>
              </select>
            </div>

            {/* Agency Dropdown */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                <span>{lang === 'gu' ? '૨. એજન્સીનું નામ (Agency Dropdown) *' : '2. Select Agency *'}</span>
                {selectedAgencyId && selectedAgencyId !== 'custom' && (
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-bold">
                    {lang === 'gu' ? 'લિંક્ડ એજન્સી' : 'Linked Agency'}
                  </span>
                )}
              </label>
              <select
                value={selectedAgencyId}
                onChange={(e) => handleAgencySelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none text-xs md:text-sm"
              >
                <option value="">
                  {lang === 'gu' ? '-- એજન્સી પસંદ કરો (Select Agency) --' : '-- Select Agency --'}
                </option>
                {availableAgencies.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} {ag.agencyNo ? `(${ag.agencyNo})` : ''}
                  </option>
                ))}
                <option value="custom">
                  {lang === 'gu' ? '✍️ અન્ય / કસ્ટમ નામ (Custom Entry)' : '✍️ Other / Custom Party'}
                </option>
              </select>
            </div>

            {/* Party / Agency Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {lang === 'gu' ? 'અરજદાર / એજન્સીનું પૂરું નામ *' : 'Party / Agency Full Name *'}
              </label>
              <input
                type="text"
                placeholder={lang === 'gu' ? 'નામ ચકાસો અથવા સુધારો...' : 'Enter or edit name...'}
                value={partyName}
                onChange={(e) => {
                  setPartyName(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* GST No. */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">
                  {lang === 'gu' ? '૩. GST નંબર (GST Number)' : '3. GST Number'}
                </label>
                {gstNo === 'Not Applicable' ? (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300 font-bold">
                    Not Applicable
                  </span>
                ) : gstNo ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                    ✓ GST Linked
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                    {lang === 'gu' ? 'GST ઉપલબ્ધ નથી' : 'No GST'}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="24AAAAA0000A1Z5 / Not Applicable"
                value={gstNo}
                onChange={(e) => {
                  setGstNo(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Site / Location */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {lang === 'gu' ? '૪. હોર્ડિંગ / કિયોસ્ક સ્થળ (Location)' : '4. Location / Site'}
              </label>
              <input
                type="text"
                placeholder={lang === 'gu' ? 'સ્થળનું નામ લખો...' : 'Location address...'}
                value={siteName}
                onChange={(e) => {
                  setSiteName(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* BCNT / GLAC Selection & Hoarding Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'gu' ? '૫. BCNT/GLAC' : '5. BCNT/GLAC Code'}
                </label>
                <select
                  value={bcntGlac}
                  onChange={(e) => {
                    setBcntGlac(e.target.value);
                    setIsSaved(false);
                  }}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">{lang === 'gu' ? '-- પસંદ કરો --' : '-- Select Code --'}</option>
                  {BCNT_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {mode === 'private' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'gu' ? 'હોર્ડિંગ્સની સંખ્યા' : 'Hoarding Count'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={hoardingCount}
                    onChange={(e) => {
                      setHoardingCount(e.target.value);
                      setIsSaved(false);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none text-center font-bold"
                  />
                </div>
              )}
            </div>

            {/* Start Date & Number of Periods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>{lang === 'gu' ? '૬. પ્રથમ ગાળો (Start Date) *' : '6. First Quarter Start *'}</span>
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                </label>
                <input
                  type="date"
                  value={toIsoDateStr(startDateStr)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const formattedDmy = ddmmyyyy(val);
                      setStartDateStr(formattedDmy);
                      makeDefaultRows(formattedDmy, periodCount, licenseFeeInput);
                    } else {
                      setStartDateStr('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold text-blue-900 cursor-pointer shadow-2xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                {startDateStr && (
                  <span className="block text-[11px] text-teal-700 font-mono font-semibold mt-1 text-center bg-teal-50/80 py-0.5 rounded border border-teal-100">
                    {lang === 'gu' ? `પસંદગી: ${ddmmyyyy(startDateStr)}` : `Selected: ${ddmmyyyy(startDateStr)}`}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'gu' ? '૭. ગાળાની સંખ્યા (૧-૨૪)' : '7. Quarters Count (1-24)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={periodCount}
                  onChange={(e) => {
                    const cnt = Number(e.target.value);
                    setPeriodCount(cnt);
                    makeDefaultRows(startDateStr, cnt, licenseFeeInput);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold text-indigo-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quarterly Fee & Interest Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'gu' ? '૮. ત્રિમાસિક લાયસન્સ ફી (₹)' : '8. License Fee (₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={licenseFeeInput}
                  onChange={(e) => handleFeeInputChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-extrabold text-emerald-800 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'gu' ? '૯. વ્યાજ દર (%)' : '9. Interest Rate (%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => {
                    setInterestRate(Number(e.target.value));
                    setIsSaved(false);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Tax Rates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mode === 'private' ? (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">CGST (%)</label>
                    <input
                      type="number"
                      value={cgstRate}
                      onChange={(e) => {
                        setCgstRate(Number(e.target.value));
                        setIsSaved(false);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">SGST (%)</label>
                    <input
                      type="number"
                      value={secondTaxRate}
                      onChange={(e) => {
                        setSecondTaxRate(Number(e.target.value));
                        setIsSaved(false);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold"
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">TDS Rate (%) [RCM]</label>
                  <input
                    type="number"
                    value={secondTaxRate}
                    onChange={(e) => {
                      setSecondTaxRate(Number(e.target.value));
                      setIsSaved(false);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold"
                  />
                </div>
              )}
            </div>

            {/* Auto Chain Checkbox */}
            <label className="flex items-center gap-2 pt-1 font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoChain}
                onChange={(e) => setAutoChain(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>
                {lang === 'gu'
                  ? 'અંતિમ ગાળો બદલાય ત્યારે પછીના તમામ ગાળા આપોઆપ ગોઠવો'
                  : 'Auto-chain next quarters when end date changes'}
              </span>
            </label>
          </div>

          {/* Actions Column Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => makeDefaultRows(startDateStr, periodCount, licenseFeeInput)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'gu' ? 'ગાળા રિફ્રેશ કરો' : 'Rebuild'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveRecord}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{lang === 'gu' ? 'સેવ કરો' : 'Save Record'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={!isSaved}
                onClick={handleExportExcel}
                className="py-1.5 bg-emerald-700 disabled:opacity-50 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                disabled={!isSaved}
                onClick={handleExportWord}
                className="py-1.5 bg-blue-700 disabled:opacity-50 hover:bg-blue-800 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word</span>
              </button>

              <button
                type="button"
                disabled={!isSaved}
                onClick={() => setIsPrintModalOpen(true)}
                className="py-1.5 bg-amber-600 disabled:opacity-50 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF/પ્રિન્ટ</span>
              </button>
            </div>

            {/* Status Alert Banner */}
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                isSaved
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSaved ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="leading-tight">{statusMessage}</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Live Calculation Matrix Table & Records History */}
        <div className="lg:col-span-8 space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-bold">
                {lang === 'gu' ? 'લાયસન્સ ફી કુલ:' : 'License Fee:'}
              </span>
              <span className="text-sm md:text-base font-black text-slate-900 font-mono">
                {money(totals.fee)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-bold">
                {lang === 'gu' ? '૧૮% વ્યાજ કુલ:' : 'Interest Total:'}
              </span>
              <span className="text-sm md:text-base font-black text-amber-700 font-mono">
                {money(totals.interest)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-bold">
                {mode === 'private' ? 'CGST (9%) કુલ:' : 'TDS (2%) કુલ:'}
              </span>
              <span className="text-sm md:text-base font-black text-blue-700 font-mono">
                {money(totals.taxOne)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-bold">
                {mode === 'private' ? 'SGST (9%) કુલ:' : 'અન્ય ટેક્સ:'}
              </span>
              <span className="text-sm md:text-base font-black text-indigo-700 font-mono">
                {money(totals.taxTwo)}
              </span>
            </div>

            <div className="bg-teal-900 text-white p-3 rounded-xl border border-teal-800 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[11px] text-teal-200 block font-bold">
                {lang === 'gu' ? 'કુલ ચૂકવવાપાત્ર:' : 'Grand Total:'}
              </span>
              <span className="text-base md:text-lg font-black text-emerald-300 font-mono">
                {money(totals.total)}
              </span>
            </div>
          </div>

          {/* Interactive Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs md:text-sm">
                  {lang === 'gu'
                    ? `ત્રિમાસિક હપ્તા વાઇઝ ગણતરી બ્રેકડાઉન (${processedRows.length} ક્વાર્ટર)`
                    : `Quarterly Breakdown Table (${processedRows.length} quarters)`}
                </h3>
              </div>
              <span className="text-[11px] bg-teal-800 text-teal-100 px-2.5 py-0.5 rounded-md font-mono font-bold">
                {mode === 'private' ? 'ખાનગી (18% Int + 18% GST)' : 'સુ.મ.પા (18% Int + 2% TDS)'}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-2.5 py-2 w-10 text-center">#</th>
                    <th className="px-3 py-2">{lang === 'gu' ? 'પ્રથમ ગાળો' : 'Start Date'}</th>
                    <th className="px-3 py-2">{lang === 'gu' ? 'અંતિમ ગાળો' : 'End Date'}</th>
                    <th className="px-3 py-2 text-right">{lang === 'gu' ? 'લાયસન્સ ફી (₹)' : 'Fee (₹)'}</th>
                    <th className="px-2.5 py-2 text-center">{lang === 'gu' ? 'વ્યાજ શરૂ તારીખ' : 'Int Start'}</th>
                    <th className="px-2 py-2 text-center">{lang === 'gu' ? 'દિવસ' : 'Days'}</th>
                    <th className="px-3 py-2 text-right">{lang === 'gu' ? 'વ્યાજ 18%' : 'Int 18%'}</th>
                    {mode === 'private' ? (
                      <>
                        <th className="px-3 py-2 text-right">CGST 9%</th>
                        <th className="px-3 py-2 text-right">SGST 9%</th>
                      </>
                    ) : (
                      <th className="px-3 py-2 text-right">TDS 2%</th>
                    )}
                    <th className="px-3 py-2 text-right font-extrabold">{lang === 'gu' ? 'કુલ રકમ' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {processedRows.map((r, idx) => (
                    <tr key={r.no} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2.5 py-2 text-center font-mono font-bold text-slate-500">{r.no}</td>

                      {/* Start Date Editable Input */}
                      <td className="px-2 py-1.5">
                        <input
                          type="date"
                          value={toIsoDateStr(r.start)}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleRowCellChange(idx, 'start', e.target.value);
                            }
                          }}
                          className="w-28 px-1.5 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                        />
                      </td>

                      {/* End Date Editable Input */}
                      <td className="px-2 py-1.5">
                        <input
                          type="date"
                          value={toIsoDateStr(r.end)}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleRowCellChange(idx, 'end', e.target.value);
                            }
                          }}
                          className="w-28 px-1.5 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                        />
                      </td>

                      {/* Fee Editable Input */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          value={r.fee}
                          onChange={(e) => handleRowCellChange(idx, 'fee', e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-right text-xs font-extrabold text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        />
                      </td>

                      <td className="px-2.5 py-2 text-center font-mono text-slate-500 text-[11px]">
                        {ddmmyyyy(r.interestStart)}
                      </td>

                      <td className="px-2 py-2 text-center font-mono font-bold text-amber-800 text-[11px]">
                        {r.days}
                      </td>

                      <td className="px-3 py-2 text-right font-mono font-semibold text-amber-700">
                        {money(r.interest)}
                      </td>

                      {mode === 'private' ? (
                        <>
                          <td className="px-3 py-2 text-right font-mono text-blue-700">{money(r.cgst || 0)}</td>
                          <td className="px-3 py-2 text-right font-mono text-indigo-700">{money(r.sgst || 0)}</td>
                        </>
                      ) : (
                        <td className="px-3 py-2 text-right font-mono text-blue-700">{money(r.tds || 0)}</td>
                      )}

                      <td className="px-3 py-2 text-right font-mono font-black text-teal-900">
                        {money(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-extrabold text-xs">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-right font-sans uppercase">
                      {lang === 'gu' ? 'કુલ સરવાળો (Totals):' : 'Grand Totals:'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{money(totals.fee)}</td>
                    <td className="px-2.5 py-2.5"></td>
                    <td className="px-2 py-2.5 text-center font-mono text-amber-300">{totals.days}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-300">{money(totals.interest)}</td>
                    {mode === 'private' ? (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono">{money(totals.taxOne)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{money(totals.taxTwo)}</td>
                      </>
                    ) : (
                      <td className="px-3 py-2.5 text-right font-mono">{money(totals.taxOne)}</td>
                    )}
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-400 text-sm">
                      {money(totals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Active Records & Archive Records Management Store Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  {lang === 'gu' ? 'સેવ થયેલ ગણતરી હિસ્ટ્રી અને આર્કાઇવ સ્ટોર' : 'Calculation History & Archive Store'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold px-2.5 py-1 rounded-full">
                  {activeRecords.length} Active Records
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2.5 py-1 rounded-full">
                  {archiveRecords.length} Archived
                </span>
              </div>
            </div>

            {/* Active Records List Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {lang === 'gu' ? '૧. એક્ટિવ ગણતરી રેકોર્ડ્સ (Active Calculations):' : '1. Active Calculations:'}
              </h4>

              {activeRecords.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                  {lang === 'gu' ? 'હજુ સુધી કોઈ એક્ટિવ ગણતરી રેકોર્ડ સેવ થયો નથી.' : 'No active records saved yet.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto">
                  {activeRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <strong className="text-xs font-bold text-slate-900 truncate">
                            🏢 {rec.partyName || rec.siteName || 'વિના નામ'}
                          </strong>
                          <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded shrink-0">
                            {rec.mode === 'private' ? 'ખાનગી' : 'સુ.મ.પા'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>📍 {rec.siteName || 'No site'}</span>
                          <span className="font-mono font-bold text-slate-800">{money(rec.totals.total)}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                        <span className="text-slate-400 font-mono text-[10px]">
                          {ddmmyyyy(new Date(rec.savedAt))}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLoadRecord(rec)}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
                          >
                            {lang === 'gu' ? 'ખોલો' : 'Open'}
                          </button>
                          <button
                            onClick={() => handleArchiveRecord(rec.id)}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition-colors"
                            title="આર્કાઇવમાં મોકલો"
                          >
                            {lang === 'gu' ? 'આર્કાઇવ' : 'Archive'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Archive Search & Management Toolbar */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {lang === 'gu' ? '૨. આર્કાઇવ રેકોર્ડ્સ (Archive Records):' : '2. Archive Records:'}
                </h4>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder={lang === 'gu' ? 'શોધો...' : 'Search archive...'}
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {archiveRecords.length > 0 && (
                    <button
                      onClick={handleDeleteAllArchive}
                      className="px-2 py-1 bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{lang === 'gu' ? 'તમામ આર્કાઇવ દૂર કરો' : 'Clear Archive'}</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredArchive.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                  {lang === 'gu' ? 'કોઈ આર્કાઇવ કરેલા રેકોર્ડ્સ મળ્યા નથી.' : 'No archived records found.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
                  {filteredArchive.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs opacity-90 hover:opacity-100 transition-all"
                    >
                      <div className="font-bold text-slate-900 truncate">🏢 {rec.partyName || 'Unnamed'}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>{rec.siteName || '-'}</span>
                        <strong className="font-mono text-teal-800">{money(rec.totals.total)}</strong>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                        <span className="text-slate-400 font-mono">{ddmmyyyy(new Date(rec.savedAt))}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleLoadRecord(rec)}
                            className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 text-[10px]"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDeleteArchived(rec.id)}
                            className="p-1 text-rose-600 hover:bg-rose-100 rounded"
                            title="ડિલીટ કરો"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official Twin Printable Receipt Modal ("પ્રતિ ૧" & "પ્રતિ ૨") */}
      {isPrintModalOpen && (() => {
        const quartersName = processedRows.length > 0 ? processedRows.map((r) => `Q${r.no}`).join('-') : 'Q1-Q4';
        const calcFileName = `${partyName || 'Agency'} - ${quartersName}`;

        const handleDownloadCalcReceipt = () => {
          const htmlContent = `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>${calcFileName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #0f172a; padding: 20px; }
    .box { border: 2px solid #334155; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
    h1 { text-align: center; font-size: 20px; margin: 0; }
    h2 { text-align: center; font-size: 14px; color: #047857; margin: 4px 0 12px 0; }
    .row { display: flex; justify-content: space-between; border-bottom: 1px dotted #cbd5e1; padding: 4px 0; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    .table th, .table td { border: 1px solid #94a3b8; padding: 8px; text-align: left; }
    .table th { background: #f1f5f9; }
    .total { background: #0f172a; color: white; font-weight: bold; }
  </style>
</head>
<body>
  <div class="box">
    <h1>સુરત મહાનગરપાલિકા</h1>
    <h2>નવો પુર્વ (સરથાણા) ઝોન-બી - લાયસન્સ ફી પહોંચ (પ્રતિ ૧)</h2>
    <div class="row"><span>અરજદાર/એજન્સી:</span><strong>${partyName || '—'}</strong></div>
    <div class="row"><span>GST No:</span><strong>${gstNo || '—'}</strong></div>
    <div class="row"><span>સમયગાળો:</span><strong>${quartersName}</strong></div>
    <table class="table">
      <thead>
        <tr><th>ક્વાર્ટર</th><th>બેઝ ફી</th><th>SGST (9%)</th><th>CGST (9%)</th><th>કુલ રકમ</th></tr>
      </thead>
      <tbody>
        ${processedRows
          .map(
            (r) =>
              `<tr><td>Q${r.no} (${ddmmyyyy(r.start)} - ${ddmmyyyy(r.end)})</td><td>₹${r.fee.toLocaleString(
                'en-IN'
              )}</td><td>₹${(r.sgst || 0).toLocaleString(
                'en-IN'
              )}</td><td>₹${(r.cgst || 0).toLocaleString(
                'en-IN'
              )}</td><td>₹${r.total.toLocaleString('en-IN')}</td></tr>`
          )
          .join('')}
        <tr class="total">
          <td colspan="4">કુલ ચૂકવવા પાત્ર રકમ:</td>
          <td>₹${totals.total.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${calcFileName}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.print();
        };

        return (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-auto space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Controls */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 print:hidden gap-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {lang === 'gu'
                      ? 'ઓફિશિયલ લાયસન્સ ફી રસીદ પ્રિન્ટ પ્રિવ્યૂ (પ્રતિ ૧ & પ્રતિ ૨)'
                      : 'Official License Fee Receipt Print Preview (Twin Copies)'}
                  </h3>
                  <p className="text-xs font-mono text-emerald-800 font-bold">
                    📁 {lang === 'gu' ? 'ફાઈલનું નામ:' : 'File Name:'} {calcFileName}.html
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCalcReceipt}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'gu' ? 'સેવ કરો & PDF ડાઉનલોડ' : 'Save & Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'gu' ? 'પ્રિન્ટ' : 'Print'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-bold text-xs hover:bg-slate-100"
                >
                  {lang === 'gu' ? 'બંધ કરો' : 'Close'}
                </button>
              </div>
            </div>

            {/* Printable Twin Receipt Layout Container */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-6 print:p-0 print:border-none print:bg-white text-slate-900 font-sans">
              {/* Copy 1: પ્રતિ ૧ */}
              <div className="bg-white border-2 border-slate-400 p-5 rounded-lg space-y-3 relative shadow-2xs">
                <div className="absolute top-3 right-4 border border-slate-400 px-2.5 py-0.5 text-xs font-bold text-slate-700 rounded">
                  પ્રતિ ૧
                </div>

                <div className="text-center mb-1">
                  <h1 className="text-xl font-black text-slate-900 tracking-wide">સુરત મહાનગરપાલિકા</h1>
                  <h2 className="text-sm font-extrabold text-emerald-800">નવો પુર્વ (સરથાણા) ઝોન-બી</h2>
                </div>

                <h2 className="text-center text-base font-black text-slate-900 underline decoration-slate-900">
                  {bcntInfo?.title ||
                    (mode === 'private'
                      ? 'ખાનગી મિલ્કત/જગ્યા પર કાયદેસર ઉભા કરેલ હોડિંગ્સ'
                      : 'સુ.મ.પા.ની મિલ્કત/જગ્યા પર કાયદેસર ઉભા કરેલ હોડિંગ્સ')}
                </h2>

                <div className="grid grid-cols-1 gap-2 text-xs md:text-sm font-medium">
                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">અરજદારશ્રી/પબ્લીસીટીનું નામ:-</span>
                    <strong className="text-slate-900">{partyName || '—'}</strong>
                  </div>

                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">GST No.:-</span>
                    <strong className="font-mono text-slate-900">{gstNo || '—'}</strong>
                  </div>

                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">લાયસન્સ ફી નો સમયગાળો:-</span>
                    <strong className="text-slate-900">
                      {processedRows.length > 0
                        ? `${ddmmyyyy(processedRows[0].start)} થી ${ddmmyyyy(
                            processedRows[processedRows.length - 1].end
                          )} (${processedRows.length} ક્વાર્ટર)`
                        : '—'}
                    </strong>
                  </div>

                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">BCNT/GLAC :-</span>
                    <strong className="text-slate-900">{bcntInfo?.label || bcntGlac || '—'}</strong>
                  </div>

                  {mode === 'private' && (
                    <div className="flex border-b border-dotted border-slate-400 pb-1">
                      <span className="w-64 font-bold text-slate-700 shrink-0">હોડિંગ્સની સંખ્યા :-</span>
                      <strong className="text-slate-900">{hoardingCount || '—'}</strong>
                    </div>
                  )}

                  {siteName && (
                    <div className="flex border-b border-dotted border-slate-400 pb-1">
                      <span className="w-64 font-bold text-slate-700 shrink-0">સ્થળ :-</span>
                      <strong className="text-slate-900">{siteName}</strong>
                    </div>
                  )}
                </div>

                {/* Amount Matrix */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>હોડિંગ્સની લાયસન્સ ફી:</span>
                    <strong className="text-slate-900">{money(totals.fee)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>+ લાયસન્સ ફીના {totals.days} દિવસના ૧૮% વ્યાજની રકમ:</span>
                    <strong className="text-amber-800">{money(totals.interest)}</strong>
                  </div>
                  {mode === 'private' ? (
                    <>
                      <div className="flex justify-between">
                        <span>+ SGST (9%):</span>
                        <strong>{money(totals.taxTwo)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>+ CGST (9%):</span>
                        <strong>{money(totals.taxOne)}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>+ TDS (2%):</span>
                      <strong>{money(totals.taxOne)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-400">
                    <span>કુલ રકમ:</span>
                    <strong className="text-emerald-800">{money(totals.total)}</strong>
                  </div>
                </div>

                {/* Quarters Mini Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-[10px] border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-800 font-bold">
                      <tr>
                        <th className="border border-slate-300 p-1">ક્વા.</th>
                        <th className="border border-slate-300 p-1">સમયગાળો</th>
                        <th className="border border-slate-300 p-1">દિ.</th>
                        <th className="border border-slate-300 p-1">ફી</th>
                        <th className="border border-slate-300 p-1">વ્યાજ</th>
                        <th className="border border-slate-300 p-1">{mode === 'private' ? 'કર' : 'TDS'}</th>
                        <th className="border border-slate-300 p-1">કુલ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {processedRows.map((r) => (
                        <tr key={r.no}>
                          <td className="border border-slate-300 p-0.5 font-bold">{r.no}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">
                            {ddmmyyyy(r.start)} - {ddmmyyyy(r.end)}
                          </td>
                          <td className="border border-slate-300 p-0.5 font-mono">{r.days}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">{money(r.fee)}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">{money(r.interest)}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">
                            {money((r.cgst || 0) + (r.sgst || 0) + (r.tds || 0))}
                          </td>
                          <td className="border border-slate-300 p-0.5 font-mono font-bold">{money(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end pt-4 font-bold text-xs text-slate-900">
                  <span>તારીખ: {ddmmyyyy(calculationDate)}</span>
                  <span className="border-t border-slate-900 pt-1 px-6">જમા કરનારની સહી</span>
                </div>
              </div>

              {/* Cut line */}
              <div className="border-t-2 border-dashed border-slate-400 my-4 text-center text-xs text-slate-500 font-bold">
                ✂️ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              </div>

              {/* Copy 2: પ્રતિ ૨ */}
              <div className="bg-white border-2 border-slate-400 p-5 rounded-lg space-y-3 relative shadow-2xs">
                <div className="absolute top-3 right-4 border border-slate-400 px-2.5 py-0.5 text-xs font-bold text-slate-700 rounded">
                  પ્રતિ ૨
                </div>

                <div className="text-center mb-1">
                  <h1 className="text-xl font-black text-slate-900 tracking-wide">સુરત મહાનગરપાલિકા</h1>
                  <h2 className="text-sm font-extrabold text-emerald-800">નવો પુર્વ (સરથાણા) ઝોન-બી</h2>
                </div>

                <h2 className="text-center text-base font-black text-slate-900 underline decoration-slate-900">
                  {bcntInfo?.title ||
                    (mode === 'private'
                      ? 'ખાનગી મિલ્કત/જગ્યા પર કાયદેસર ઉભા કરેલ હોડિંગ્સ'
                      : 'સુ.મ.પા.ની મિલ્કત/જગ્યા પર કાયદેસર ઉભા કરેલ હોડિંગ્સ')}
                </h2>

                <div className="grid grid-cols-1 gap-2 text-xs md:text-sm font-medium">
                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">અરજદારશ્રી/પબ્લીસીટીનું નામ:-</span>
                    <strong className="text-slate-900">{partyName || '—'}</strong>
                  </div>

                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">GST No.:-</span>
                    <strong className="font-mono text-slate-900">{gstNo || '—'}</strong>
                  </div>

                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">લાયસન્સ ફી નો સમયગાળો:-</span>
                    <strong className="text-slate-900">
                      {processedRows.length > 0
                        ? `${ddmmyyyy(processedRows[0].start)} થી ${ddmmyyyy(
                            processedRows[processedRows.length - 1].end
                          )} (${processedRows.length} ક્વાર્ટર)`
                        : '—'}
                    </strong>
                  </div>

                  <div className="flex border-b border-dotted border-slate-400 pb-1">
                    <span className="w-64 font-bold text-slate-700 shrink-0">BCNT/GLAC :-</span>
                    <strong className="text-slate-900">{bcntInfo?.label || bcntGlac || '—'}</strong>
                  </div>

                  {mode === 'private' && (
                    <div className="flex border-b border-dotted border-slate-400 pb-1">
                      <span className="w-64 font-bold text-slate-700 shrink-0">હોડિંગ્સની સંખ્યા :-</span>
                      <strong className="text-slate-900">{hoardingCount || '—'}</strong>
                    </div>
                  )}

                  {siteName && (
                    <div className="flex border-b border-dotted border-slate-400 pb-1">
                      <span className="w-64 font-bold text-slate-700 shrink-0">સ્થળ :-</span>
                      <strong className="text-slate-900">{siteName}</strong>
                    </div>
                  )}
                </div>

                {/* Amount Matrix */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>હોડિંગ્સની લાયસન્સ ફી:</span>
                    <strong className="text-slate-900">{money(totals.fee)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>+ લાયસન્સ ફીના {totals.days} દિવસના ૧૮% વ્યાજની રકમ:</span>
                    <strong className="text-amber-800">{money(totals.interest)}</strong>
                  </div>
                  {mode === 'private' ? (
                    <>
                      <div className="flex justify-between">
                        <span>+ SGST (9%):</span>
                        <strong>{money(totals.taxTwo)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>+ CGST (9%):</span>
                        <strong>{money(totals.taxOne)}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>+ TDS (2%):</span>
                      <strong>{money(totals.taxOne)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-400">
                    <span>કુલ રકમ:</span>
                    <strong className="text-emerald-800">{money(totals.total)}</strong>
                  </div>
                </div>

                {/* Quarters Mini Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-[10px] border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-800 font-bold">
                      <tr>
                        <th className="border border-slate-300 p-1">ક્વા.</th>
                        <th className="border border-slate-300 p-1">સમયગાળો</th>
                        <th className="border border-slate-300 p-1">દિ.</th>
                        <th className="border border-slate-300 p-1">ફી</th>
                        <th className="border border-slate-300 p-1">વ્યાજ</th>
                        <th className="border border-slate-300 p-1">{mode === 'private' ? 'કર' : 'TDS'}</th>
                        <th className="border border-slate-300 p-1">કુલ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {processedRows.map((r) => (
                        <tr key={r.no}>
                          <td className="border border-slate-300 p-0.5 font-bold">{r.no}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">
                            {ddmmyyyy(r.start)} - {ddmmyyyy(r.end)}
                          </td>
                          <td className="border border-slate-300 p-0.5 font-mono">{r.days}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">{money(r.fee)}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">{money(r.interest)}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">
                            {money((r.cgst || 0) + (r.sgst || 0) + (r.tds || 0))}
                          </td>
                          <td className="border border-slate-300 p-0.5 font-mono font-bold">{money(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end pt-4 font-bold text-xs text-slate-900">
                  <span>તારીખ: {ddmmyyyy(calculationDate)}</span>
                  <span className="border-t border-slate-900 pt-1 px-6">જમા કરનારની સહી</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
