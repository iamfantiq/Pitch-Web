"use client";

import { useTranslations } from "next-intl";
import { PitchIllustration } from "@/components/ui/PitchIllustration";
import type { Product } from "@/config/products";
import type { Configuration } from "@/lib/pricing/schema";

export function Preview({ config, product }: { config: Configuration; product: Product }) {
  const t = useTranslations("configurator");
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-4 sm:p-8">
      <PitchIllustration config={config} title={`${t("preview")}: ${product.name}`} className="aspect-[4/3] w-full" />
    </div>
  );
}
