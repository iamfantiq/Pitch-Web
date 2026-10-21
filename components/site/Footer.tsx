import { useTranslations } from "next-intl";
import { site } from "@/config/site";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-24 bg-surface py-10 text-xs text-muted">
      <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-ink">{site.name}</p>
          <p>{t("tagline")}</p>
          <p>{t("pricesNote")}</p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p>
            <a href={`mailto:${site.email}`} className="hover:text-ink">{site.email}</a>
            {" · "}
            <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="hover:text-ink">{site.phone}</a>
          </p>
          <p>{site.address}</p>
          <p>© {new Date().getFullYear()} {site.name}. {t("rights")}</p>
        </div>
      </div>
    </footer>
  );
}
