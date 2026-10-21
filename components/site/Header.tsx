import { useTranslations } from "next-intl";
import { site } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Header() {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        {t("skip")}
      </a>
      <div className="container-page flex h-12 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Logo />
          <span>{site.name}</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-[13px] text-ink/80 sm:gap-5">
          <Link href={{ pathname: "/", hash: "lineup" }} className="hidden px-2 py-2 hover:text-ink sm:inline">
            {t("products")}
          </Link>
          <Link href={{ pathname: "/", hash: "how" }} className="hidden px-2 py-2 hover:text-ink md:inline">
            {t("howItWorks")}
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" />
    </svg>
  );
}
