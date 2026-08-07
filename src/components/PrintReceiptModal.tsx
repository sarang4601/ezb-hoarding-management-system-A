import React, { useState } from 'react';
import { Printer, X, CheckCircle2, Building2, Download, Save, Eye } from 'lucide-react';
import { QuarterlyFee } from '../types';

interface PrintReceiptModalProps {
  fee?: QuarterlyFee;
  fees?: QuarterlyFee[];
  isDraft?: boolean;
  onConfirmSave?: () => void;
  onClose: () => void;
  lang: 'gu' | 'en';
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  fee,
  fees,
  isDraft = false,
  onConfirmSave,
  onClose,
  lang,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const feeList = fees && fees.length > 0 ? fees : fee ? [fee] : [];

  if (feeList.length === 0) return null;

  // Derive file name: "Agency Name - Quarters"
  const firstAgency = feeList[0]?.agencyName || 'Agency';
  const quartersList = Array.from(new Set(feeList.map((f) => f.quarter)));
  let quartersStr = quartersList.length === 1 ? quartersList[0] : quartersList.join('-');
  if (quartersStr === 'Annual') quartersStr = 'Q1-Q4';

  const customFileName = `${firstAgency} - ${quartersStr}`;

  // Helper to trigger HTML/PDF document download with exact name "Agency Name - Quarters"
  const handleDownloadFile = () => {
    const currentDate = new Date().toLocaleDateString('gu-IN');
    const currentTime = new Date().toLocaleTimeString('gu-IN');

    const htmlContent = `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>${customFileName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 2px solid #0f172a; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 900; color: #1e3a8a; uppercase; }
    .header h2 { margin: 4px 0 0 0; font-size: 16px; font-weight: 800; color: #0f766e; }
    .header p { margin: 6px 0 0 0; font-size: 12px; font-weight: 700; background: #f1f5f9; display: inline-block; padding: 4px 12px; border-radius: 20px; border: 1px solid #cbd5e1; }
    
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; margin-bottom: 20px; font-family: monospace; }
    .info-item span { display: block; color: #64748b; font-size: 11px; }
    .info-item strong { color: #0f172a; font-size: 13px; }

    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .details-table td.label { color: #64748b; width: 40%; }
    .details-table td.value { font-weight: 700; color: #0f172a; }

    .calc-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .calc-table th { background: #f1f5f9; padding: 10px; text-align: left; font-weight: 800; border-bottom: 1px solid #cbd5e1; }
    .calc-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; }
    .calc-table tr.total-row { background: #0f172a; color: #ffffff; font-weight: 900; font-size: 14px; }

    .signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
    .sig-box { text-align: center; width: 180px; }
    .sig-line { border-bottom: 1px dashed #64748b; height: 35px; margin-bottom: 4px; }

    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  ${feeList
    .map(
      (item) => `
  <div class="container" style="margin-bottom: 30px;">
    <div class="header">
      <h1>સુરત મહાનગરપાલિકા</h1>
      <h2>નવો પુર્વ (સરથાણા) ઝોન-બી</h2>
      <p>હોર્ડિંગ એસ્ટેટ શાખા - અધિકૃત લાયસન્સ ફી ચૂકવણી પહોંચ</p>
    </div>

    <div class="info-grid">
      <div class="info-item"><span>રસીદ નંબર:</span><strong>${item.receiptNo}</strong></div>
      <div class="info-item" style="text-align:right;"><span>તારીખ:</span><strong>${item.receiptDate}</strong></div>
      <div class="info-item"><span>નાણાકીય વર્ષ:</span><strong>${item.financialYear} (${item.quarter})</strong></div>
      <div class="info-item" style="text-align:right;"><span>પેમેન્ટ સ્ટેટસ:</span><strong style="color:#15803d;">${item.paymentStatus}</strong></div>
    </div>

    <table class="details-table">
      <tr><td class="label">એજન્સીનું નામ:</td><td class="value">${item.agencyName}</td></tr>
      <tr><td class="label">હોર્ડિંગ રજીસ્ટ્રેશન નંબર:</td><td class="value">${item.hoardingNo}</td></tr>
      <tr><td class="label">ચૂકવણી મોડ:</td><td class="value">${item.paymentMode}</td></tr>
      ${item.remarks ? `<tr><td class="label">રિમાર્ક્સ:</td><td class="value">${item.remarks}</td></tr>` : ''}
    </table>

    <table class="calc-table">
      <thead>
        <tr><th>વિગતો (Particulars)</th><th style="text-align:right;">રકમ (₹)</th></tr>
      </thead>
      <tbody>
        <tr><td>ત્રિમાસિક લાયસન્સ ફી (Base Quarter Fee)</td><td style="text-align:right;">₹${item.quarterlyLicenseFee.toLocaleString('en-IN')}</td></tr>
        ${item.interest > 0 ? `<tr><td style="color:#b45309;">વ્યાજ / પેનલ્ટી (Interest)</td><td style="text-align:right; color:#b45309;">+ ₹${item.interest.toLocaleString('en-IN')}</td></tr>` : ''}
        ${item.deductions > 0 ? `<tr><td style="color:#b91c1c;">મજરે રકમ (Deductions)</td><td style="text-align:right; color:#b91c1c;">- ₹${item.deductions.toLocaleString('en-IN')}</td></tr>` : ''}
        <tr style="background:#f8fafc; font-weight:bold;"><td>કરપાત્ર રકમ (Taxable Amount)</td><td style="text-align:right;">₹${item.taxableAmount.toLocaleString('en-IN')}</td></tr>
        <tr><td>SGST (9%)</td><td style="text-align:right;">₹${item.sgst.toLocaleString('en-IN')}</td></tr>
        <tr><td>CGST (9%)</td><td style="text-align:right;">₹${item.cgst.toLocaleString('en-IN')}</td></tr>
        <tr class="total-row"><td>કુલ ચૂકવેલ રકમ (Total Received)</td><td style="text-align:right;">₹${item.totalAmount.toLocaleString('en-IN')}</td></tr>
      </tbody>
    </table>

    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><span>એજન્સી સહી</span></div>
      <div class="sig-box"><div class="sig-line"></div><span>મહાનગરપાલિકા હિસાબી શાખા</span></div>
    </div>
  </div>`
    )
    .join('')}
  <script>
    window.onload = function() {
      // Auto trigger print when opened directly
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    // Custom file name as requested: "Agency Name - Quarters"
    link.setAttribute('download', `${customFileName}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Main Handle Save Data & Download PDF / Print
  const handleSaveAndDownload = () => {
    if (onConfirmSave && !isSaved) {
      onConfirmSave();
      setIsSaved(true);
    }
    // 1. Download formatted file with name "Agency Name - Quarters"
    handleDownloadFile();
    // 2. Open print dialog
    window.print();
  };

  const handlePrintOnly = () => {
    if (onConfirmSave && !isSaved) {
      onConfirmSave();
      setIsSaved(true);
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-300 overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm md:text-base">
              {isDraft
                ? lang === 'gu'
                  ? 'પ્રિન્ટ પ્રિવ્યુ & સેવ (Print Preview)'
                  : 'Print Preview & Save Receipt'
                : lang === 'gu'
                ? 'ત્રિમાસિક લાયસન્સ ફી ચૂકવણી રસીદ'
                : 'Quarterly Fee Payment Receipt'}
            </span>
            {feeList.length > 1 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                {feeList.length} {lang === 'gu' ? 'રસીદો' : 'Receipts'}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Workflow Banner */}
        <div className="bg-amber-50 border-b border-amber-200 p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-amber-900 print:hidden">
          <div className="flex items-center gap-2">
            {isSaved ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Save className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              {isSaved
                ? lang === 'gu'
                  ? '✓ ડેટા સેવ થઈ ગયો છે અને રસીદ ડાઉનલોડ થઈ ગઈ છે.'
                  : '✓ Data automatically saved and receipt downloaded.'
                : lang === 'gu'
                ? 'પ્રિન્ટ પ્રિવ્યુ: ચકાસીને નીચે "સેવ કરો & PDF ડાઉનલોડ" પર ક્લિક કરો.'
                : 'Print Preview: Verify details, then click "Save & Download PDF".'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndDownload}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {lang === 'gu' ? 'સેવ કરો & PDF ડાઉનલોડ' : 'Save & Download PDF'}
              </span>
            </button>

            <button
              onClick={handlePrintOnly}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'gu' ? 'પ્રિન્ટ કરો' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Expected File Name Badge Bar */}
        <div className="bg-slate-100 px-5 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-700 print:hidden">
          <span>
            📁 {lang === 'gu' ? 'ડાઉનલોડ ફાઈલનું નામ:' : 'File Download Name:'}{' '}
            <strong className="text-blue-900 font-extrabold">{customFileName}.html</strong>
          </span>
          <span className="text-[11px] text-slate-500 font-sans">
            ({firstAgency} - {quartersStr})
          </span>
        </div>

        {/* Official Receipt Content Body */}
        <div className="p-6 space-y-8 text-slate-800 print:p-0 overflow-y-auto">
          {feeList.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`space-y-5 ${idx > 0 ? 'pt-8 border-t-2 border-dashed border-slate-300 print:border-none print:pt-0 print:break-before-page' : ''}`}
            >
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="flex justify-center mb-1">
                  <Building2 className="w-9 h-9 text-blue-900" />
                </div>
                <h1 className="text-2xl font-black tracking-wide text-blue-950 uppercase">
                  {lang === 'gu' ? 'સુરત મહાનગરપાલિકા' : 'SURAT MUNICIPAL CORPORATION'}
                </h1>
                <h2 className="text-base font-extrabold text-teal-800 tracking-normal">
                  {lang === 'gu' ? 'નવો પુર્વ (સરથાણા) ઝોન-બી' : 'NEW EAST (SARTHANA) ZONE-B'}
                </h2>
                <p className="text-xs font-bold text-slate-700 bg-slate-100 py-1 px-3 rounded-full inline-block border border-slate-300 mt-1">
                  {lang === 'gu'
                    ? 'હોર્ડિંગ એસ્ટેટ શાખા - અધિકૃત લાયસન્સ ફી ચૂકવણી પહોંચ'
                    : 'HOARDING ESTATE DEPT - OFFICIAL LICENSE FEE PAYMENT RECEIPT'}
                </p>
              </div>

              {/* Receipt Top Info */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">{lang === 'gu' ? 'રસીદ નંબર:' : 'Receipt No:'}</span>
                  <span className="font-extrabold text-blue-900 text-sm">{item.receiptNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">{lang === 'gu' ? 'તારીખ:' : 'Receipt Date:'}</span>
                  <span className="font-bold text-slate-900">{item.receiptDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{lang === 'gu' ? 'નાણાકીય વર્ષ:' : 'Financial Year:'}</span>
                  <span className="font-bold text-slate-800">{item.financialYear} ({item.quarter})</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">{lang === 'gu' ? 'પેમેન્ટ સ્ટેટસ:' : 'Payment Status:'}</span>
                  <span className="font-extrabold text-emerald-700 uppercase">{item.paymentStatus}</span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">{lang === 'gu' ? 'એજન્સીનું નામ:' : 'Agency Name:'}</span>
                  <span className="font-bold text-slate-900">{item.agencyName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">{lang === 'gu' ? 'હોર્ડિંગ રજીસ્ટ્રેશન નંબર:' : 'Hoarding No:'}</span>
                  <span className="font-mono font-bold text-slate-900">{item.hoardingNo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">{lang === 'gu' ? 'ચૂકવણીનો પ્રકાર (Mode):' : 'Payment Mode:'}</span>
                  <span className="font-semibold text-slate-800">{item.paymentMode}</span>
                </div>
                {item.remarks && (
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">{lang === 'gu' ? 'વિગત / રિમાર્કસ:' : 'Remarks:'}</span>
                    <span className="font-medium text-slate-700">{item.remarks}</span>
                  </div>
                )}
              </div>

              {/* Fee Calculation Breakdown Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                    <tr>
                      <th className="p-2.5">{lang === 'gu' ? 'વિગતો (Particulars)' : 'Particulars'}</th>
                      <th className="p-2.5 text-right">{lang === 'gu' ? 'રકમ (₹)' : 'Amount (₹)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="p-2">{lang === 'gu' ? 'ત્રિમાસિક લાયસન્સ ફી (Base Quarter Fee)' : 'Base Quarterly License Fee'}</td>
                      <td className="p-2 text-right">₹{item.quarterlyLicenseFee.toLocaleString('en-IN')}</td>
                    </tr>
                    {item.interest > 0 && (
                      <tr>
                        <td className="p-2 text-amber-800">{lang === 'gu' ? 'વ્યાજ / લેટ પેનલ્ટી (Interest)' : 'Interest / Penalty'}</td>
                        <td className="p-2 text-right text-amber-800">+ ₹{item.interest.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {item.deductions > 0 && (
                      <tr>
                        <td className="p-2 text-rose-800">{lang === 'gu' ? 'મજરે રકમ (Deductions)' : 'Deductions / Rebatement'}</td>
                        <td className="p-2 text-right text-rose-800">- ₹{item.deductions.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2">{lang === 'gu' ? 'કરપાત્ર રકમ (Taxable Amount)' : 'Taxable Amount'}</td>
                      <td className="p-2 text-right">₹{item.taxableAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2">{lang === 'gu' ? 'SGST (9%)' : 'SGST (9%)'}</td>
                      <td className="p-2 text-right">₹{item.sgst.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2">{lang === 'gu' ? 'CGST (9%)' : 'CGST (9%)'}</td>
                      <td className="p-2 text-right">₹{item.cgst.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-extrabold text-sm">
                      <td className="p-2.5">{lang === 'gu' ? 'કુલ ચૂકવવાપાત્ર / વસૂલાયેલ રકમ (Total Received)' : 'Total Received Amount'}</td>
                      <td className="p-2.5 text-right">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Signatures */}
              <div className="pt-6 flex justify-between items-end text-xs text-slate-600">
                <div>
                  <p className="font-semibold">{lang === 'gu' ? 'એજન્સી / પ્રતિનિધિ સહી' : 'Agency Representative Sign'}</p>
                  <div className="h-8 border-b border-dashed border-slate-400 w-36 mt-1"></div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{lang === 'gu' ? 'મહાનગરપાલિકા હિસાબી શાખા' : 'Accounts Officer / Accounts Dept'}</p>
                  <p className="text-[10px] text-slate-400">{lang === 'gu' ? 'કમ્પ્યુટર જનરેટેડ પહોંચ' : 'Computer Generated Official Stamp'}</p>
                  <div className="h-8 border-b border-dashed border-slate-400 w-44 mt-1 ml-auto"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-200 font-medium text-xs"
          >
            {lang === 'gu' ? 'બંધ કરો (Close)' : 'Close'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndDownload}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>
                {lang === 'gu' ? 'સેવ કરો & PDF ડાઉનલોડ કરો' : 'Save & Download PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

