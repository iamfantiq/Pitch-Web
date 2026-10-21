"use client";

import { useLocale, useTranslations } from "next-intl";
import { getProduct } from "@/config/products";
import { formatNumber, formatPrice } from "@/lib/format";
import { computeGeometry } from "@/lib/pricing/geometry";
import type { ItemPrice, PriceLine } from "@/lib/pricing/price";
import type { Configuration } from "@/lib/pricing/schema";

/** Customer-facing label for a price line (shared by configurator, cart and quote pages). */
export function useLineLabel() {
  const t = useTranslations("configurator.summary.lines");
  const locale = useLocale();
  return (line: PriceLine, config: Configuration) => {
    const product = getProduct(config.product);
    const g = computeGeometry(config);
    const n = (v: number) => formatNumber(v, locale, 1);
    return t(line.key, {
      product: product?.name ?? "",
      dims: `${n(g.length)} × ${n(g.width)} m`,
      value: n(g.boardHeight + g.barHeight),
      qty: line.unit === "m2" ? n(line.qty ?? 0) : (line.qty ?? 0),
    });
  };
}

export function PriceLines({ price, config }: { price: ItemPrice; config: Configuration }) {
  const locale = useLocale();
  const label = useLineLabel();
  return (
    <dl className="space-y-2 text-sm">
      {price.lines.map((line) => (
        <div key={line.key} className="flex justify-between gap-4">
          <dt className="text-muted">{label(line, config)}</dt>
          <dd className="shrink-0 tabular-nums">
            {line.key === "base" ? "" : line.amount > 0 ? "+ " : "− "}
            {formatPrice(Math.abs(line.amount), locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PriceTotal({ price }: { price: ItemPrice }) {
  const t = useTranslations("configurator.summary");
  const locale = useLocale();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-semibold">{t("total")}</span>
        <span className="text-2xl font-semibold tabular-nums" aria-live="polite">
          {formatPrice(price.total, locale)}
        </span>
      </div>
      {price.quantity > 1 ? (
        <p className="text-right text-xs text-muted">
          {t("perUnit", { price: formatPrice(price.unitPrice, locale) })} {t("quantity", { count: price.quantity })}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted">{t("exclVat")}</p>
    </div>
  );
}
