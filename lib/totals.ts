// lib/totals.ts
import type { InvoiceItem, Settings } from "@/types";
import { applyCurrencyRounding } from "./rounding";

export function lineSubtotal(item: InvoiceItem): number {
  const unit = Math.max(1, item.unit ?? 1);
  const price = Math.max(0, item.price ?? 0);
  const discount = Math.max(0, item.discount ?? 0);
  const sub = unit * price - discount;
  return sub < 0 ? 0 : sub;
}

export function computeTotals(opts: {
  items: InvoiceItem[];
  invoiceDiscount?: number;
  taxRate?: number;            // percent
  serviceChargeRate?: number;  // percent
  settings: Settings;
  currency: string;
}): {
  lineSum: number;
  invoiceDiscount: number;
  serviceChargeAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const { items, settings, currency } = opts;
  const invDiscount = Math.max(0, opts.invoiceDiscount ?? 0);

  const taxableSum = items
    .filter((i) => i.taxable !== false)
    .reduce((acc, i) => acc + lineSubtotal(i), 0);

  const nonTaxableSum = items
    .filter((i) => i.taxable === false)
    .reduce((acc, i) => acc + lineSubtotal(i), 0);

  const lineSum = taxableSum + nonTaxableSum;

  const rateSvc = Math.max(0, opts.serviceChargeRate ?? settings.serviceChargeRate ?? 0);
  const rateTax = Math.max(0, opts.taxRate ?? settings.taxRate ?? 0);

  let serviceChargeAmount = 0;
  let taxAmount = 0;

  if (settings.calcOrder === "A") {
    const afterInvDiscount = Math.max(0, lineSum - invDiscount);
    serviceChargeAmount = (afterInvDiscount * rateSvc) / 100;

    // Allocate taxable share proportionally for tax base
    const share = lineSum > 0 ? taxableSum / lineSum : 0;
    const taxBase = (afterInvDiscount + serviceChargeAmount) * share;
    taxAmount = (taxBase * rateTax) / 100;
  } else {
    // B) line discounts → line sum → tax → invoice discount → service charge → total
    taxAmount = (taxableSum * rateTax) / 100;
    const afterTax = lineSum + taxAmount;
    const afterInvDiscount = Math.max(0, afterTax - invDiscount);
    serviceChargeAmount = (afterInvDiscount * rateSvc) / 100;
  }

  let total = Math.max(0, lineSum - invDiscount + serviceChargeAmount + taxAmount);

  total = applyCurrencyRounding(
    total,
    currency,
    settings.roundingMode ?? "half-up",
    settings.roundingKHRMode ?? "nearest_100",
    settings.roundingUSDDecimals ?? 2
  );

  return {
    lineSum,
    invoiceDiscount: invDiscount,
    serviceChargeAmount,
    taxAmount,
    totalAmount: total,
  };
}
