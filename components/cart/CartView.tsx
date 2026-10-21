"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { PriceLines } from "@/components/configurator/PriceSummary";
import { Stepper } from "@/components/configurator/controls";
import { ButtonLink } from "@/components/ui/Button";
import { PitchIllustration } from "@/components/ui/PitchIllustration";
import { optionCatalog } from "@/config/options";
import { getProduct } from "@/config/products";
import { Link } from "@/i18n/navigation";
import { useCart, useCartHydrated, type CartItem } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";
import { priceItem } from "@/lib/pricing/price";
import { describeConfig, type SpecTranslator } from "@/lib/quote/describe";

export function CartView() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const hydrated = useCartHydrated();
  const items = useCart((s) => s.items);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + priceItem(i.config).total, 0), [items]);

  if (!hydrated) return <div className="container-page min-h-[50vh] pt-10" aria-busy="true" />;

  return (
    <div className="container-page pt-10">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-card)] bg-surface px-6 py-16 text-center">
          <p className="text-lg text-muted">{t("empty")}</p>
          <ButtonLink href={{ pathname: "/", hash: "lineup" }} className="mt-6">
            {t("emptyCta")}
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <ul className="space-y-5 lg:col-span-8">
            {items.map((item) => (
              <CartRow key={item.id} item={item} />
            ))}
          </ul>
          <aside className="lg:col-span-4">
            <div className="rounded-[var(--radius-card)] bg-surface p-6 lg:sticky lg:top-16">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{t("subtotal")}</span>
                <span className="text-2xl font-semibold tabular-nums">{formatPrice(subtotal, locale)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {t("exclVat")}. {t("deliveryNote")}
              </p>
              <ButtonLink href="/quote" className="mt-6 w-full">
                {t("requestQuote")}
              </ButtonLink>
              <p className="mt-3 text-center text-xs text-muted">{t("noPayment")}</p>
              <Link href={{ pathname: "/", hash: "lineup" }} className="mt-4 block text-center text-sm text-accent hover:underline underline-offset-4">
                {t("continue")}
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const t = useTranslations("cart");
  const ts = useTranslations("spec");
  const locale = useLocale();
  const { duplicate, remove, setQuantity } = useCart();
  const product = getProduct(item.config.product);
  const price = useMemo(() => priceItem(item.config), [item.config]);
  if (!product) return null;
  const specs = describeConfig(item.config, ts as unknown as SpecTranslator, locale);
  const actionClass = "inline-flex min-h-11 items-center px-1 text-sm text-accent hover:underline underline-offset-4";

  return (
    <li className="rounded-[var(--radius-card)] border border-line p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="w-full shrink-0 rounded-2xl bg-surface p-3 sm:w-48">
          <PitchIllustration config={item.config} title={product.name} className="aspect-[4/3] w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-xl font-semibold tabular-nums">{formatPrice(price.total, locale)}</p>
          </div>
          <ul className="mt-2 space-y-0.5 text-sm text-muted">
            {specs.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-accent">{t("priceDetails")}</summary>
            <div className="mt-3">
              <PriceLines price={price} config={item.config} />
            </div>
          </details>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:w-56">
              <Stepper
                label={t("quantity")}
                value={String(item.config.quantity)}
                onDecrease={() => setQuantity(item.id, item.config.quantity - 1)}
                onIncrease={() => setQuantity(item.id, item.config.quantity + 1)}
                canDecrease={item.config.quantity > 1}
                canIncrease={item.config.quantity < optionCatalog.maxQuantity}
                decreaseLabel={`${t("quantity")} −`}
                increaseLabel={`${t("quantity")} +`}
              />
            </div>
            <div className="flex gap-4">
              <Link href={{ pathname: `/configure/${product.slug}`, query: { edit: item.id } }} className={actionClass}>
                {t("edit")}
              </Link>
              <button type="button" onClick={() => duplicate(item.id)} className={actionClass}>
                {t("duplicate")}
              </button>
              <button type="button" onClick={() => remove(item.id)} className={`${actionClass} text-danger`}>
                {t("remove")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
