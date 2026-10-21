/** Countries offered in the quote form (ISO 3166-1 alpha-2). Names come from Intl.DisplayNames. */
export const countryCodes = [
  "LV", "EE", "LT", "FI", "SE", "NO", "DK", "IS", "DE", "PL", "NL", "BE", "LU", "FR", "AT", "CH", "CZ", "SK", "HU",
  "SI", "HR", "IT", "ES", "PT", "IE", "GB", "RO", "BG", "GR", "CY", "MT", "UA", "GE", "AE", "SA", "QA", "US", "CA",
] as const;

export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
