import { createTranslator } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import en from "@/messages/en.json";
import lv from "@/messages/lv.json";

const messages = { en, lv } satisfies Record<Locale, unknown>;

export function toLocale(value: string): Locale {
  return (routing.locales as readonly string[]).includes(value) ? (value as Locale) : routing.defaultLocale;
}

/** Translator usable outside React/request scope (PDFs, emails, background work). */
export function translatorFor(locale: string, namespace: "spec" | "offer" | "configurator.summary.lines") {
  const l = toLocale(locale);
  const t = createTranslator({ locale: l, messages: messages[l], namespace });
  return t as unknown as (key: string, values?: Record<string, string | number>) => string;
}
