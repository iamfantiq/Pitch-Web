"use client";

import { useLocale, useTranslations } from "next-intl";
import Script from "next/script";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { buttonClass, ButtonLink } from "@/components/ui/Button";
import { getProduct } from "@/config/products";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import { formatMoney, formatPrice } from "@/lib/format";
import { computeQuote } from "@/lib/pricing/quote";
import { countryCodes, countryName } from "@/lib/quote/countries";
import type { Customer } from "@/lib/quote/schema";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const emptyCustomer: Customer = {
  name: "",
  company: "",
  vatNumber: "",
  email: "",
  phone: "",
  country: "LV",
  address: "",
  desiredDate: "",
  comment: "",
};

type FormError = "generic" | "rateLimited" | "invalidCart";

export function QuoteForm() {
  const t = useTranslations("quote");
  const locale = useLocale();
  const router = useRouter();
  const hydrated = useCartHydrated();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [error, setError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configs = useMemo(() => items.map((i) => i.config), [items]);
  const totals = useMemo(() => computeQuote(configs, { country: customer.country, vatNumber: customer.vatNumber }), [configs, customer.country, customer.vatNumber]);
  const countries = useMemo(
    () => countryCodes.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => (a.code === "LV" ? -1 : b.code === "LV" ? 1 : a.name.localeCompare(b.name, locale))),
    [locale],
  );

  if (!hydrated) return <div className="container-page min-h-[50vh] pt-10" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="container-page pt-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-6 text-lg text-muted">{t("emptyCart")}</p>
        <ButtonLink href={{ pathname: "/", hash: "lineup" }} className="mt-6">
          {t("backToCart")}
        </ButtonLink>
      </div>
    );
  }

  const field = <K extends keyof Customer>(key: K) => ({
    id: `f-${key}`,
    name: key,
    value: customer[key],
    "aria-invalid": invalid.has(key) || undefined,
    onChange: (e: { target: { value: string } }) => {
      setCustomer({ ...customer, [key]: e.target.value });
      if (invalid.has(key)) setInvalid(new Set([...invalid].filter((k) => k !== key)));
    },
  });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          customer,
          items: configs,
          website: String(form.get("website") ?? ""),
          turnstileToken: form.get("cf-turnstile-response")?.toString(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { number?: string; error?: string; issues?: string[] };
      if (res.ok && data.number) {
        clear();
        router.push({ pathname: "/quote/thanks", query: { number: data.number } });
        return;
      }
      if (res.status === 429) setError("rateLimited");
      else if (data.issues?.some((p) => p.startsWith("items"))) setError("invalidCart");
      else if (data.issues?.length) setInvalid(new Set(data.issues.filter((p) => p.startsWith("customer.")).map((p) => p.slice(9))));
      else setError("generic");
    } catch {
      setError("generic");
    }
    setSubmitting(false);
  };

  const input =
    "mt-1 block w-full min-h-12 rounded-xl border border-line bg-white px-4 text-[15px] outline-none transition-colors focus:border-accent aria-[invalid=true]:border-danger";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container-page pt-8">
      <Link href="/cart" className="text-sm text-accent hover:underline underline-offset-4">
        {t("backToCart")}
      </Link>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t("subtitle")}</p>

      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-12" noValidate={false}>
        <div className="space-y-10 lg:col-span-7">
          <fieldset className="space-y-4">
            <legend className="mb-2 text-2xl font-semibold">{t("contact")}</legend>
            <Field label={t("fields.name")} htmlFor="f-name" error={invalid.has("name") ? t("errors.required") : null}>
              <input {...field("name")} required minLength={2} autoComplete="name" className={input} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.company")} optional={t("optional")} htmlFor="f-company">
                <input {...field("company")} autoComplete="organization" className={input} />
              </Field>
              <Field label={t("fields.vatNumber")} optional={t("optional")} htmlFor="f-vatNumber">
                <input {...field("vatNumber")} className={input} />
              </Field>
            </div>
            <p className="text-xs text-muted">{t("vatHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.email")} htmlFor="f-email" error={invalid.has("email") ? t("errors.email") : null}>
                <input {...field("email")} type="email" required autoComplete="email" className={input} />
              </Field>
              <Field label={t("fields.phone")} htmlFor="f-phone" error={invalid.has("phone") ? t("errors.required") : null}>
                <input {...field("phone")} type="tel" required minLength={5} autoComplete="tel" className={input} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-2xl font-semibold">{t("delivery")}</legend>
            <Field label={t("fields.country")} htmlFor="f-country">
              <select {...field("country")} required autoComplete="country" className={input}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("fields.address")} htmlFor="f-address" error={invalid.has("address") ? t("errors.required") : null}>
              <textarea {...field("address")} required minLength={5} rows={3} autoComplete="street-address" className={`${input} py-3`} />
            </Field>
            <Field label={t("fields.desiredDate")} optional={t("optional")} htmlFor="f-desiredDate">
              <input {...field("desiredDate")} type="date" min={today} className={input} />
            </Field>
            <Field label={t("fields.comment")} optional={t("optional")} htmlFor="f-comment">
              <textarea {...field("comment")} rows={4} maxLength={2000} className={`${input} py-3`} />
            </Field>
          </fieldset>

          {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="rounded-[var(--radius-card)] bg-surface p-6 lg:sticky lg:top-16">
            <h2 className="text-lg font-semibold">{t("summary")}</h2>
            <p className="text-sm text-muted">{t("items", { count: items.length })}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {items.map((item, i) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {getProduct(item.config.product)?.name}
                    {item.config.quantity > 1 ? ` × ${item.config.quantity}` : ""}
                  </span>
                  <span className="tabular-nums">{formatPrice(totals.items[i]?.total ?? 0, locale)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <Row label={totals.delivery ? t("delivery_", { pallets: totals.delivery.pallets }) : t("deliveryOnRequest")} value={totals.delivery ? formatPrice(totals.delivery.amount, locale) : "—"} />
              <Row label={t("net")} value={formatMoney(totals.net, locale)} strong />
              <Row label={totals.reverseCharge ? t("reverseCharge") : t("vat", { rate: Math.round(totals.vatRate * 100) })} value={formatMoney(totals.vat, locale)} />
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-semibold">{t("total")}</span>
              <span className="text-2xl font-semibold tabular-nums">{formatMoney(totals.total, locale)}</span>
            </div>

            {turnstileSiteKey ? (
              <>
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                <div className="cf-turnstile mt-5" data-sitekey={turnstileSiteKey} />
              </>
            ) : null}

            <button type="submit" disabled={submitting} className={buttonClass("primary", "mt-6 w-full")}>
              {submitting ? t("submitting") : t("submit")}
            </button>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {t(`errors.${error}`)}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-muted">{t("legal")}</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, optional, error, children }: { label: string; htmlFor: string; optional?: string; error?: string | null; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label} {optional ? <span className="font-normal text-muted">({optional})</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
