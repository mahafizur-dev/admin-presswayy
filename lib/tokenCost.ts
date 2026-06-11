export type Currency = "BDT" | "USD";

export interface TokenCostConfig {
  enabled: boolean; // পুরো feature on/off
  currency: Currency;
  symbol: string;
  symbolPosition: "prefix" | "suffix";
  decimals: number;
  displayMultiplier: number; // display-only adjust (যেমন margin দেখাতে চাইলে)
  minToShow: number; // এর নিচে হলে লুকাও
  hideZero: boolean;
  roundingMode: "round" | "ceil" | "floor";
}

// future-এ শুধু এই object বদলালেই সব জায়গায় effect পড়বে
export const tokenCostConfig: TokenCostConfig = {
  enabled: true,
  currency: "BDT",
  symbol: "৳",
  symbolPosition: "prefix",
  decimals: 4,
  displayMultiplier: 1,
  minToShow: 0,
  hideZero: true,
  roundingMode: "round",
};

export interface RawCost {
  bdt?: number;
  usd?: number;
  tokens?: number;
}
export interface DisplayCost {
  value: number;
  formatted: string;
  visible: boolean;
}

function roundTo(v: number, d: number, mode: TokenCostConfig["roundingMode"]) {
  const f = Math.pow(10, d);
  if (mode === "ceil") return Math.ceil(v * f) / f;
  if (mode === "floor") return Math.floor(v * f) / f;
  return Math.round(v * f) / f;
}

export function computeDisplayCost(
  raw?: RawCost | null,
  cfg: TokenCostConfig = tokenCostConfig,
): DisplayCost | null {
  if (!cfg.enabled || !raw) return null;
  const base = cfg.currency === "USD" ? raw.usd : raw.bdt;
  if (base == null || isNaN(base)) return null;

  const adjusted = roundTo(
    base * cfg.displayMultiplier,
    cfg.decimals,
    cfg.roundingMode,
  );
  const visible = !(cfg.hideZero && adjusted <= 0) && adjusted >= cfg.minToShow;
  const num = adjusted.toFixed(cfg.decimals);
  const formatted =
    cfg.symbolPosition === "prefix"
      ? `${cfg.symbol}${num}`
      : `${num}${cfg.symbol}`;

  return { value: adjusted, formatted, visible };
}
