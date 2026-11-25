/** Exact Stellar amounts: 7 decimal places, integer stroops. No dependencies. */
export const STROOPS_PER_UNIT = 10_000_000;

/** Exact decimal (up to 7 places) to integer stroops; null if invalid. */
export function toStroops(amount: string): number | null {
  if (!/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,7})?$/.test(amount)) return null;
  const [whole, frac = ""] = amount.split(".");
  const v = Number(whole) * STROOPS_PER_UNIT + Number((frac + "0000000").slice(0, 7));
  return Number.isSafeInteger(v) && v > 0 ? v : null;
}

export function formatStroops(stroops: number | string): string {
  const n = BigInt(stroops);
  const unit = BigInt(STROOPS_PER_UNIT);
  const whole = n / unit;
  const frac = (n % unit).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole.toLocaleString("en-US")}.${frac}` : whole.toLocaleString("en-US");
}

