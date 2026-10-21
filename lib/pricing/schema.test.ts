import { describe, expect, it } from "vitest";
import { productOrder, products } from "@/config/products";
import { configurationSchema, defaultConfiguration, type Configuration } from "./schema";

const valid = (c: Configuration) => configurationSchema.safeParse(c).success;

describe("configuration schema", () => {
  it.each(productOrder)("%s default configuration is valid", (slug) => {
    expect(valid(defaultConfiguration(slug))).toBe(true);
  });

  it("accepts min and max sizes, rejects one step beyond", () => {
    const p = products["the-pitch"];
    if (p.shape !== "rectangle") throw new Error("expected rectangle");
    const { lengthBoards: l, widthBoardsPerSide: w } = p.layout;
    const sized = (lengthBoards: number, widthBoardsPerSide: number): Configuration => ({
      ...defaultConfiguration("the-pitch"),
      size: { shape: "rectangle", lengthBoards, widthBoardsPerSide },
    });
    expect(valid(sized(l.min, w.min))).toBe(true);
    expect(valid(sized(l.max, w.max))).toBe(true);
    expect(valid(sized(l.min - 1, w.min))).toBe(false);
    expect(valid(sized(l.max + 1, w.max))).toBe(false);
    expect(valid(sized(l.min, w.max + 1))).toBe(false);
  });

  it("rejects a size of the wrong shape and unknown octagon sizes", () => {
    expect(valid({ ...defaultConfiguration("panna-pitch"), size: { shape: "rectangle", lengthBoards: 6, widthBoardsPerSide: 1 } })).toBe(false);
    expect(valid({ ...defaultConfiguration("panna-pitch"), size: { shape: "octagon", sizeId: "xxl" } })).toBe(false);
  });

  it("rejects heights the product doesn't offer, and bars on non-cage products", () => {
    expect(valid({ ...defaultConfiguration("the-pitch"), boardHeight: 2 })).toBe(false);
    expect(valid({ ...defaultConfiguration("the-pitch"), barHeight: 1.5 })).toBe(false);
    expect(valid({ ...defaultConfiguration("the-cage"), barHeight: null })).toBe(false);
    expect(valid({ ...defaultConfiguration("the-cage"), barHeight: 2.0 })).toBe(true);
  });

  it("rejects fencing on cages and invalid option combinations", () => {
    expect(valid({ ...defaultConfiguration("the-cage"), fencingHeight: 3 })).toBe(false);
    expect(valid({ ...defaultConfiguration("the-pitch"), fencingHeight: 3 })).toBe(true);
    expect(valid({ ...defaultConfiguration("the-pitch"), fencingHeight: 2.5 })).toBe(false);
    expect(valid({ ...defaultConfiguration("the-pitch"), finish: { type: "powder", ral: null } })).toBe(false);
    const c = defaultConfiguration("the-pitch");
    expect(valid({ ...c, branding: { ...c.branding, coverage: "logos", boards: 0 } })).toBe(false);
    expect(valid({ ...c, quantity: 0 })).toBe(false);
  });
});
