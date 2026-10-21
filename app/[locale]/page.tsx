import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { PitchIllustration } from "@/components/ui/PitchIllustration";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { productOrder, products, type ProductSlug } from "@/config/products";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { defaultConfiguration, type Configuration } from "@/lib/pricing/schema";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <>
      <section className="container-page pt-14 text-center sm:pt-20">
        <p className="fade-up text-sm font-semibold uppercase tracking-[0.14em] text-accent">{t("eyebrow")}</p>
        <h1 className="fade-up mx-auto mt-3 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">{t("title")}</h1>
        <p className="fade-up mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">{t("subtitle")}</p>
        <div className="fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/configure/the-cage">{t("ctaConfigure")}</ButtonLink>
          <ButtonLink href={{ pathname: "/", hash: "lineup" }} variant="ghost">
            {t("ctaLineup")} ›
          </ButtonLink>
        </div>
        <div className="fade-up mx-auto mt-12 max-w-5xl rounded-[2rem] bg-gradient-to-b from-surface to-white px-4 py-8 sm:px-12 sm:py-14">
          <ProductVisual product={products["the-cage"]} priority className="mx-auto aspect-[16/9] w-full" />
        </div>
      </section>

      <Lineup />
      <Features />
      <HowItWorks />
      <References />
    </>
  );
}

function Lineup() {
  const t = useTranslations("home");
  const tp = useTranslations("product");
  const locale = useLocale();

  return (
    <section id="lineup" className="container-page scroll-mt-16 pt-24">
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("lineupTitle")}</h2>
      <p className="mt-2 text-lg text-muted">{t("lineupSubtitle")}</p>
      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {productOrder.map((slug, i) => {
          const product = products[slug];
          return (
            <li key={slug} className={`flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface ${i === 0 ? "md:col-span-2" : ""}`}>
              <div className="px-6 pt-8 text-center sm:px-10">
                <h3 className="text-3xl font-semibold tracking-tight">{product.name}</h3>
                <p className="mx-auto mt-2 max-w-md text-muted">{tp(`taglines.${slug}`)}</p>
                <p className="mt-3 text-sm">
                  {t("from", { price: formatPrice(product.catalogPrice, locale) })}{" "}
                  <span className="text-muted">{t("exclVat")}</span>
                </p>
                <div className="mt-5 flex items-center justify-center gap-5">
                  <ButtonLink href={`/configure/${slug}`} className="min-h-10 px-5 text-sm">
                    {t("configure")}
                  </ButtonLink>
                  <Link href={`/products/${slug}`} className="text-sm text-accent hover:underline underline-offset-4">
                    {t("learnMore")} ›
                  </Link>
                </div>
              </div>
              <div className="mt-auto px-6 pb-6 pt-6">
                <ProductVisual product={product} className={`mx-auto w-full ${i === 0 ? "aspect-[21/9]" : "aspect-[4/3]"}`} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Features() {
  const t = useTranslations("home");
  const items = ["modular", "durable", "branded"] as const;
  return (
    <section className="container-page pt-24">
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("featuresTitle")}</h2>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {items.map((key) => (
          <div key={key}>
            <h3 className="text-xl font-semibold">{t(`features.${key}.title`)}</h3>
            <p className="mt-2 text-muted">{t(`features.${key}.text`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("home");
  const steps = ["pick", "configure", "offer"] as const;
  return (
    <section id="how" className="container-page scroll-mt-16 pt-24">
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("howTitle")}</h2>
      <ol className="mt-10 grid gap-5 sm:grid-cols-3">
        {steps.map((key, i) => (
          <li key={key} className="rounded-[var(--radius-card)] bg-surface p-8">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-lg font-semibold text-white" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="mt-6 text-2xl font-semibold">{t(`steps.${key}.title`)}</h3>
            <p className="mt-2 text-muted">{t(`steps.${key}.text`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// TODO(owner): replace with real reference photos (e.g. /public/references/*.jpg).
const referenceVariants: { slug: ProductSlug; tweak: (c: Configuration) => Configuration }[] = [
  { slug: "the-cage", tweak: (c) => ({ ...c, surface: "turf", finish: { type: "powder", ral: "RAL 9005" } }) },
  { slug: "panna-cage", tweak: (c) => ({ ...c, surface: "turf", finish: { type: "powder", ral: "RAL 3020" } }) },
  { slug: "the-pitch", tweak: (c) => ({ ...c, branding: { ...c.branding, coverage: "full" } }) },
  { slug: "kids-pitch", tweak: (c) => ({ ...c, surface: "turf", finish: { type: "powder", ral: "RAL 5015" } }) },
];

function References() {
  const t = useTranslations("home");
  return (
    <section id="references" className="container-page scroll-mt-16 pt-24">
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("referencesTitle")}</h2>
      <p className="mt-2 text-lg text-muted">{t("referencesSubtitle")}</p>
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {referenceVariants.map(({ slug, tweak }, i) => (
          <li key={i} className="rounded-2xl bg-surface p-4">
            <PitchIllustration config={tweak(defaultConfiguration(slug))} title={t("referenceAlt", { n: i + 1 })} className="aspect-square w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
