import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuoteForm } from "@/components/quote/QuoteForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/quote">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quote" });
  return { title: t("title"), robots: { index: false } };
}

export default async function QuotePage({ params }: PageProps<"/[locale]/quote">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QuoteForm />;
}
