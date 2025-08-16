
import type { Settings } from "./types";

function roundHalfUp(n: number, precision: number) {
  const p = Math.pow(10, precision);
  return Math.round((n + Number.EPSILON) * p) / p;
}
function roundHalfEven(n: number, precision: number) {
  const p = Math.pow(10, precision);
  const x = n * p;
  const r = Math.round(x);
  const diff = Math.abs(x - r);
  if (diff === 0.5) {
    return (Math.floor(r / 2) * 2) / p;
  }
  return Math.round(x) / p;
}
function floor(n: number, precision: number) {
  const p = Math.pow(10, precision);
  return Math.floor(n * p) / p;
}

export function roundCurrency(n: number, currency: string, settings: Settings) {
  // USD => decimals, KHR => modes (usually nearest 100 riel)
  if (currency === "USD") {
    const dec = settings.roundingUSDDecimals ?? 2;
    if (settings.roundingMode === "floor") return floor(n, dec);
    if (settings.roundingMode === "half-even") return roundHalfEven(n, dec);
    return roundHalfUp(n, dec);
  }
  if (currency === "KHR") {
    const mode = settings.roundingKHRMode;
    const base = mode === "nearest_1" ? 1 : mode === "nearest_10" ? 10 : mode === "nearest_50" ? 50 : 100;
    const rounded = Math.round(n / base) * base;
    return rounded;
  }
  // default sensible
  return Math.round(n * 100) / 100;
}

export function calcInvoiceTotals(items: { price: number; unit: number; discount: number; taxable: boolean; }[], settings: Settings) {
  const subTotal = items.reduce((acc, it) => acc + (it.price * it.unit - it.discount), 0);

  const taxableSub = items.reduce((acc, it) => acc + (it.taxable ? (it.price * it.unit - it.discount) : 0), 0);

  // Calc order:
  // A: (subtotal -> tax -> service charge)
  // B: (subtotal -> service charge -> tax)
  const scRate = settings.serviceChargeRate ?? 0;
  const taxRate = settings.taxRate ?? 0;

  if (settings.calcOrder === "A") {
    const tax = taxableSub * taxRate;
    const afterTax = subTotal + tax;
    const svc = afterTax * scRate;
    const total = subTotal + tax + svc;
    return { subTotal, taxAmount: tax, serviceChargeAmount: svc, total };
  } else {
    const svc = subTotal * scRate;
    const taxBase = taxableSub + (settings.defaultItemTaxable ? svc : 0);
    const tax = taxBase * taxRate;
    const total = subTotal + svc + tax;
    return { subTotal, taxAmount: tax, serviceChargeAmount: svc, total };
  }
}
