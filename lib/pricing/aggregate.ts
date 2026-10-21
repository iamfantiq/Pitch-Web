import { materials, type MaterialCategory, type MaterialId, type Unit } from "@/config/materials";
import type { Bom } from "./bom";

export interface MaterialRequirement {
  materialId: MaterialId;
  name: string;
  category: MaterialCategory;
  unit: Unit;
  qty: number;
  /** Steel only. */
  kg?: number;
}

export interface MaterialSummary {
  requirements: MaterialRequirement[];
  steelKg: number;
  plywoodSheets: number;
  plywoodNetM2: number;
  labourHours: number;
}

const categoryOrder: MaterialCategory[] = ["steel", "plywood", "hardware", "goal", "net", "print", "surface", "accessory", "finishing"];
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Sum BOMs (× quantity) into one material requirement per material.
 * Used by the admin quote view now and by supplier purchase orders in phase 2.
 */
export function aggregateBoms(entries: { bom: Bom; quantity: number }[]): MaterialSummary {
  const totals = new Map<MaterialId, number>();
  let labourHours = 0;
  let plywoodNetM2 = 0;
  for (const { bom, quantity } of entries) {
    labourHours += bom.labourHours * quantity;
    plywoodNetM2 += bom.plywoodNetM2 * quantity;
    for (const line of bom.lines) totals.set(line.materialId, (totals.get(line.materialId) ?? 0) + line.qty * quantity);
  }

  const requirements = [...totals.entries()]
    .map(([materialId, qty]): MaterialRequirement => {
      const m = materials[materialId];
      return {
        materialId,
        name: m.name,
        category: m.category,
        unit: m.unit,
        qty: round2(qty),
        ...(m.category === "steel" ? { kg: Math.round(qty * m.kgPerM * 10) / 10 } : {}),
      };
    })
    .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name));

  return {
    requirements,
    steelKg: Math.round(requirements.reduce((s, r) => s + (r.kg ?? 0), 0) * 10) / 10,
    plywoodSheets: requirements.filter((r) => r.category === "plywood").reduce((s, r) => s + r.qty, 0),
    plywoodNetM2: round2(plywoodNetM2),
    labourHours: round2(labourHours),
  };
}
