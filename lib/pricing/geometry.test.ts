import { describe, expect, it } from "vitest";
import { productOrder, products } from "@/config/products";
import { computeGeometry } from "./geometry";
import { defaultConfiguration, type Configuration } from "./schema";

const rect = (slug: "the-pitch" | "the-cage" | "kids-pitch", lengthBoards: number, widthBoardsPerSide: number): Configuration => ({
  ...defaultConfiguration(slug),
  size: { shape: "rectangle", lengthBoards, widthBoardsPerSide },
});

describe("geometry", () => {
  it.each(["the-cage", "the-pitch", "kids-pitch"] as const)("%s standard size is 15 × 10 m", (slug) => {
    const g = computeGeometry(defaultConfiguration(slug));
    expect(g.length).toBeCloseTo(15);
    expect(g.width).toBeCloseTo(10);
  });

  it.each(productOrder)("%s boarding is a closed loop whose segments sum to the perimeter", (slug) => {
    const g = computeGeometry(defaultConfiguration(slug));
    const first = g.segments[0]!;
    const last = g.segments.at(-1)!;
    expect(last.end[0]).toBeCloseTo(first.start[0]);
    expect(last.end[1]).toBeCloseTo(first.start[1]);
    for (const s of g.segments) {
      expect(Math.hypot(s.end[0] - s.start[0], s.end[1] - s.start[1])).toBeCloseTo(s.length);
    }
    expect(g.counts.joints).toBe(g.segments.length);
  });

  it("The Pitch: 6 + 6 long boards, 1 + 1 per short side, 45° corners, goal slot with 0.5 m surrounds", () => {
    const g = computeGeometry(defaultConfiguration("the-pitch"));
    expect(g.counts.boards).toBe(16);
    expect(g.counts.cornerBoards).toBe(4);
    expect(g.cornerBoardLength).toBeCloseTo(1.5 * Math.SQRT2);
    expect(g.counts.goals).toBe(2);
    expect(g.counts.goalSurroundBoards).toBe(4);
    expect(g.goalSurroundWidth).toBeCloseTo(0.5);
    expect(g.counts.angledJoints).toBe(8);
    expect(g.area).toBeCloseTo(15 * 10 - 2 * 1.5 * 1.5);
  });

  it("Kids Pitch: 1.5 m boards, 1.2 m goal in a 2.5 m slot leaves 0.65 m surrounds", () => {
    const g = computeGeometry(defaultConfiguration("kids-pitch"));
    expect(g.boardWidth).toBe(1.5);
    expect(g.counts.boards).toBe(2 * 9 + 4 * 2);
    expect(g.goalSurroundWidth).toBeCloseTo(0.65);
  });

  it("resizing in whole-board steps keeps corner boards identical", () => {
    const small = computeGeometry(rect("the-pitch", 3, 1));
    const large = computeGeometry(rect("the-pitch", 12, 4));
    expect(small.cornerBoardLength).toBeCloseTo(large.cornerBoardLength);
    expect(large.length - small.length).toBeCloseTo(9 * 2);
    expect(large.width - small.width).toBeCloseTo(2 * 3 * 2);
  });

  it("Panna 6 × 6 is an octagon with one 2.5 m board per side and goals on two straight sides", () => {
    const g = computeGeometry(defaultConfiguration("panna-pitch"));
    expect(g.shape).toBe("octagon");
    expect(g.length).toBeCloseTo(2.5 * (1 + Math.SQRT2));
    expect(g.width).toBeCloseTo(g.length);
    // 2 straight sides without goals + 4 diagonals; goal sides are fully taken by the goal slot.
    expect(g.counts.boards).toBe(6);
    expect(g.counts.goals).toBe(2);
    expect(g.goalSurroundWidth).toBeCloseTo(0.65);
    expect(g.counts.angledJoints).toBe(8);
    expect(g.counts.cornerBoards).toBe(0);
    // Regular octagon area = 2(1+√2)a²
    expect(g.area).toBeCloseTo(2 * (1 + Math.SQRT2) * 2.5 * 2.5);
  });

  it("every octagon size can centre its goal on whole boards", () => {
    for (const slug of ["panna-cage", "panna-pitch"] as const) {
      const p = products[slug];
      if (p.shape !== "octagon") throw new Error("expected octagon");
      for (const size of p.layout.sizes) {
        const remainder = (size.straightBoards * p.boardWidth - p.layout.goalSlotWidth) / 2 / p.boardWidth;
        expect(Number.isInteger(Math.round(remainder * 1e6) / 1e6)).toBe(true);
        expect(remainder).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every rectangle goal slot fits its goal", () => {
    for (const slug of productOrder) {
      const p = products[slug];
      expect(p.layout.goalSlotWidth).toBeGreaterThanOrEqual(p.goal.width);
    }
  });
});
