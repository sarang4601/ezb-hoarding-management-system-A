export type HoardingType = 'Single' | 'Computerized';
export type OwnershipType = 'Private' | 'SMC'; // 'Private' = ખાનગી માલિકાના, 'SMC' = સુ.મ.પા.ની માલિકીના
export type HoardingStatus = 'Active' | 'Cancelled' | 'Expired';
export type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Annual';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export interface FinancialYear {
  id: string; // e.g. "2024-25"
  label: string; // e.g. "FY 2024-25"
  startDate: string;
  endDate: string;
}

export interface Agency {
  id: string;
  agencyNo: string;
  name: string;
  gstNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdDate: string;
}

export interface CancellationLog {
  officerDesignation: string;
  reason: string;
  letterNo: string;
  cancellationDate: string;
  uploadedDocName: string;
  uploadedDocData?: string; // base64 or mock file preview
}

export interface Hoarding {
  id: string;
  hoardingNo: string;
  agencyId: string;
  agencyName: string;
  tpNumber: string;
  fpRsNumber: string;
  location: string;
  ownerName?: string; // લોકેશન માલિકનું નામ (Location / Land Owner Name)
  remarks?: string; // રીમાર્ક્સ (Remarks / Notes)
  type: HoardingType;
  ownershipType?: OwnershipType; // "ખાનગી માલિકાના હોડીંગ્સ" | "સુ.મ.પા.ની માલિકીના હોડીંગ્સ"
  width: number; // in meters (મીટરમાં)
  length: number; // in meters (મીટરમાં)
  rawArea: number; // raw area in sq.m (ચો.મીટર)
  roundedArea: number; // Math.ceil(width * length)
  baseRatePerSqFt: number; // base rate per sq.m (બેઝ દર ₹/ચો.મીટર)
  baseRatePerSqM?: number; // base rate per sq.m
  fyRates?: Record<string, number>; // year-wise base rate map e.g. { "2024-25": 250, "2025-26": 280 }
  effectiveRate: number; // 2x if Computerized
  calculatedAnnualFee: number;
  calculatedQuarterlyFee?: number; // ત્રિમાસીક લાયસન્સ ફી
  permissionDate: string; // Initial permission date (never changes on FY carry forward)
  financialYear: string; // Auto-detected original registration FY
  status: HoardingStatus;
  cancellationDetails?: CancellationLog;
  createdAt: string;
}

export interface QuarterlyFee {
  id: string;
  hoardingId: string;
  hoardingNo: string;
  agencyName: string;
  financialYear: string;
  quarter: QuarterType;
  quarterlyLicenseFee: number; // Math.ceil(calculatedAnnualFee / 4)
  interest: number; // વ્યાજ
  deductions: number; // મજરે
  taxableAmount: number;
  sgst: number; // 9% Math.ceil
  cgst: number; // 9% Math.ceil
  totalAmount: number;
  receiptNo: string;
  receiptDate: string;
  paymentStatus: PaymentStatus;
  paymentMode: 'Cheque' | 'Online' | 'DD' | 'Cash';
  remarks?: string;
}

export interface StabilityCertificate {
  id: string;
  hoardingId: string;
  hoardingNo: string;
  agencyName: string;
  location?: string; // હોર્ડિંગ્સ લોકેશન (Location)
  certificateNo: string;
  engineerName: string;
  engineerLicenseNo: string;
  issueDate: string;
  validUntilDate: string;
  daysRemaining: number;
  isAlertActive: boolean; // <= 45 days
  status: 'Valid' | 'Warning (<=45 Days)' | 'Expired';
}

export interface TpScheme {
  id: string;
  schemeNo: string; // e.g. "૨૭" or "27"
  nameGu: string; // e.g. "ટી.પી. સ્કીમ નં. ૨૭ (ઉત્રાણ-કોસાડ)"
  nameEn: string; // e.g. "TP Scheme No. 27 (Utran-Kosad)"
  areaName?: string; // e.g. "ઉત્રાણ-કોસાડ"
  remarks?: string;
  createdAt?: string;
}

export interface SystemStats {
  totalAgencies: number;
  totalHoardings: number;
  activeHoardings: number;
  cancelledHoardings: number;
  totalRevenue: number;
  pendingFees: number;
  computerizedCount: number;
  stabilityAlertsCount: number;
  totalTpSchemes?: number;
}
