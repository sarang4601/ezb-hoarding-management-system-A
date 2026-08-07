import { Hoarding, HoardingType, QuarterType, QuarterlyFee, StabilityCertificate } from '../types';

/**
 * Math.ceil Roundup Rule for Area in sq.meters:
 * 45.40 or 45.50 sq.m becomes 46 sq.m.
 */
export function calculateArea(width: number, length: number): { rawArea: number; roundedArea: number } {
  const w = Math.max(0, Number(width) || 0);
  const l = Math.max(0, Number(length) || 0);
  const rawArea = w * l;
  const roundedArea = Math.ceil(rawArea);
  return { rawArea, roundedArea };
}

/**
 * Computerized Hoarding Rule:
 * Rate auto-doubles if type is 'Computerized'.
 */
export function calculateAnnualFee(
  width: number,
  length: number,
  type: HoardingType,
  baseRatePerSqM: number = 250
): {
  rawArea: number;
  roundedArea: number;
  effectiveRate: number;
  annualFee: number;
  quarterlyFee: number;
} {
  const { rawArea, roundedArea } = calculateArea(width, length);
  const isComputerized = type === 'Computerized';
  const effectiveRate = isComputerized ? baseRatePerSqM * 2 : baseRatePerSqM;
  // Apply Math.ceil roundup ONLY on the fee calculation (not altering raw area display)
  const annualFee = Math.ceil(rawArea * effectiveRate);
  const quarterlyFee = Math.ceil(annualFee / 4);

  return {
    rawArea,
    roundedArea,
    effectiveRate,
    annualFee,
    quarterlyFee,
  };
}

/**
 * Financial Year Carry-Forward Rule:
 * If a hoarding was registered in e.g. FY 2024-25 and is Active,
 * it MUST carry forward and be displayed in all subsequent financial years (e.g. 2025-26, 2026-27).
 * Initial permissionDate remains preserved.
 */
export function isHoardingActiveInFy(hoarding: Hoarding, targetFy: string): boolean {
  if (!targetFy || targetFy === 'ALL') return true;

  // Registered in targetFy
  if (hoarding.financialYear === targetFy) return true;

  // Active hoarding registered in a previous financial year carries forward to targetFy!
  if (hoarding.status === 'Active' && hoarding.financialYear <= targetFy) {
    return true;
  }

  return false;
}

/**
 * Year-specific Base Rate Resolver:
 * Gets base rate for a specific target financial year.
 * If hoarding has fyRates[targetFy], returns that rate; otherwise returns default base rate.
 */
export function getHoardingRateForFy(hoarding: Hoarding, targetFy?: string): number {
  if (targetFy && targetFy !== 'ALL' && hoarding.fyRates && hoarding.fyRates[targetFy] !== undefined) {
    return hoarding.fyRates[targetFy];
  }
  return hoarding.baseRatePerSqFt || hoarding.baseRatePerSqM || 250;
}

/**
 * Calculates hoarding fee for a specific target financial year taking into account year-wise rates.
 */
export function getHoardingCalculationsForFy(hoarding: Hoarding, targetFy?: string) {
  const baseRate = getHoardingRateForFy(hoarding, targetFy);
  return calculateAnnualFee(hoarding.width, hoarding.length, hoarding.type, baseRate);
}

/**
 * Auto-detect Financial Year based on permission date or current system date (April 1 to March 31 cycle)
 */
export function detectFinancialYear(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const date = isNaN(d.getTime()) ? new Date() : d;

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed

  let startYear: number;
  if (month >= 4) {
    // April to December
    startYear = year;
  } else {
    // January to March
    startYear = year - 1;
  }

  const endYearShort = (startYear + 1) % 100;
  const formattedEndYear = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}-${formattedEndYear}`;
}

/**
 * Returns current running financial year based on current date
 */
export function getCurrentFinancialYear(): string {
  return detectFinancialYear();
}

/**
 * Generates array of 10 financial years starting from 2024-25
 */
export function getFinancialYearsList(startYear: number = 2024, count: number = 10): string[] {
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    const y = startYear + i;
    const endY = (y + 1) % 100;
    const endYStr = endY < 10 ? `0${endY}` : `${endY}`;
    list.push(`${y}-${endYStr}`);
  }
  return list;
}

/**
 * Calculates quarterly fee breakdown including GST (SGST 9%, CGST 9%) and deductions with Math.ceil rules.
 */
export function calculateQuarterlyBreakdown(
  annualFee: number,
  interest: number = 0,
  deductions: number = 0
) {
  const quarterlyLicenseFee = Math.ceil(annualFee / 4);
  const taxableAmount = Math.max(0, Math.ceil(quarterlyLicenseFee + (Number(interest) || 0) - (Number(deductions) || 0)));
  const sgst = Math.ceil(taxableAmount * 0.09);
  const cgst = Math.ceil(taxableAmount * 0.09);
  const totalAmount = taxableAmount + sgst + cgst;

  return {
    quarterlyLicenseFee,
    interest: Number(interest) || 0,
    deductions: Number(deductions) || 0,
    taxableAmount,
    sgst,
    cgst,
    totalAmount,
  };
}

export interface QuarterStatus {
  financialYear: string;
  quarter: QuarterType;
  isPaid: boolean;
  receiptNo?: string;
  receiptDate?: string;
  totalAmount?: number;
}

export interface HoardingPendingSummary {
  hoardingId: string;
  hoardingNo: string;
  agencyName: string;
  location: string;
  registrationFy: string;
  firstPendingFy: string | null;
  firstPendingQuarter: QuarterType | null;
  firstPendingLabel: string; // e.g. "FY 2025-26 Q1 થી ફી બાકી"
  hasPendingDues: boolean;
  totalPendingQuartersCount: number;
  estimatedPendingTotal: number;
  quartersMatrix: Record<string, Record<QuarterType, QuarterStatus>>;
}

/**
 * Calculates pending quarters summary per hoarding starting from registration FY.
 * Clearly tracks which FY and which quarter fee is pending from.
 */
export function getHoardingPendingQuartersSummary(
  hoarding: Hoarding,
  quarterlyFees: QuarterlyFee[],
  currentFy: string = '2026-27'
): HoardingPendingSummary {
  const regFy = hoarding.financialYear || '2024-25';
  const allFys = getFinancialYearsList(2024, 5);
  const relevantFys = allFys.filter((fy) => fy >= regFy && fy <= currentFy);

  const quartersMatrix: Record<string, Record<QuarterType, QuarterStatus>> = {};
  const quartersList: QuarterType[] = ['Q1', 'Q2', 'Q3', 'Q4'];

  let firstPendingFy: string | null = null;
  let firstPendingQuarter: QuarterType | null = null;
  let totalPendingQuartersCount = 0;
  let estimatedPendingTotal = 0;

  relevantFys.forEach((fy) => {
    quartersMatrix[fy] = {} as Record<QuarterType, QuarterStatus>;

    const fyCalc = getHoardingCalculationsForFy(hoarding, fy);
    const qFee = fyCalc.quarterlyFee;
    const qTotalEstimated = Math.ceil(qFee * 1.18);

    quartersList.forEach((q) => {
      const paidFee = quarterlyFees.find(
        (f) =>
          (f.hoardingNo === hoarding.hoardingNo || f.hoardingId === hoarding.id) &&
          f.financialYear === fy &&
          f.quarter === q &&
          f.paymentStatus === 'Paid'
      );

      const isPaid = !!paidFee;
      quartersMatrix[fy][q] = {
        financialYear: fy,
        quarter: q,
        isPaid,
        receiptNo: paidFee?.receiptNo,
        receiptDate: paidFee?.receiptDate,
        totalAmount: paidFee?.totalAmount,
      };

      if (!isPaid) {
        totalPendingQuartersCount++;
        estimatedPendingTotal += qTotalEstimated;

        if (!firstPendingFy) {
          firstPendingFy = fy;
          firstPendingQuarter = q;
        }
      }
    });
  });

  const hasPendingDues = totalPendingQuartersCount > 0;
  const firstPendingLabel =
    hasPendingDues && firstPendingFy && firstPendingQuarter
      ? `FY ${firstPendingFy} ${firstPendingQuarter} થી ફી બાકી`
      : 'તમામ ચૂકવાયેલ (All Paid)';

  return {
    hoardingId: hoarding.id,
    hoardingNo: hoarding.hoardingNo,
    agencyName: hoarding.agencyName,
    location: hoarding.location,
    registrationFy: regFy,
    firstPendingFy,
    firstPendingQuarter,
    firstPendingLabel,
    hasPendingDues,
    totalPendingQuartersCount,
    estimatedPendingTotal,
    quartersMatrix,
  };
}

/**
 * Calculates stability certificate days remaining and triggers 45-day alert logic.
 */
export function checkStabilityStatus(validUntilDateStr: string, referenceDateStr?: string): {
  daysRemaining: number;
  isAlertActive: boolean;
  status: 'Valid' | 'Warning (<=45 Days)' | 'Expired';
} {
  if (!validUntilDateStr) {
    return { daysRemaining: 0, isAlertActive: true, status: 'Expired' };
  }

  const validUntil = new Date(validUntilDateStr);
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date('2026-07-29');

  const diffTime = validUntil.getTime() - refDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { daysRemaining, isAlertActive: true, status: 'Expired' };
  } else if (daysRemaining <= 45) {
    return { daysRemaining, isAlertActive: true, status: 'Warning (<=45 Days)' };
  } else {
    return { daysRemaining, isAlertActive: false, status: 'Valid' };
  }
}
