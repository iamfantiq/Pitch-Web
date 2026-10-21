import { getProduct, type OctagonProduct, type Product, type RectangleProduct } from "@/config/products";
import type { Configuration } from "./schema";

/** A straight piece of the boarding, in plan view. x runs along the length, z along the width. */
export interface Segment {
  kind: "board" | "corner" | "goalSurround" | "goal";
  start: readonly [number, number];
  end: readonly [number, number];
  length: number;
}

export interface Geometry {
  shape: Product["shape"];
  /** Outer dimensions (m). */
  length: number;
  width: number;
  perimeter: number;
  /** Playing surface (m²). */
  area: number;
  boardWidth: number;
  boardHeight: number;
  /** Bars above boards (cage variants), 0 otherwise. */
  barHeight: number;
  /** Closed loop around the pitch, counter-clockwise. */
  segments: Segment[];
  counts: {
    boards: number;
    cornerBoards: number;
    goalSurroundBoards: number;
    goals: number;
    /** Connections between neighbouring segments (= segments in a closed loop). */
    joints: number;
    /** Joints where the boarding changes direction. */
    angledJoints: number;
  };
  cornerBoardLength: number;
  goalSurroundWidth: number;
}

const EPS = 1e-6;
const SQRT2 = Math.SQRT2;

class Walker {
  readonly segments: Segment[] = [];
  constructor(private x: number, private z: number) {}

  /** Walk `length` metres in direction (dx, dz) (unit vector). */
  push(kind: Segment["kind"], length: number, dx: number, dz: number) {
    if (length < EPS) return;
    const start = [this.x, this.z] as const;
    this.x += dx * length;
    this.z += dz * length;
    this.segments.push({ kind, start, end: [this.x, this.z], length });
  }

  boards(count: number, width: number, dx: number, dz: number) {
    for (let i = 0; i < count; i++) this.push("board", width, dx, dz);
  }

  goalSlot(slot: number, goalWidth: number, dx: number, dz: number) {
    const surround = (slot - goalWidth) / 2;
    this.push("goalSurround", surround, dx, dz);
    this.push("goal", goalWidth, dx, dz);
    this.push("goalSurround", surround, dx, dz);
  }
}

export function rectangleDimensions(product: RectangleProduct, lengthBoards: number, widthBoardsPerSide: number) {
  const { cornerLeg, goalSlotWidth } = product.layout;
  const w = product.boardWidth;
  return {
    length: lengthBoards * w + 2 * cornerLeg,
    width: 2 * cornerLeg + 2 * widthBoardsPerSide * w + goalSlotWidth,
  };
}

export function octagonDimensions(product: OctagonProduct, sizeId: string) {
  const size = product.layout.sizes.find((s) => s.id === sizeId);
  if (!size) throw new Error(`Unknown octagon size ${sizeId}`);
  const straight = size.straightBoards * product.boardWidth;
  const leg = (size.diagonalBoards * product.boardWidth) / SQRT2;
  const across = straight + 2 * leg;
  return { length: across, width: across, straight, leg, size };
}

function rectangleSegments(product: RectangleProduct, lengthBoards: number, widthBoardsPerSide: number) {
  const { cornerLeg: c, goalSlotWidth } = product.layout;
  const w = product.boardWidth;
  const { length: L, width: W } = rectangleDimensions(product, lengthBoards, widthBoardsPerSide);
  const d = 1 / SQRT2;
  const walk = new Walker(-L / 2 + c, -W / 2);

  // Bottom long side → right, corner, right short side ↑ (goal), corner, top ← , corner, left ↓ (goal), corner.
  walk.boards(lengthBoards, w, 1, 0);
  walk.push("corner", c * SQRT2, d, d);
  walk.boards(widthBoardsPerSide, w, 0, 1);
  walk.goalSlot(goalSlotWidth, product.goal.width, 0, 1);
  walk.boards(widthBoardsPerSide, w, 0, 1);
  walk.push("corner", c * SQRT2, -d, d);
  walk.boards(lengthBoards, w, -1, 0);
  walk.push("corner", c * SQRT2, -d, -d);
  walk.boards(widthBoardsPerSide, w, 0, -1);
  walk.goalSlot(goalSlotWidth, product.goal.width, 0, -1);
  walk.boards(widthBoardsPerSide, w, 0, -1);
  walk.push("corner", c * SQRT2, d, -d);

  return { segments: walk.segments, L, W, area: L * W - 2 * c * c, angledJoints: c > EPS ? 8 : 4 };
}

function octagonSegments(product: OctagonProduct, sizeId: string) {
  const { straight, leg, length, size } = octagonDimensions(product, sizeId);
  const w = product.boardWidth;
  const d = 1 / SQRT2;
  const goalSideBoards = (size.straightBoards * w - product.layout.goalSlotWidth) / 2 / w;
  const walk = new Walker(-straight / 2, -length / 2);

  const goalSide = (dx: number, dz: number) => {
    walk.boards(goalSideBoards, w, dx, dz);
    walk.goalSlot(product.layout.goalSlotWidth, product.goal.width, dx, dz);
    walk.boards(goalSideBoards, w, dx, dz);
  };

  // Bottom → diagonal → right (goal) → diagonal → top → diagonal → left (goal) → diagonal.
  walk.boards(size.straightBoards, w, 1, 0);
  walk.boards(size.diagonalBoards, w, d, d);
  goalSide(0, 1);
  walk.boards(size.diagonalBoards, w, -d, d);
  walk.boards(size.straightBoards, w, -1, 0);
  walk.boards(size.diagonalBoards, w, -d, -d);
  goalSide(0, -1);
  walk.boards(size.diagonalBoards, w, d, -d);

  return { segments: walk.segments, L: length, W: length, area: length * length - 2 * leg * leg, angledJoints: 8 };
}

export function computeGeometry(config: Configuration): Geometry {
  const product = getProduct(config.product);
  if (!product) throw new Error(`Unknown product ${config.product}`);

  const built =
    product.shape === "rectangle"
      ? config.size.shape === "rectangle"
        ? rectangleSegments(product, config.size.lengthBoards, config.size.widthBoardsPerSide)
        : null
      : config.size.shape === "octagon"
        ? octagonSegments(product, config.size.sizeId)
        : null;
  if (!built) throw new Error("Size does not match product shape");

  const { segments } = built;
  const count = (kind: Segment["kind"]) => segments.filter((s) => s.kind === kind).length;
  const corner = segments.find((s) => s.kind === "corner");
  const surround = segments.find((s) => s.kind === "goalSurround");

  return {
    shape: product.shape,
    length: built.L,
    width: built.W,
    perimeter: segments.reduce((sum, s) => sum + s.length, 0),
    area: built.area,
    boardWidth: product.boardWidth,
    boardHeight: config.boardHeight,
    barHeight: config.barHeight ?? 0,
    segments,
    counts: {
      boards: count("board"),
      cornerBoards: count("corner"),
      goalSurroundBoards: count("goalSurround"),
      goals: count("goal"),
      joints: segments.length,
      angledJoints: built.angledJoints,
    },
    cornerBoardLength: corner?.length ?? 0,
    goalSurroundWidth: surround?.length ?? 0,
  };
}
