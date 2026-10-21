/**
 * Material catalog. Every BOM line references one of these IDs, and phase 2 maps each ID to a supplier,
 * so keep IDs stable once quotes exist (add new IDs rather than renaming).
 *
 * TODO(owner): all costs are placeholders. In calibration mode only their *ratios* matter
 * (they decide how much a custom size costs relative to the standard one).
 */

export type Unit = "m" | "pcs" | "sheet" | "m2" | "kg" | "set";

export type MaterialCategory = "steel" | "plywood" | "hardware" | "goal" | "net" | "print" | "surface" | "finishing" | "accessory";

interface MaterialBase {
  name: string;
  category: MaterialCategory;
}

/** Steel is listed in metres; cost and weight come from kg/m × €/kg. */
export interface SteelMaterial extends MaterialBase {
  category: "steel";
  unit: "m";
  kgPerM: number;
  costPerKg: number;
}

export interface PlywoodMaterial extends MaterialBase {
  category: "plywood";
  unit: "sheet";
  sheet: { length: number; width: number; thicknessMm: number };
  unitCost: number;
}

export interface CountedMaterial extends MaterialBase {
  category: Exclude<MaterialCategory, "steel" | "plywood">;
  unit: Exclude<Unit, "m" | "sheet">;
  unitCost: number;
}

export type Material = SteelMaterial | PlywoodMaterial | CountedMaterial;

export const materials = {
  // Steel profiles (kg/m from standard tables)
  "steel-sq-40x40x2": { name: "Square tube 40×40×2", category: "steel", unit: "m", kgPerM: 2.31, costPerKg: 1.6 },
  "steel-sq-30x30x2": { name: "Square tube 30×30×2", category: "steel", unit: "m", kgPerM: 1.68, costPerKg: 1.6 },
  "steel-sq-20x20x1.5": { name: "Square tube 20×20×1.5", category: "steel", unit: "m", kgPerM: 0.83, costPerKg: 1.7 },
  "steel-rect-40x20x2": { name: "Rectangular tube 40×20×2", category: "steel", unit: "m", kgPerM: 1.68, costPerKg: 1.6 },
  "steel-sq-50x50x3": { name: "Square tube 50×50×3", category: "steel", unit: "m", kgPerM: 4.25, costPerKg: 1.6 },
  "steel-sq-60x60x3": { name: "Square tube 60×60×3", category: "steel", unit: "m", kgPerM: 5.19, costPerKg: 1.6 },

  // Plywood
  "plywood-18-2500x1250": {
    name: "Film-faced birch plywood 18 mm, 2500×1250",
    category: "plywood",
    unit: "sheet",
    sheet: { length: 2.5, width: 1.25, thicknessMm: 18 },
    unitCost: 65,
  },

  // Hardware
  "bolt-m10-set": { name: "Bolt M10 + nut + washers", category: "hardware", unit: "pcs", unitCost: 0.6 },
  "connector-straight": { name: "Board connector (straight)", category: "hardware", unit: "pcs", unitCost: 4 },
  "connector-angled": { name: "Board connector (angled)", category: "hardware", unit: "pcs", unitCost: 9 },
  "foot-plate": { name: "Support foot plate", category: "hardware", unit: "pcs", unitCost: 6 },

  // Goals, nets
  "goal-net-standard": { name: "Goal net (standard)", category: "goal", unit: "pcs", unitCost: 25 },
  "goal-net-pro": { name: "Goal net (pro, knotless 4 mm)", category: "goal", unit: "pcs", unitCost: 60 },
  "fence-net": { name: "Ball-stop net", category: "net", unit: "m2", unitCost: 3.5 },

  // Options
  "print-vinyl": { name: "Printed vinyl wrap", category: "print", unit: "m2", unitCost: 18 },
  "turf-artificial": { name: "Artificial turf", category: "surface", unit: "m2", unitCost: 9 },
  "transport-cart": { name: "Transport cart", category: "accessory", unit: "pcs", unitCost: 420 },
  "storage-bag-set": { name: "Storage bag set", category: "accessory", unit: "set", unitCost: 60 },

  // Finishing (subcontracted services, priced per kg of steel)
  galvanizing: { name: "Hot-dip galvanizing", category: "finishing", unit: "kg", unitCost: 0.8 },
  "powder-coating": { name: "Powder coating (RAL)", category: "finishing", unit: "kg", unitCost: 1.1 },
} satisfies Record<string, Material>;

export type MaterialId = keyof typeof materials;

export function getMaterial(id: MaterialId): Material {
  return materials[id];
}
