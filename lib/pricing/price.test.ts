import { describe, expect, it } from "vitest";
import { pricing, type PricingSettings } from "@/config/pricing";
import { productOrder, products } from "@/config/products";
import { computeBom } from "./bom";
import { computeCost } from "./cost";
import { computeGeometry } from "./geometry";
import { priceItem, roundPrice } from "./price";
import { defaultConfiguration, type Configuration } from "./schema";

const price = (c: Configuration) => priceItem(c).unitPrice;
const sized = (slug: "the-pitch" | "the-cage" | "kids-pitch", lengthBoards: number, widthBoardsPerSide: number): Configuration => ({
  ...defaultConfiguration(slug),
  size: { shape: "rectangle", lengthBoards, widthBoardsPerSide },
});

describe("calibration mode", () => {
  it.each(productOrder)("%s standard configuration reproduces the catalog price", (slug) => {
    const p = priceItem(defaultConfiguration(slug));
    expect(p.unitPrice).toBe(products[slug].catalogPrice);
    expect(p.lines).toEqual([{ key: "base", amount: products[slug].catalogPrice }]);
    expect(p.mode).toBe("calibration");
  });

  it("bigger pitches cost more, smaller cost less", () => {
    const std = price(defaultConfiguration("the-pitch"));
    expect(price(sized("the-pitch", 7, 1))).toBeGreaterThan(std);
    expect(price(sized("the-pitch", 6, 2))).toBeGreaterThan(std);
    expect(price(sized("the-pitch", 5, 1))).toBeLessThan(std);
  });

  it("price grows monotonically across the whole size range", () => {
    const p = products["kids-pitch"];
    if (p.shape !== "rectangle") throw new Error("expected rectangle");
    let last = 0;
    for (let n = p.layout.lengthBoards.min; n <= p.layout.lengthBoards.max; n++) {
      const v = price(sized("kids-pitch", n, p.layout.widthBoardsPerSide.default));
      expect(v).toBeGreaterThan(last);
      last = v;
    }
  });

  it("taller boards and taller bars cost more, lower boards less", () => {
    const pitch = defaultConfiguration("the-pitch");
    expect(price({ ...pitch, boardHeight: 1.2 })).toBeGreaterThan(price(pitch));
    expect(price({ ...pitch, boardHeight: 0.8 })).toBeLessThan(price(pitch));
    const cage = defaultConfiguration("the-cage");
    expect(price({ ...cage, barHeight: 2.0 })).toBeGreaterThan(price(cage));
    expect(price({ ...cage, barHeight: 1.0 })).toBeLessThan(price(cage));
  });

  it("Panna sizes are priced in increasing order", () => {
    const at = (sizeId: string) => price({ ...defaultConfiguration("panna-pitch"), size: { shape: "octagon", sizeId } });
    expect(at("m")).toBeGreaterThan(at("s"));
    expect(at("l")).toBeGreaterThan(at("s"));
  });

  it("splits size and height changes into separate line items that add up", () => {
    const c = { ...sized("the-pitch", 8, 2), boardHeight: 1.2 };
    const p = priceItem(c);
    const keys = p.lines.map((l) => l.key);
    expect(keys).toEqual(["base", "size", "height"]);
    expect(p.lines.reduce((s, l) => s + l.amount, 0)).toBe(p.unitPrice);
  });

  it("all customer amounts are rounded to 10 EUR", () => {
    const c: Configuration = {
      ...sized("kids-pitch", 11, 3),
      boardHeight: 0.6,
      fencingHeight: 2,
      goal: "pro",
      branding: { coverage: "logos", boards: 3, sides: 2, logoUploadId: null },
      finish: { type: "powder", ral: "RAL 5015" },
      surface: "turf",
      extras: { transportCart: true, storageBags: true, installation: true },
      quantity: 3,
    };
    const p = priceItem(c);
    for (const l of p.lines) expect(l.amount % 10).toBe(0);
    expect(p.total).toBe(p.unitPrice * 3);
  });

  it("options are priced from config/pricing.ts", () => {
    const base = defaultConfiguration("the-pitch");
    const g = computeGeometry(base);
    const turf = priceItem({ ...base, surface: "turf" });
    expect(turf.lines.find((l) => l.key === "surface")?.amount).toBe(roundPrice(g.area * pricing.options.turf.perM2));
    const pro = priceItem({ ...base, goal: "pro" });
    expect(pro.lines.find((l) => l.key === "goal")?.amount).toBe(2 * pricing.options.goalPro.perGoal);
    const branded = priceItem({ ...base, branding: { coverage: "logos", boards: 2, sides: 1, logoUploadId: null } });
    expect(branded.lines.find((l) => l.key === "branding")?.amount).toBe(
      roundPrice(pricing.options.branding.setupFee + 2 * 2.0 * 1.0 * pricing.options.branding.perM2),
    );
    const installed = priceItem({ ...base, extras: { ...base.extras, installation: true } });
    expect(installed.lines.find((l) => l.key === "installation")?.qty).toBe(1);
    // Options don't change the pitch structure price.
    expect(turf.lines.find((l) => l.key === "base")?.amount).toBe(6000);
    expect(turf.lines.some((l) => l.key === "size" || l.key === "height")).toBe(false);
  });
});

describe("full cost mode", () => {
  const costMode: PricingSettings = { ...pricing, mode: "cost" };

  it("prices the standard configuration as cost × (1 + margin)", () => {
    const c = defaultConfiguration("the-pitch");
    const cost = computeCost(computeBom(c, costMode), "structure", costMode);
    expect(cost.total).toBeCloseTo(cost.materials + cost.finishing + cost.labour + cost.overhead);
    const p = priceItem(c, costMode);
    expect(p.mode).toBe("cost");
    expect(p.unitPrice).toBe(roundPrice(cost.total * (1 + costMode.cost.margin)));
  });

  it("raises prices when labour gets more expensive", () => {
    const pricier: PricingSettings = { ...costMode, cost: { ...costMode.cost, labourRatePerHour: 60 } };
    const c = defaultConfiguration("the-cage");
    expect(priceItem(c, pricier).unitPrice).toBeGreaterThan(priceItem(c, costMode).unitPrice);
  });
});
