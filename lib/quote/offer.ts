import { getProduct } from "@/config/products";
import { site } from "@/config/site";
import { translatorFor } from "@/lib/i18n/translator";
import { describeConfig, lineLabel } from "./describe";
import type { LoadedQuote } from "./load";

export interface OfferLine {
  label: string;
  amount: number;
}

export interface OfferItem {
  name: string;
  specs: string[];
  lines: OfferLine[];
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Everything the PDF and emails need, already translated. */
export interface Offer {
  locale: string;
  number: string;
  date: string;
  validUntil: string;
  company: typeof site;
  customer: LoadedQuote["customer"];
  desiredDate: string | null;
  comment: string | null;
  items: OfferItem[];
  delivery: { zone: string; amount: number } | null;
  discount: number;
  net: number;
  vatRate: number;
  vat: number;
  total: number;
  reverseCharge: boolean;
}

export function buildOffer({ quote, customer, items }: LoadedQuote): Offer {
  const locale = quote.locale;
  const tSpec = translatorFor(locale, "spec");
  const tLine = translatorFor(locale, "configurator.summary.lines");
  return {
    locale,
    number: quote.number,
    date: quote.createdAt.toISOString().slice(0, 10),
    validUntil: quote.validUntil,
    company: site,
    customer,
    desiredDate: quote.desiredDate,
    comment: quote.comment,
    items: items.map((item) => ({
      name: getProduct(item.product)?.name ?? item.product,
      specs: describeConfig(item.config, tSpec, locale),
      lines: item.price.lines.map((l) => ({ label: lineLabel(l, item.config, tLine, locale), amount: l.amount })),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    delivery: quote.deliveryZone && quote.delivery !== null ? { zone: quote.deliveryZone, amount: quote.delivery } : null,
    discount: quote.discount,
    net: quote.net,
    vatRate: quote.vatRate,
    vat: quote.vat,
    total: quote.total,
    reverseCharge: quote.reverseCharge,
  };
}
