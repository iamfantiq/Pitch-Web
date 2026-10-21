import { materials } from "@/config/materials";
import { pricing, type PricingSettings } from "@/config/pricing";
import type { Bom, BomLine, BomScope } from "./bom";

export interface CostBreakdown {
  materials: number;
  finishing: number;
  labour: number;
  overhead: number;
  total: number;
}

/** Internal cost of one BOM line (EUR). */
export function lineCost(line: BomLine): number {
  const m = materials[line.materialId];
  return m.category === "steel" ? line.qty * m.kgPerM * m.costPerKg : line.qty * m.unitCost;
}

/**
 * cost = materials + labour × rate + finishing + overhead.
 * Labour is part of the structure; options are priced from their own customer prices.
 */
export function computeCost(bom: Bom, scope: BomScope, settings: PricingSettings = pricing): CostBreakdown {
  let materialsCost = 0;
  let finishing = 0;
  for (const line of bom.lines) {
    if (line.scope !== scope) continue;
    if (materials[line.materialId].category === "finishing") finishing += lineCost(line);
    else materialsCost += lineCost(line);
  }
  const labour = scope === "structure" ? bom.labourHours * settings.cost.labourRatePerHour : 0;
  const overhead = (materialsCost + finishing + labour) * settings.cost.overheadRate;
  return { materials: materialsCost, finishing, labour, overhead, total: materialsCost + finishing + labour + overhead };
}
