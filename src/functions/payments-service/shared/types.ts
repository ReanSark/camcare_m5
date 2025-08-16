
// Minimal types shaped to your ccm5_mvp_schema_v5.json
// Only fields used by these functions are included. Extend as needed.
export type ID = string;

export interface Sequence {
  key: string;
  current: number;
}

export interface Settings {
  baseCurrency: string;
  allowedCurrencies?: string[];
  fxCapture: "invoice" | "payment" | "both";
  showConvertedTotals?: boolean;

  taxRate: number;
  serviceChargeRate: number;
  defaultItemTaxable: boolean;
  nonTaxableTypes?: string[];
  calcOrder: "A" | "B";

  invoicePrefix: string;
  invoiceResetScope: "global" | "monthly" | "yearly";
  invoicePad: number;
  assignInvoiceNoOn: "draft" | "finalize";
  collisionPolicy: "retry" | "fail";

  canFinalizeRoles?: string[];
  roundingUSDDecimals: number;
  roundingKHRMode: "nearest_100" | "nearest_1" | "nearest_10" | "nearest_50";
  roundingMode: "half-up" | "half-even" | "floor";

  printTemplateName?: string;

  displayTimezone?: string;

  // Numbering for other streams
  dispensePrefix: string; dispensePad: number; dispenseResetScope: "month" | "year" | "never";
  labOrderPrefix: string; labOrderPad: number; labOrderResetScope: "month" | "year" | "never";
  accessionPrefix: string; accessionPad: number; accessionResetScope: "month" | "year" | "never";
  imagingOrderPrefix: string; imagingOrderPad: number; imagingOrderResetScope: "month" | "year" | "never";

  // ⬇️ Added (optional) — used by PaymentsService
  requirePaidAtAndCashier?: boolean;
}

export interface Invoice {
  $id: string;
  invoiceNo: string;
  patientId: string;
  currency?: string;
  fxRateToBase?: number;

  amountPaid: number;
  amountDue: number;
  totalAmount: number;
  discount: number;
  discountType?: "manual" | "staff" | "disability" | "promotion" | "insurance";
  taxRate: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded";
  docStatus: "draft" | "final" | "void";

  finalizedAt?: string;
  finalizedBy?: string;
  updatedAt?: string;
  updatedBy?: string;

  // ⬇️ Added (optional) — set when fully paid
  paidAt?: string;
  paidBy?: string;
}

export interface InvoiceItem {
  $id: string;
  invoiceId: string;
  type: "lab" | "service" | "pharmacy" | "manual";
  price: number;
  unit: number;
  discount: number;
  taxable: boolean;
  subtotal: number;
}

export interface InvoicePayment {
  $id: string;
  invoiceId: string;
  cashSessionId?: string;
  type: "payment" | "refund";
  amount: number;
  currency?: string;
  fxRateToBase?: number;
  method: "cash" | "card" | "mobile" | "insurance" | "bank";
  paidByUserId?: string;
  receivedFrom?: string;
  paidAt: string;
  note?: string;
  attachmentFileId?: string;
}

// Minimal user context injected via JWT or header from frontend (supply x-user-id / x-user-role)
export interface ActorCtx {
  userId: string;
  role?: string;
}
