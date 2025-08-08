// lib/settings.ts
import "server-only";
import { databases } from "@/lib/appwriteServer";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import type { Settings } from "@/types";

const CAMBODIA_DEFAULTS: Settings = {
  $id: "global" as unknown as string,
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
    const partial = doc as unknown as Partial<Settings>;
    return { ...CAMBODIA_DEFAULTS, ...partial };
  } catch {
    return CAMBODIA_DEFAULTS;
  }
}

export const DEFAULT_SETTINGS = CAMBODIA_DEFAULTS;
