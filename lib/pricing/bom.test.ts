import { describe, expect, it } from "vitest";
import { materials } from "@/config/materials";
import { productOrder } from "@/config/products";
import { aggregateBoms } from "./aggregate";
import { computeBom, piecesPerSheet, sheetsFor } from "./bom";
import { defaultConfiguration, type Configuration } from "./schema";

const sheet = { length: 2.5, width: 1.25, thicknessMm: 18 };
const qty = (c: Configuration, id: keyof typeof materials) =>
  computeBom(c).lines.filter((l) => l.materialId === id).reduce((s, l) => s + l.qty, 0);

describe("plywood cutting", () => {
  it("fits pieces on a 2500 × 1250 sheet", () => {
    expect(piecesPerSheet(2.0, 1.0, sheet)).toBe(1);
    expect(piecesPerSheet(1.5, 0.5, sheet)).toBe(2);
    expect(piecesPerSheet(2.5, 0.6, sheet)).toBe(2);
    expect(piecesPerSheet(0.5, 1.0, sheet)).toBe(5);
    expect(piecesPerSheet(3.0, 1.0, sheet)).toBe(0);
  });

  it("joins oversize pieces by area plus waste", () => {
    expect(sheetsFor([{ use: "x", width: 3, height: 1, count: 2 }], sheet, 0.1)).toBe(Math.ceil((6 * 1.1) / 3.125));
    expect(sheetsFor([{ use: "x", width: 2, height: 1, count: 16 }], sheet, 0.1)).toBe(16);
  });
});

describe("bill of materials", () => {
  it.each(productOrder)("%s standard BOM has steel, plywood, hardware and goals", (slug) => {
    const bom = computeBom(defaultConfiguration(slug));
    const cats = new Set(bom.lines.map((l) => materials[l.materialId].category));
    for (const c of ["steel", "plywood", "hardware", "goal", "finishing"]) expect(cats).toContain(c);
    expect(bom.steelKg).toBeGreaterThan(0);
    expect(bom.lines.every((l) => l.scope === "structure")).toBe(true);
  });

  it("The Pitch standard: plywood sheets and joint hardware", () => {
    const c = defaultConfiguration("the-pitch");
    // 16 boards (1/sheet) + 4 corner boards 2.12 × 1.0 (1/sheet) + 4 surrounds 0.5 × 1.0 (5/sheet → 1)
    expect(qty(c, "plywood-18-2500x1250")).toBe(16 + 4 + 1);
    // 16 boards + 4 corners + 4 surrounds + 2 goals = 26 joints, 8 of them angled
    expect(qty(c, "connector-angled")).toBe(8);
    expect(qty(c, "connector-straight")).toBe(18);
    expect(qty(c, "bolt-m10-set")).toBe(26 * 4);
    expect(qty(c, "goal-net-standard")).toBe(2);
    expect(qty(c, "foot-plate")).toBe(24);
  });

  it("taller boards add a board above each goal", () => {
    const low = computeBom(defaultConfiguration("the-pitch"));
    const high = computeBom({ ...defaultConfiguration("the-pitch"), boardHeight: 1.2 });
    expect(low.plywoodPieces.some((p) => p.use === "Boards above goals")).toBe(false);
    const lintel = high.plywoodPieces.find((p) => p.use === "Boards above goals");
    expect(lintel?.count).toBe(2);
    expect(lintel?.height).toBeCloseTo(0.2);
  });

  it("cage variants add bars, rails and posts", () => {
    expect(qty(defaultConfiguration("the-pitch"), "steel-sq-20x20x1.5")).toBe(0);
    const cage = defaultConfiguration("the-cage");
    expect(qty(cage, "steel-sq-20x20x1.5")).toBeGreaterThan(0);
    expect(qty(cage, "steel-rect-40x20x2")).toBeGreaterThan(0);
    const higher = { ...cage, barHeight: 2.0 };
    expect(qty(higher, "steel-sq-20x20x1.5")).toBeGreaterThan(qty(cage, "steel-sq-20x20x1.5"));
  });

  it("options appear as option-scoped lines only", () => {
    const base = defaultConfiguration("the-pitch");
    const c: Configuration = {
      ...base,
      goal: "pro",
      fencingHeight: 3,
      branding: { coverage: "full", boards: 0, sides: 2, logoUploadId: null },
      finish: { type: "powder", ral: "RAL 9005" },
      surface: "turf",
      extras: { transportCart: true, storageBags: true, installation: true },
    };
    const bom = computeBom(c);
    const structure = (b: typeof bom) => b.lines.filter((l) => l.scope === "structure");
    expect(structure(bom)).toEqual(structure(computeBom(base)));
    const ids = bom.lines.filter((l) => l.scope === "option").map((l) => l.materialId);
    for (const id of ["goal-net-pro", "fence-net", "print-vinyl", "powder-coating", "turf-artificial", "transport-cart", "storage-bag-set"])
      expect(ids).toContain(id);
    // Full wrap on both sides = all panel faces × 2
    expect(qty(c, "print-vinyl")).toBeCloseTo(bom.plywoodNetM2 * 2, 1);
    expect(qty(c, "turf-artificial")).toBeCloseTo(150 - 4.5, 1);
  });

  it("logo branding prints selected boards only", () => {
    const c = defaultConfiguration("the-pitch");
    const logos = { ...c, branding: { coverage: "logos" as const, boards: 4, sides: 1 as const, logoUploadId: null } };
    expect(qty(logos, "print-vinyl")).toBeCloseTo(4 * 2.0 * 1.0);
  });
});

describe("aggregate", () => {
  it("sums BOMs per material across items and quantities", () => {
    const a = computeBom(defaultConfiguration("the-pitch"));
    const b = computeBom(defaultConfiguration("panna-pitch"));
    const summary = aggregateBoms([
      { bom: a, quantity: 2 },
      { bom: b, quantity: 1 },
    ]);
    const nets = summary.requirements.find((r) => r.materialId === "goal-net-standard");
    expect(nets?.qty).toBe(6);
    expect(summary.steelKg).toBeCloseTo(a.steelKg * 2 + b.steelKg, 0);
    expect(summary.labourHours).toBeCloseTo(a.labourHours * 2 + b.labourHours);
    expect(summary.requirements[0]?.category).toBe("steel");
  });
});
