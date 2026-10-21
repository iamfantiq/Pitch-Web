/**
 * Option choices offered in the configurator. Prices for these live in config/pricing.ts.
 */
export const optionCatalog = {
  goalTypes: ["standard", "pro"] as const,
  brandingCoverage: ["none", "logos", "full"] as const,
  finishes: ["galvanized", "powder"] as const,
  surfaces: ["none", "turf"] as const,
  /** Total height of the net behind each goal (m). 0 = none. */
  fencingHeights: [2, 3, 4] as readonly number[],
  /** Powder-coat colours offered as swatches (RAL code → display hex). */
  ralColours: {
    "RAL 9005": "#0a0a0a",
    "RAL 9016": "#f1f0ea",
    "RAL 7016": "#383e42",
    "RAL 6018": "#57a639",
    "RAL 5015": "#2271b3",
    "RAL 3020": "#cc0605",
  } as Record<string, string>,
  maxQuantity: 50,
};

export type GoalType = (typeof optionCatalog.goalTypes)[number];
export type BrandingCoverage = (typeof optionCatalog.brandingCoverage)[number];
export type Finish = (typeof optionCatalog.finishes)[number];
export type Surface = (typeof optionCatalog.surfaces)[number];
