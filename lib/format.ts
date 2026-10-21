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
