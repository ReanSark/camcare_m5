// types/index.ts

// Patient
export interface Patient {
  $id: string; // Appwrite Document ID
  fullName: string;
  gender: "Male" | "Female" | "Other";
  dob?: string; // ISO date string, optional
  phone?: string;
  email?: string;
  address?: string;
  bloodType?: "A" | "B" | "AB" | "O";
  emergencyContact?: string;
  medicalHistory?: string;
  isArchived?: boolean;
  createdBy?: string;
  createdAt?: string; // ISO datetime
  updatedBy?: string;
  updatedAt?: string;
  other?: string;
}

// Appointment
export interface Appointment {
  $id: string;
  patientId: string;
  doctorIds?: string[];
  nurseIds?: string[];
  date: string; // ISO string
  reason?: string;
  status: "scheduled" | "arrived" | "completed" | "canceled";
  other?: string;
}

// Doctor
export interface Doctor {
  $id: string;
  fullName: string;
  role: "Doctor";
  userId: string;
  other?: string;
}

export interface Nurse {
  $id: string;          // Appwrite Document ID
  userId: string;       // Linked user account
  fullName: string;
  role: "Nurse";
  email?: string;
  phone?: string;
  photoUrl?: string;
  department?: string;
  joinedDate?: string;  // ISO datetime
  isActive?: boolean;
  other?: string;       // For notes/extension
}


// Receptionist
export interface Receptionist {
  $id: string;
  fullName: string;
  role: "Receptionist";
  userId: string;
  other?: string;
}

// Pharmacist
export interface Pharmacist {
  $id: string;
  fullName: string;
  role: "Pharmacist";
  userId: string;
  other?: string;
}

// Lab Technician (v5)
export interface LabTechnician {
  $id: string;
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  department?: string;
  joinedDate?: string;
  isActive?: boolean;
  role: "LabTechnician";
}

// Diagnosis
export interface Diagnosis {
  $id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  diagnosis: string;
  date: string;
  other?: string;
}



// Lab Test (LabTestCatalog, v5)
export interface LabTest {
  $id: string;
  name: string;
  category?: string;
  price: number;
  availableInHouse?: boolean;
  createdBy?: string;
  createdAt?: string;
}

// Lab Result (LabResults, v5)
export interface LabResult {
  $id: string;
  patientId: string;
  diagnosisId?: string;
  testName: string;
  status: "pending" | "processing" | "completed" | "canceled";
  processedBy: string;
  labSource?: "in-house" | "external";
  externalLabName?: string;
  resultFileUrl?: string;
  date?: string;
  dateRequested?: string;
  dateCompleted?: string;
  printedAt?: string;
  isPrinted?: boolean;
  labConsentId?: string;
  isArchived?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Lab Result Detail (LabResultDetails, v5)
export interface LabResultDetail {
  $id: string;
  labResultId: string;
  testItem: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: "normal" | "high" | "low" | "critical";
  note?: string;
}

export type InvoiceStatus = "paid" | "unpaid" | "partial";

// ---------- Shared ----------
export type AppwriteID = string;
export type ISODateString = string;      // "YYYY-MM-DD"
export type ISODateTimeString = string;  // ISO 8601 UTC string

export type InvoiceItemType = "lab" | "service" | "pharmacy" | "manual";
export type DiscountType = "manual" | "staff" | "disability" | "promotion" | "insurance";
export type PaymentMethod = "cash" | "card" | "mobile" | "insurance" | "bank";
export type InvoicePaymentType = "payment" | "refund";
export type InvoiceAction =
  | "create" | "update" | "delete" | "void" | "print"
  | "add-item" | "remove-item" | "change-discount" | "add-payment" | "refund";
export type InvoiceDocStatus = "draft" | "final" | "void";
export type InvoicePaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type InvoiceSource = "appointment" | "admission" | "manual";

export type FxCapture = "invoice" | "payment" | "both";
export type SequenceScope = "global" | "monthly" | "yearly";
export type CollisionPolicy = "retry" | "fail";
export type CalcOrder = "A" | "B";
export type RoundingKHRMode = "nearest_100" | "nearest_1" | "nearest_10" | "nearest_50";
export type RoundingMode = "half-up" | "half-even" | "floor";

export interface DocBase {
  $id: AppwriteID;
  createdAt?: ISODateTimeString;   // from schema attribute (not Appwrite system)
  updatedAt?: ISODateTimeString;   // from schema attribute (not Appwrite system)
  updatedBy?: AppwriteID;
}

// ---------- UPDATED ----------
export interface InvoiceItem extends DocBase {
  invoiceId: AppwriteID;
  type: InvoiceItemType;
  refId?: AppwriteID | null;
  name: string;
  price: number;
  unit: number;
  discount?: number;
  discountType?: DiscountType;
  discountNote?: string;
  subtotal: number;
  displayOrder?: number;
  groupLabel?: string;       // e.g., "LAB"
  taxable?: boolean;         // default true
  labResultId?: AppwriteID | null;
}

export interface Invoice extends DocBase {
  // existing
  patientId: AppwriteID;
  groupInvoiceId?: AppwriteID | null;
  totalAmount?: number;
  discount?: number;
  discountType?: DiscountType;
  discountNote?: string;
  status: "paid" | "unpaid" | "partial";
  paymentMethod?: PaymentMethod;
  paidAt?: ISODateTimeString | null;
  paidBy?: AppwriteID | null;
  source?: InvoiceSource;
  note?: string;
  isArchived?: boolean;

  // new/expanded
  invoiceNo: string;
  appointmentId?: AppwriteID | null;
  admissionId?: AppwriteID | null;
  currency?: string;                 // ISO 4217 like "KHR"/"USD"
  fxRateToBase?: number;             // optional for reporting
  taxRate?: number;                  // %
  taxAmount?: number;
  serviceChargeRate?: number;        // %
  serviceChargeAmount?: number;
  paymentStatus: InvoicePaymentStatus;
  docStatus: InvoiceDocStatus;
  voidReason?: string;
  refundedAmount?: number;
  printedBy?: AppwriteID | null;
  printedAt?: ISODateTimeString | null;
  patientSnapshotName?: string;
  patientSnapshotPhone?: string;
  patientSnapshotDob?: ISODateString;
  archivedAt?: ISODateTimeString | null;
  archivedBy?: AppwriteID | null;
}

// ---------- NEW ----------
export interface InvoicePayment extends DocBase {
  invoiceId: AppwriteID;
  type: InvoicePaymentType;    // payment | refund
  amount: number;
  currency?: string;           // defaults to invoice currency
  fxRateToBase?: number;
  method: PaymentMethod;
  paidByUserId?: AppwriteID;   // cashier
  receivedFrom?: string;       // free text
  paidAt: ISODateTimeString;
  note?: string;
  attachmentFileId?: AppwriteID | null;
}

export interface InvoiceAuditLog extends DocBase {
  invoiceId: AppwriteID;
  action: InvoiceAction;
  changedFields?: string[];
  performedBy: AppwriteID;
  timestamp: ISODateTimeString;
  note?: string;
}

export interface InvoiceAttachment extends DocBase {
  invoiceId: AppwriteID;
  fileId: AppwriteID;
  fileType: "payment-proof" | "external-receipt" | "other";
  uploadedBy: AppwriteID;
  uploadedAt: ISODateTimeString;
  note?: string;
}

export interface Sequence extends DocBase {
  key: string;     // e.g., "INV-202508"
  current: number; // last issued number
}

export interface PrintTemplate extends DocBase {
  name: string;
  type: "invoice";
  content: string;             // template body
  createdBy: AppwriteID;
}

export interface Settings extends DocBase {
  baseCurrency: string;                 // "KHR"
  allowedCurrencies?: string[];         // ["KHR","USD"]
  fxCapture: FxCapture;                 // "both"
  showConvertedTotals?: boolean;

  taxRate?: number;                     // default 0
  serviceChargeRate?: number;           // default 0
  defaultItemTaxable?: boolean;         // default true
  nonTaxableTypes?: InvoiceItemType[];  // e.g., ["lab"]
  calcOrder: CalcOrder;                 // "A" or "B"

  numberFormat: string;                 // "INV-YYYYMM-####"
  sequenceScope: SequenceScope;         // "monthly"
  zeroPad?: number;                     // 4
  assignInvoiceNoOn: "draft" | "finalize";
  collisionPolicy: CollisionPolicy;     // "retry" | "fail"

  canFinalizeRoles?: string[];          // ["Receptionist","Admin"]
  canVoidRoles?: string[];              // ["Admin"]
  canArchiveRoles?: string[];           // ["Admin"]
  hideVoidByDefault?: boolean;
  hideArchivedByDefault?: boolean;

  paymentMethods?: PaymentMethod[];     // allowed methods
  allowPartialPayments?: boolean;
  requirePaidAtAndCashier?: boolean;
  refundStatusPolicy?: "anyRefund" | "netNegative" | "none";

  roundingUSDDecimals?: number;         // 2
  roundingKHRMode: RoundingKHRMode;     // "nearest_100"
  roundingMode: RoundingMode;           // "half-up"

  printTemplateName?: string;
  printFooterText?: string;
  showDraftWatermark?: boolean;
  labSectionLabel?: string;             // "LAB"

  snapshotFields?: Array<"name" | "phone" | "dob">;
  displayTimezone?: string;             // "Asia/Phnom_Penh"
}
