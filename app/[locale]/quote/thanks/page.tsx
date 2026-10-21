import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";

export async function generateMetadata({ params }: PageProps<"/[locale]/quote/thanks">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "thanks" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ThanksPage({ params, searchParams }: PageProps<"/[locale]/quote/thanks">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { number } = await searchParams;
  const quoteNumber = typeof number === "string" && /^Q-\d{4}-\d+$/.test(number) ? number : "";
  const t = await getTranslations("thanks");

  return (
    <div className="container-page max-w-2xl pt-20 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft text-3xl text-accent" aria-hidden="true">
        ✓
      </div>
      <h1 className="mt-6 text-5xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-4 text-lg">{t("textNoEmail", { number: quoteNumber })}</p>
      <p className="mt-2 text-muted">{t("next")}</p>
      <ButtonLink href="/" className="mt-8">
        {t("home")}
      </ButtonLink>
    </div>
  );
}
