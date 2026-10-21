import { getProduct } from "@/config/products";
import { computeGeometry } from "@/lib/pricing/geometry";
import type { PriceLine } from "@/lib/pricing/price";
import type { Configuration } from "@/lib/pricing/schema";
import { formatNumber } from "@/lib/format";

/** Translator for the "spec" namespace (next-intl useTranslations / createTranslator). */
export type SpecTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Human-readable spec lines for a configuration (cart, PDF, emails, admin). */
export function describeConfig(config: Configuration, t: SpecTranslator, locale: string): string[] {
  const g = computeGeometry(config);
  const n = (v: number, digits = 2) => formatNumber(v, locale, digits);
  const lines: string[] = [t("size", { dims: `${n(g.length)} × ${n(g.width)} m` })];

  lines.push(
    g.barHeight > 0
      ? t("boardsBars", { board: n(g.boardHeight), bars: n(g.barHeight), total: n(g.boardHeight + g.barHeight) })
      : t("boards", { board: n(g.boardHeight) }),
  );
  lines.push(config.goal === "pro" ? t("goalPro") : t("goalStandard"));
  if (config.fencingHeight > 0) lines.push(t("fencing", { height: n(config.fencingHeight) }));

  const { coverage, boards, sides, logoUploadId } = config.branding;
  const sidesText = sides === 2 ? t("sidesTwo") : t("sidesOne");
  if (coverage === "logos") lines.push(t("brandingLogos", { count: boards, sides: sidesText }));
  if (coverage === "full") lines.push(t("brandingFull", { sides: sidesText }));
  if (coverage !== "none" && logoUploadId) lines.push(t("logoAttached"));

  lines.push(config.finish.type === "powder" ? t("finishPowder", { ral: config.finish.ral ?? "" }) : t("finishGalvanized"));
  if (config.surface === "turf") lines.push(t("turf", { area: n(g.area, 0) }));
  if (config.extras.transportCart) lines.push(t("transportCart"));
  if (config.extras.storageBags) lines.push(t("storageBags"));
  if (config.extras.installation) lines.push(t("installation"));
  return lines;
}

/** Translator for the "configurator.summary.lines" namespace. */
export type LineTranslator = (key: PriceLine["key"], values: Record<string, string | number>) => string;

/** Customer-facing label for a price line. */
export function lineLabel(line: PriceLine, config: Configuration, t: LineTranslator, locale: string): string {
  const product = getProduct(config.product);
  const g = computeGeometry(config);
  const n = (v: number) => formatNumber(v, locale, 1);
  return t(line.key, {
    product: product?.name ?? "",
    dims: `${n(g.length)} × ${n(g.width)} m`,
    value: n(g.boardHeight + g.barHeight),
    qty: line.unit === "m2" ? n(line.qty ?? 0) : (line.qty ?? 0),
  });
}
