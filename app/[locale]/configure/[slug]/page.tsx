import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Configurator } from "@/components/configurator/Configurator";
import { getProduct, productOrder } from "@/config/products";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => productOrder.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/configure/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const t = await getTranslations({ locale, namespace: "configurator" });
  return { title: t("title", { product: product.name }) };
}

export default async function ConfigurePage({ params }: PageProps<"/[locale]/configure/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <Suspense>
      <Configurator slug={product.slug} />
    </Suspense>
  );
}
