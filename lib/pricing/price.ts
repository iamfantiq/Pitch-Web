import { pricing, type PricingMode, type PricingSettings } from "@/config/pricing";
import { getProduct } from "@/config/products";
import { computeBom, type Bom } from "./bom";
import { computeCost } from "./cost";
import { computeGeometry, type Geometry } from "./geometry";
import { defaultConfiguration, type Configuration } from "./schema";

export type PriceLineKey =
  | "base"
  | "size"
  | "height"
  | "goal"
  | "fencing"
  | "branding"
  | "finish"
  | "surface"
  | "transportCart"
  | "storageBags"
  | "installation";

export interface PriceLine {
  key: PriceLineKey;
  amount: number;
  /** Quantity behind the amount, for display (e.g. 24 m² of print). */
  qty?: number;
  unit?: "m2" | "kg" | "pcs" | "days";
}

export interface ItemPrice {
  lines: PriceLine[];
  unitPrice: number;
  quantity: number;
  total: number;
  mode: PricingMode;
  pricingVersion: string;
}

export function roundPrice(value: number, settings: PricingSettings = pricing): number {
  return Math.round(value / settings.roundTo) * settings.roundTo;
}

/** Unrounded price of the pitch structure (boards, frame, goals, bars). */
export function structurePrice(config: Configuration, settings: PricingSettings = pricing): number {
  const product = getProduct(config.product);
  if (!product) throw new Error(`Unknown product ${config.product}`);
  const cost = computeCost(computeBom(config, settings), "structure", settings).total;

  if (settings.mode === "cost") return cost * (1 + settings.cost.margin);

  const standardCost = computeCost(computeBom(defaultConfiguration(product.slug), settings), "structure", settings).total;
  return (product.catalogPrice * cost) / standardCost;
}

function qtyOf(bom: Bom, materialId: Bom["lines"][number]["materialId"]): number {
  return bom.lines.filter((l) => l.materialId === materialId).reduce((s, l) => s + l.qty, 0);
}

export function installationDays(g: Geometry, settings: PricingSettings = pricing): number {
  const panels = g.counts.boards + g.counts.cornerBoards + g.counts.goalSurroundBoards;
  return Math.max(1, Math.ceil(panels / settings.options.installation.boardsPerDay));
}

/** Customer price for one configured item, as line items. Never exposes internal cost. */
export function priceItem(config: Configuration, settings: PricingSettings = pricing): ItemPrice {
  const product = getProduct(config.product);
  if (!product) throw new Error(`Unknown product ${config.product}`);
  const r = (v: number) => roundPrice(v, settings);
  const o = settings.options;
  const standard = defaultConfiguration(product.slug);
  const bom = computeBom(config, settings);
  const g = computeGeometry(config);

  const base = settings.mode === "calibration" ? product.catalogPrice : r(structurePrice(standard, settings));
  const sizeOnly = r(structurePrice({ ...standard, size: config.size }, settings));
  const full = r(structurePrice(config, settings));

  const lines: PriceLine[] = [
    { key: "base", amount: base },
    { key: "size", amount: sizeOnly - base },
    { key: "height", amount: full - sizeOnly },
  ];

  if (config.goal === "pro") lines.push({ key: "goal", amount: r(o.goalPro.perGoal * g.counts.goals), qty: g.counts.goals, unit: "pcs" });

  const fenceM2 = qtyOf(bom, "fence-net");
  if (fenceM2 > 0) lines.push({ key: "fencing", amount: r(o.fencing.perM2 * fenceM2), qty: fenceM2, unit: "m2" });

  const printM2 = qtyOf(bom, "print-vinyl");
  if (printM2 > 0) lines.push({ key: "branding", amount: r(o.branding.setupFee + o.branding.perM2 * printM2), qty: printM2, unit: "m2" });

  if (config.finish.type === "powder") lines.push({ key: "finish", amount: r(o.powderCoat.perKgSteel * bom.steelKg), qty: bom.steelKg, unit: "kg" });

  if (config.surface === "turf") lines.push({ key: "surface", amount: r(o.turf.perM2 * g.area), qty: Math.round(g.area * 10) / 10, unit: "m2" });

  const carts = qtyOf(bom, "transport-cart");
  if (carts > 0) lines.push({ key: "transportCart", amount: r(o.transportCart.each * carts), qty: carts, unit: "pcs" });

  if (config.extras.storageBags) lines.push({ key: "storageBags", amount: r(o.storageBags.perSet) });

  if (config.extras.installation) {
    const days = installationDays(g, settings);
    lines.push({ key: "installation", amount: r(o.installation.dayRate * days), qty: days, unit: "days" });
  }

  const visible = lines.filter((l) => l.key === "base" || l.amount !== 0);
  const unitPrice = visible.reduce((s, l) => s + l.amount, 0);
  return {
    lines: visible,
    unitPrice,
    quantity: config.quantity,
    total: unitPrice * config.quantity,
    mode: settings.mode,
    pricingVersion: settings.version,
  };
}
