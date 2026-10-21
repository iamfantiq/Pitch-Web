const localeTags: Record<string, string> = { en: "en-IE", lv: "lv-LV" };

export function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(localeTags[locale] ?? locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(localeTags[locale] ?? locale, { maximumFractionDigits }).format(value);
}

/** Amount with cents, for VAT and invoice totals. */
export function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(localeTags[locale] ?? locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTags[locale] ?? locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(isoDate));
}
