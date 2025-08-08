// lib/settings.ts
import { databases } from "@/lib/appwriteServer";
import { COLLECTIONS } from "@/lib/collections";
import type { Settings } from "@/types";

const CAMBODIA_DEFAULTS: Settings = {
  $id: "global" as any,
  baseCurrency: "KHR",
  allowedCurrencies: ["KHR", "USD"],
  fxCapture: "both",
  showConvertedTotals: true,
  taxRate: 0,
  serviceChargeRate: 0,
  defaultItemTaxable: true,
  nonTaxableTypes: ["lab"],
  calcOrder: "A",
  numberFormat: "INV-YYYYMM-####",
  sequenceScope: "monthly",
  zeroPad: 4,
  assignInvoiceNoOn: "finalize",
  collisionPolicy: "retry",
  canFinalizeRoles: ["Receptionist", "Admin"],
  canVoidRoles: ["Admin"],
  canArchiveRoles: ["Admin"],
  hideVoidByDefault: true,
  hideArchivedByDefault: true,
  paymentMethods: ["cash", "card", "mobile", "insurance", "bank"],
  allowPartialPayments: true,
  requirePaidAtAndCashier: true,
  refundStatusPolicy: "anyRefund",
  roundingUSDDecimals: 2,
  roundingKHRMode: "nearest_100",
  roundingMode: "half-up",
  printTemplateName: "Camcare Default (EN/KM) — Invoice",
  printFooterText: "Prices in KHR unless noted. Thank you for choosing Camcare.",
  showDraftWatermark: true,
  labSectionLabel: "LAB",
  snapshotFields: ["name", "phone", "dob"],
  displayTimezone: "Asia/Phnom_Penh",
};

export async function getSettings(): Promise<Settings> {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.SETTINGS,
      "global"
    );
    return { ...CAMBODIA_DEFAULTS, ...(doc as any) };
  } catch {
    return CAMBODIA_DEFAULTS;
  }
}
