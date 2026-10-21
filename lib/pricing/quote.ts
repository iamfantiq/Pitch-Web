import { euCountries, pricing, type PricingSettings } from "@/config/pricing";
import { computeGeometry } from "./geometry";
import { priceItem, roundPrice, type ItemPrice } from "./price";
import type { Configuration } from "./schema";

export interface QuoteCustomer {
  /** ISO 3166-1 alpha-2; empty while the customer hasn't chosen yet. */
  country: string;
  vatNumber?: string;
}

export interface QuoteTotals {
  items: ItemPrice[];
  /** Null when the country has no delivery zone (priced on request) or isn't known yet. */
  delivery: { zone: string; pallets: number; amount: number } | null;
  subtotal: number;
  discount: number;
  net: number;
  vatRate: number;
  vat: number;
  total: number;
  reverseCharge: boolean;
  pricingVersion: string;
}

const VAT_PREFIX: Record<string, string> = { GR: "EL" };

/** Basic format check: country prefix + 2–13 alphanumerics. A VIES lookup can be added later. */
export function isPlausibleVatNumber(country: string, vatNumber: string | undefined): boolean {
  if (!vatNumber) return false;
  const v = vatNumber.replace(/[\s.-]/g, "").toUpperCase();
  const prefix = VAT_PREFIX[country] ?? country;
  return v.startsWith(prefix) && /^[A-Z]{2}[0-9A-Z]{2,13}$/.test(v);
}

export function isReverseCharge(customer: QuoteCustomer, settings: PricingSettings = pricing): boolean {
  const { country } = customer;
  return (
    settings.vat.reverseChargeEu &&
    country !== settings.vat.homeCountry &&
    (euCountries as readonly string[]).includes(country) &&
    isPlausibleVatNumber(country, customer.vatNumber)
  );
}

export function deliveryFor(configs: Configuration[], country: string, settings: PricingSettings = pricing): QuoteTotals["delivery"] {
  const entry = Object.entries(settings.delivery.zones).find(([, z]) => z.countries.includes(country));
  if (!entry) return null;
  const [zone, z] = entry;
  const panels = configs.reduce((sum, c) => {
    const g = computeGeometry(c);
    return sum + (g.counts.boards + g.counts.cornerBoards + g.counts.goalSurroundBoards) * c.quantity;
  }, 0);
  const pallets = Math.max(1, Math.ceil(panels / settings.construction.boardsPerPallet));
  return { zone, pallets, amount: roundPrice(z.base + z.perPallet * pallets, settings) };
}

/** Totals for a set of configured items. The server always calls this itself; client totals are display-only. */
export function computeQuote(
  configs: Configuration[],
  customer: QuoteCustomer,
  discount = 0,
  settings: PricingSettings = pricing,
): QuoteTotals {
  const items = configs.map((c) => priceItem(c, settings));
  const delivery = customer.country ? deliveryFor(configs, customer.country, settings) : null;
  const subtotal = items.reduce((s, i) => s + i.total, 0) + (delivery?.amount ?? 0);
  const appliedDiscount = Math.min(Math.max(0, discount), subtotal);
  const net = subtotal - appliedDiscount;
  const reverseCharge = isReverseCharge(customer, settings);
  const vatRate = reverseCharge ? 0 : settings.vat.rate;
  const vat = Math.round(net * vatRate * 100) / 100;
  return {
    items,
    delivery,
    subtotal,
    discount: appliedDiscount,
    net,
    vatRate,
    vat,
    total: Math.round((net + vat) * 100) / 100,
    reverseCharge,
    pricingVersion: settings.version,
  };
}
