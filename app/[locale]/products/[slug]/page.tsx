import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { getProduct, productOrder } from "@/config/products";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatNumber, formatPrice } from "@/lib/format";
import { computeGeometry } from "@/lib/pricing/geometry";
import { defaultConfiguration } from "@/lib/pricing/schema";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => productOrder.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const t = await getTranslations({ locale, namespace: "product" });
  return { title: product.name, description: t(`taglines.${product.slug}`) };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = getProduct(slug);
  if (!product) notFound();

  const t = await getTranslations("product");
  const th = await getTranslations("home");
  const geometry = computeGeometry(defaultConfiguration(product.slug));
  const n = (v: number) => formatNumber(v, locale, 1);

  const specs: [string, string][] = [
    [t("size"), `${n(geometry.length)} × ${n(geometry.width)} m`],
    [
      t("height"),
      product.cage
        ? `${n(geometry.boardHeight + geometry.barHeight)} m · ${t("barsAbove", { board: n(geometry.boardHeight), bars: n(geometry.barHeight) })}`
        : `${n(geometry.boardHeight)} m`,
    ],
    [t("goal"), `${n(product.goal.width)} × ${n(product.goal.height)} m`],
    [t("shape"), t(`shapes.${product.shape}`)],
    [t("boardWidth"), `${n(product.boardWidth)} m`],
    [t("construction"), t("constructionValue")],
    [t("branding"), t("brandingValue")],
  ];

  return (
    <div className="container-page pt-8">
      <Link href={{ pathname: "/", hash: "lineup" }} className="text-sm text-accent hover:underline underline-offset-4">
        ‹ {t("back")}
      </Link>
      <div className="mt-6 grid items-center gap-10 lg:grid-cols-2">
        <div className="rounded-[var(--radius-card)] bg-surface p-6 sm:p-10">
          <ProductVisual product={product} priority className="aspect-[4/3] w-full" />
        </div>
        <div>
          <h1 className="text-5xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-3 text-xl text-muted">{t(`taglines.${product.slug}`)}</p>
          <p className="mt-6 text-lg">
            {formatPrice(product.catalogPrice, locale)} <span className="text-sm text-muted">{th("exclVat")} · {t("standardPrice")}</span>
          </p>
          <ButtonLink href={`/configure/${product.slug}`} className="mt-6 w-full sm:w-auto">
            {t("configure")}
          </ButtonLink>
          <p className="mt-6 text-muted">{t("customise")}</p>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-3xl font-semibold tracking-tight">{t("specs")}</h2>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {specs.map(([label, value]) => (
            <div key={label} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-3">
              <dt className="text-muted">{label}</dt>
              <dd className="sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
