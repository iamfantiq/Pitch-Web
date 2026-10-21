import { materials, type MaterialId, type PlywoodMaterial, type Unit } from "@/config/materials";
import { pricing, type PricingSettings } from "@/config/pricing";
import { getProduct, type Product } from "@/config/products";
import { computeGeometry, type Geometry } from "./geometry";
import type { Configuration } from "./schema";

/**
 * "structure" = the pitch itself (scaled against the catalog price in calibration mode).
 * "option"    = extras priced by their own customer prices.
 */
export type BomScope = "structure" | "option";

export interface BomLine {
  materialId: MaterialId;
  qty: number;
  unit: Unit;
  scope: BomScope;
  /** Where it is used, e.g. "Board frames". */
  use: string;
}

export interface PlywoodPiece {
  use: string;
  width: number;
  height: number;
  count: number;
}

export interface Bom {
  /** For one unit of the configured item (multiply by quantity for the order). */
  lines: BomLine[];
  plywoodPieces: PlywoodPiece[];
  labourHours: number;
  /** Plywood area actually used (m²), before cutting losses. */
  plywoodNetM2: number;
  /** Total steel weight (kg), all profiles. */
  steelKg: number;
}

const PLYWOOD: MaterialId = "plywood-18-2500x1250";
const round = (v: number, step = 0.01) => Math.round(v / step) / Math.round(1 / step);

/** How many pieces of w × h fit on one sheet (best of two orientations, simple grid cut). */
export function piecesPerSheet(w: number, h: number, sheet: PlywoodMaterial["sheet"]): number {
  const eps = 1e-9;
  const fit = (a: number, b: number) => Math.floor((sheet.length + eps) / a) * Math.floor((sheet.width + eps) / b);
  return Math.max(fit(w, h), fit(h, w));
}

/** Sheets needed for a cutting list. Pieces bigger than a sheet are joined: area × (1 + waste). */
export function sheetsFor(pieces: PlywoodPiece[], sheet: PlywoodMaterial["sheet"], waste: number): number {
  let sheets = 0;
  let oversizeArea = 0;
  for (const p of pieces) {
    const pps = piecesPerSheet(p.width, p.height, sheet);
    if (pps >= 1) sheets += Math.ceil(p.count / pps);
    else oversizeArea += p.width * p.height * p.count;
  }
  return sheets + Math.ceil((oversizeArea * (1 + waste)) / (sheet.length * sheet.width));
}

class BomBuilder {
  lines: BomLine[] = [];

  add(materialId: MaterialId, qty: number, scope: BomScope, use: string) {
    if (qty <= 0) return;
    this.lines.push({ materialId, qty: round(qty), unit: materials[materialId].unit, scope, use });
  }

  steelKg(scope?: BomScope) {
    return this.lines.reduce((sum, l) => {
      const m = materials[l.materialId];
      return m.category === "steel" && (!scope || l.scope === scope) ? sum + l.qty * m.kgPerM : sum;
    }, 0);
  }
}

/** Frame + plywood for one kind of panel (board, corner board, goal surround, lintel). */
function addPanels(
  b: BomBuilder,
  pieces: PlywoodPiece[],
  settings: PricingSettings,
  use: string,
  width: number,
  height: number,
  count: number,
) {
  if (count <= 0 || width <= 0 || height <= 0) return;
  const c = settings.construction;
  pieces.push({ use, width, height, count });
  b.add("steel-sq-40x40x2", count * (2 * width + 2 * height), "structure", `${use} — frame`);
  const studs = Math.max(0, Math.ceil(width / c.studSpacing) - 1);
  b.add("steel-sq-30x30x2", count * studs * height, "structure", `${use} — studs`);
}

export function computeBom(config: Configuration, settings: PricingSettings = pricing): Bom {
  const product = getProduct(config.product);
  if (!product) throw new Error(`Unknown product ${config.product}`);
  const g = computeGeometry(config);
  const c = settings.construction;
  const b = new BomBuilder();
  const pieces: PlywoodPiece[] = [];
  const h = g.boardHeight;

  // Boarding
  addPanels(b, pieces, settings, "Boards", g.boardWidth, h, g.counts.boards);
  addPanels(b, pieces, settings, "Corner boards", g.cornerBoardLength, h, g.counts.cornerBoards);
  addPanels(b, pieces, settings, "Goal surround boards", g.goalSurroundWidth, h, g.counts.goalSurroundBoards);
  const lintelHeight = h - product.goal.height;
  const lintels = lintelHeight > 0.05 ? g.counts.goals : 0;
  addPanels(b, pieces, settings, "Boards above goals", product.goal.width, lintelHeight, lintels);

  // Supports: a back brace + foot plate per standing panel (lintels hang on the goal frame).
  const standing = g.counts.boards + g.counts.cornerBoards + g.counts.goalSurroundBoards;
  b.add("steel-sq-30x30x2", standing * h * c.braceLengthFactor, "structure", "Back braces");
  b.add("foot-plate", standing * c.footPlatesPerBoard, "structure", "Support feet");

  // Joints
  const angled = g.counts.angledJoints;
  const straight = g.counts.joints - angled;
  b.add("connector-straight", straight, "structure", "Straight joints");
  b.add("connector-angled", angled, "structure", "Angled joints");
  b.add("bolt-m10-set", g.counts.joints * c.boltsPerJoint, "structure", "Joint bolts");

  // Goals: front posts + crossbar, ground frame and top stays to the back.
  const goal = product.goal;
  b.add("steel-sq-50x50x3", g.counts.goals * (2 * goal.height + 2 * goal.width + 4 * goal.depth), "structure", "Goal frames");
  b.add("goal-net-standard", g.counts.goals, "structure", "Goal nets");

  // Cage: bars + rails above the boards, posts at every joint.
  let barMetres = 0;
  const cage = product.cage;
  if (cage && g.barHeight > 0) {
    const bars = g.segments.reduce((n, s) => n + Math.max(1, Math.floor(s.length / cage.barSpacing)), 0);
    barMetres = g.perimeter;
    b.add("steel-sq-20x20x1.5", bars * g.barHeight, "structure", "Cage bars");
    b.add("steel-rect-40x20x2", 2 * g.perimeter, "structure", "Cage rails");
    b.add("steel-sq-60x60x3", g.counts.joints * (h + g.barHeight), "structure", "Cage posts");
  }

  addOptions(b, product, g, config, settings, pieces);

  // Plywood: one line in sheets, from the cutting list.
  const sheet = (materials[PLYWOOD] as PlywoodMaterial).sheet;
  b.add(PLYWOOD, sheetsFor(pieces, sheet, c.plywoodWaste), "structure", "All panels");

  // Finishing: every steel part is galvanized; powder coat on top when chosen.
  b.add("galvanizing", b.steelKg("structure"), "structure", "Pitch steel");
  b.add("galvanizing", b.steelKg("option"), "option", "Option steel");
  if (config.finish.type === "powder") b.add("powder-coating", b.steelKg(), "option", `Frame colour ${config.finish.ral ?? ""}`.trim());

  const L = settings.cost.labourHours;
  const labourHours =
    g.counts.boards * L.perBoard +
    g.counts.cornerBoards * L.perCornerBoard +
    g.counts.goalSurroundBoards * L.perGoalSurroundBoard +
    lintels * L.perLintelBoard +
    g.counts.goals * L.perGoal +
    barMetres * L.perMetreOfBars;

  return {
    lines: b.lines,
    plywoodPieces: pieces,
    labourHours: round(labourHours),
    plywoodNetM2: round(pieces.reduce((s, p) => s + p.width * p.height * p.count, 0)),
    steelKg: round(b.steelKg(), 0.1),
  };
}

function addOptions(
  b: BomBuilder,
  product: Product,
  g: Geometry,
  config: Configuration,
  settings: PricingSettings,
  pieces: PlywoodPiece[],
) {
  const c = settings.construction;

  if (config.goal === "pro") {
    // Pro goal: extra back stays + knotless net instead of the standard one.
    b.add("steel-sq-50x50x3", g.counts.goals * 2 * product.goal.depth, "option", "Pro goal reinforcement");
    b.add("goal-net-pro", g.counts.goals, "option", "Pro goal nets");
  }

  if (config.fencingHeight > 0) {
    const fence = fencingSpan(product, g, settings);
    const posts = Math.ceil(fence / c.fencePostSpacing) + 1;
    b.add("fence-net", g.counts.goals * fence * Math.max(0, config.fencingHeight - g.boardHeight), "option", "Ball-stop net behind goals");
    b.add("steel-sq-60x60x3", g.counts.goals * posts * config.fencingHeight, "option", "Ball-stop posts");
    b.add("steel-rect-40x20x2", g.counts.goals * fence, "option", "Ball-stop top rail");
  }

  const printM2 = brandingArea(config, g, pieces);
  if (printM2 > 0) b.add("print-vinyl", printM2, "option", `Branding (${config.branding.sides} side${config.branding.sides > 1 ? "s" : ""})`);

  if (config.surface === "turf") b.add("turf-artificial", g.area, "option", "Playing surface");

  if (config.extras.transportCart) b.add("transport-cart", transportCarts(g, settings), "option", "Transport carts");
  if (config.extras.storageBags) b.add("storage-bag-set", 1, "option", "Storage bags");
}

/** Width of the ball-stop fence behind one goal (m). */
export function fencingSpan(product: Product, g: Geometry, settings: PricingSettings = pricing): number {
  const slot = product.layout.goalSlotWidth;
  return Math.min(g.width, slot + 2 * settings.construction.fenceSideExtension);
}

/** Printed area for branding (m²), from the panel cutting list. */
export function brandingArea(config: Configuration, g: Geometry, pieces: PlywoodPiece[]): number {
  const { coverage, boards, sides } = config.branding;
  if (coverage === "none") return 0;
  if (coverage === "logos") return Math.min(boards, g.counts.boards) * g.boardWidth * g.boardHeight * sides;
  return pieces.reduce((s, p) => s + p.width * p.height * p.count, 0) * sides;
}

export function transportCarts(g: Geometry, settings: PricingSettings = pricing): number {
  const panels = g.counts.boards + g.counts.cornerBoards + g.counts.goalSurroundBoards;
  return Math.ceil(panels / settings.construction.boardsPerCart);
}
