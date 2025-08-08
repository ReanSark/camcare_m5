// lib/rounding.ts
export type RoundingMode = "half-up" | "half-even" | "floor";
export type RoundingKHRMode = "nearest_100" | "nearest_50" | "nearest_10" | "nearest_1";

export function roundHalfUp(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function roundHalfEven(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  const x = n * f;
  const r = Math.floor(x);
  const diff = x - r;
  if (diff > 0.5) return (r + 1) / f;
  if (diff < 0.5) return r / f;
  // .5 exactly → round to even
  return (r % 2 === 0 ? r : r + 1) / f;
}

export function roundFloor(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.floor(n * f) / f;
}

export function applyCurrencyRounding(
  n: number,
  currency: string,
  mode: RoundingMode,
  khrMode: RoundingKHRMode,
  usdDecimals = 2
): number {
  if (currency === "KHR") {
    if (khrMode === "nearest_100") return Math.round(n / 100) * 100;
    if (khrMode === "nearest_50") return Math.round(n / 50) * 50;
    if (khrMode === "nearest_10") return Math.round(n / 10) * 10;
    return Math.round(n);
  }
  if (mode === "floor") return roundFloor(n, usdDecimals);
  if (mode === "half-even") return roundHalfEven(n, usdDecimals);
  return roundHalfUp(n, usdDecimals);
}
