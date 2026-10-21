"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import type { ItemPrice, PriceLine } from "@/lib/pricing/price";
import type { Configuration } from "@/lib/pricing/schema";
import { lineLabel, type LineTranslator } from "@/lib/quote/describe";

/** Customer-facing label for a price line (shared by configurator, cart and quote pages). */
export function useLineLabel() {
  const t = useTranslations("configurator.summary.lines");
  const locale = useLocale();
  return (line: PriceLine, config: Configuration) => lineLabel(line, config, t as unknown as LineTranslator, locale);
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
