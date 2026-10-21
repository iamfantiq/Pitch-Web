"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart, useCartHydrated } from "@/lib/cart/store";

export function CartLink() {
  const t = useTranslations("nav");
  const hydrated = useCartHydrated();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.config.quantity, 0));
  const shown = hydrated ? count : 0;

  return (
    <Link href="/cart" className="relative flex size-10 items-center justify-center rounded-full hover:bg-surface" aria-label={`${t("cart")} (${shown})`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {shown > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-5 text-white">
          {shown}
        </span>
      ) : null}
    </Link>
  );
}
