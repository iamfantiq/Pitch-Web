/**
 * Product catalog — geometry and allowed options for every pitch type.
 *
 * Edit this file to change sizes, board widths, heights or catalog prices.
 * Logic lives in lib/pricing/; nothing here needs code changes elsewhere.
 *
 * Geometry conventions (all lengths in metres):
 *  - Rectangle: each long side = `lengthBoards` × boardWidth + 2 × cornerLeg.
 *    Each short side = 2 × cornerLeg + 2 × widthBoardsPerSide × boardWidth + goalSlotWidth.
 *    Corners are 45° angled boards cut to fit; each takes `cornerLeg` from both sides
 *    it joins, so its length is cornerLeg × √2.
 *    The goal slot (goal + narrow surround boards) sits in the middle of each short side.
 *    Customers resize in whole-board steps, so corner boards stay identical for every size.
 *  - Octagon: 4 straight sides and 4 diagonal sides, each a whole number of boards.
 *    Goals sit in the middle of two opposite straight sides (straightBoards must be odd).
 */

export type ProductSlug = "the-cage" | "the-pitch" | "kids-pitch" | "panna-cage" | "panna-pitch";

export interface Choice<T> {
  default: T;
  options: readonly T[];
}

export interface Range {
  default: number;
  min: number;
  max: number;
}

interface ProductBase {
  slug: ProductSlug;
  name: string;
  /** EUR excl. VAT for the standard configuration (all defaults, no options). */
  catalogPrice: number;
  boardWidth: number;
  /** Plywood board height. */
  boardHeight: Choice<number>;
  /** Cage variants: steel bars above the boards. */
  cage?: { barHeight: Choice<number>; barSpacing: number };
  goal: { width: number; height: number; depth: number };
  /** Which optional extras make sense for this product. */
  allows: { fencing: boolean; turf: boolean };
  /**
   * Product photo in /public, e.g. "/products/the-cage.jpg".
   * Until set, the site shows a drawing generated from the geometry.
   */
  photo?: string;
}

export interface RectangleProduct extends ProductBase {
  shape: "rectangle";
  layout: {
    cornerLeg: number;
    goalSlotWidth: number;
    lengthBoards: Range;
    widthBoardsPerSide: Range;
  };
}

export interface OctagonSize {
  id: string;
  straightBoards: number;
  diagonalBoards: number;
}

export interface OctagonProduct extends ProductBase {
  shape: "octagon";
  layout: {
    goalSlotWidth: number;
    sizes: readonly OctagonSize[];
    defaultSize: string;
  };
}

export type Product = RectangleProduct | OctagonProduct;

// TODO(owner): confirm the real board layout of each standard product.
// Assumed 15 × 10 m with 2.0 m boards: long side 6 boards + 2 × 1.5 m corner legs = 15 m;
// short side 1.5 + 2.0 + 3.0 (goal slot) + 2.0 + 1.5 = 10 m.
const largeRectangleLayout: RectangleProduct["layout"] = {
  cornerLeg: 1.5,
  goalSlotWidth: 3.0,
  lengthBoards: { default: 6, min: 3, max: 12 },
  widthBoardsPerSide: { default: 1, min: 1, max: 4 },
};

// TODO(owner): Panna sizes are a proposal — ~6 × 6 m, ~9.6 × 9.6 m and ~11 × 11 m.
const pannaSizes: readonly OctagonSize[] = [
  { id: "s", straightBoards: 1, diagonalBoards: 1 },
  { id: "m", straightBoards: 1, diagonalBoards: 2 },
  { id: "l", straightBoards: 3, diagonalBoards: 1 },
];

export const products: Record<ProductSlug, Product> = {
  "the-cage": {
    slug: "the-cage",
    name: "The Cage",
    shape: "rectangle",
    catalogPrice: 25000,
    boardWidth: 2.0,
    boardHeight: { default: 1.0, options: [1.0] },
    cage: { barHeight: { default: 1.5, options: [1.0, 1.5, 2.0] }, barSpacing: 0.12 },
    goal: { width: 2.0, height: 1.0, depth: 0.8 },
    allows: { fencing: false, turf: true },
    layout: largeRectangleLayout,
  },
  "the-pitch": {
    slug: "the-pitch",
    name: "The Pitch",
    shape: "rectangle",
    catalogPrice: 6000,
    boardWidth: 2.0,
    boardHeight: { default: 1.0, options: [0.8, 1.0, 1.2] },
    goal: { width: 2.0, height: 1.0, depth: 0.8 },
    allows: { fencing: true, turf: true },
    layout: largeRectangleLayout,
  },
  "kids-pitch": {
    slug: "kids-pitch",
    name: "Kids Pitch",
    shape: "rectangle",
    catalogPrice: 4000,
    boardWidth: 1.5,
    boardHeight: { default: 0.5, options: [0.5, 0.6] },
    goal: { width: 1.2, height: 0.7, depth: 0.6 },
    allows: { fencing: true, turf: true },
    // TODO(owner): confirm. Assumed long side 9 × 1.5 m + 2 × 0.75 m = 15 m;
    // short side 0.75 + 2 × 1.5 + 2.5 (goal slot) + 2 × 1.5 + 0.75 = 10 m.
    layout: {
      cornerLeg: 0.75,
      goalSlotWidth: 2.5,
      lengthBoards: { default: 9, min: 4, max: 16 },
      widthBoardsPerSide: { default: 2, min: 1, max: 5 },
    },
  },
  "panna-cage": {
    slug: "panna-cage",
    name: "Panna Cage",
    shape: "octagon",
    catalogPrice: 5200,
    boardWidth: 2.5,
    boardHeight: { default: 0.6, options: [0.6] },
    cage: { barHeight: { default: 1.2, options: [1.2, 1.6] }, barSpacing: 0.12 },
    goal: { width: 1.2, height: 0.5, depth: 0.4 },
    allows: { fencing: false, turf: true },
    layout: { goalSlotWidth: 2.5, sizes: pannaSizes, defaultSize: "s" },
  },
  "panna-pitch": {
    slug: "panna-pitch",
    name: "Panna Pitch",
    shape: "octagon",
    catalogPrice: 2500,
    boardWidth: 2.5,
    boardHeight: { default: 0.6, options: [0.4, 0.6, 0.8] },
    goal: { width: 1.2, height: 0.5, depth: 0.4 },
    allows: { fencing: true, turf: true },
    layout: { goalSlotWidth: 2.5, sizes: pannaSizes, defaultSize: "s" },
  },
};

/** Display order on the site. */
export const productOrder: readonly ProductSlug[] = [
  "the-cage",
  "the-pitch",
  "kids-pitch",
  "panna-cage",
  "panna-pitch",
];

export function getProduct(slug: string): Product | undefined {
  return (products as Record<string, Product | undefined>)[slug];
}
