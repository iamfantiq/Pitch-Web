"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("language")} className="flex items-center rounded-full bg-surface p-0.5 text-xs font-medium">
      {routing.locales.map((l: Locale) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              // @ts-expect-error -- params always match the current pathname
              router.replace({ pathname, params }, { locale: l });
            })
          }
          className={`min-h-8 min-w-9 rounded-full px-2 uppercase transition-colors ${
            l === locale ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
