import type { ReactNode } from "react";
import { optionCatalog } from "@/config/options";
import { getProduct } from "@/config/products";
import { computeGeometry, type Segment } from "@/lib/pricing/geometry";
import type { Configuration } from "@/lib/pricing/schema";

/**
 * Lightweight isometric drawing of a configuration, generated from the same geometry as the BOM.
 * Used as product imagery until real photos exist, and as the fallback when 3D is unavailable.
 */

const YAW = (-28 * Math.PI) / 180;
const PITCH = (32 * Math.PI) / 180;

function project(x: number, y: number, z: number): [number, number, number] {
  const xr = x * Math.cos(YAW) - z * Math.sin(YAW);
  const zr = x * Math.sin(YAW) + z * Math.cos(YAW);
  return [xr, zr * Math.sin(PITCH) - y * Math.cos(PITCH), zr];
}

const pts = (list: [number, number, number][]) => list.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ");

interface Props {
  config: Configuration;
  className?: string;
  title?: string;
}

export function PitchIllustration({ config, className, title }: Props) {
  const g = computeGeometry(config);
  const h = g.boardHeight;
  const bars = g.barHeight;
  const frameColour =
    config.finish.type === "powder" && config.finish.ral ? optionCatalog.ralColours[config.finish.ral] ?? "#3a3a3c" : "#8e9196";
  const branded = config.branding.coverage !== "none";

  const ground: [number, number, number][] = [];
  for (const s of g.segments) ground.push(project(s.start[0], 0, s.start[1]));

  const sorted = [...g.segments].sort((a, b) => depth(a) - depth(b));
  const all = g.segments.flatMap((s) => [project(s.start[0], h + bars, s.start[1]), project(s.start[0], 0, s.start[1])]);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const pad = Math.max(g.length, g.width) * 0.08;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const vbW = Math.max(...xs) - minX + pad;
  const vbH = Math.max(...ys) - minY + pad;
  const stroke = Math.max(g.length, g.width) / 400;

  return (
    <svg
      viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
      className={className}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
    >
      {title ? <title>{title}</title> : null}
      <polygon points={pts(ground)} fill={config.surface === "turf" ? "#2f9a4e" : "#6fb87b"} />
      {sorted.map((s, i) => (
        <SegmentShape key={i} s={s} h={h} bars={bars} barSpacing={0.24} frame={frameColour} branded={branded} stroke={stroke} config={config} />
      ))}
    </svg>
  );
}

function depth(s: Segment) {
  const mx = (s.start[0] + s.end[0]) / 2;
  const mz = (s.start[1] + s.end[1]) / 2;
  return project(mx, 0, mz)[2];
}

function SegmentShape({
  s,
  h,
  bars,
  barSpacing,
  frame,
  branded,
  stroke,
  config,
}: {
  s: Segment;
  h: number;
  bars: number;
  barSpacing: number;
  frame: string;
  branded: boolean;
  stroke: number;
  config: Configuration;
}) {
  const [x0, z0] = s.start;
  const [x1, z1] = s.end;
  const quad = (y0: number, y1: number) =>
    pts([project(x0, y0, z0), project(x1, y0, z1), project(x1, y1, z1), project(x0, y1, z0)]);

  const barLines: ReactNode[] = [];
  if (bars > 0) {
    const n = Math.max(1, Math.round(s.length / barSpacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const [ax, ay] = project(x, h, z);
      const [bx, by] = project(x, h + bars, z);
      barLines.push(<line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={frame} strokeWidth={stroke * 0.6} />);
    }
    const [ax, ay] = project(x0, h + bars, z0);
    const [bx, by] = project(x1, h + bars, z1);
    barLines.push(<line key="rail" x1={ax} y1={ay} x2={bx} y2={by} stroke={frame} strokeWidth={stroke * 1.6} />);
  }

  if (s.kind === "goal") {
    const goalH = getProduct(config.product)?.goal.height ?? h;
    return (
      <g>
        <polygon points={quad(0, goalH)} fill="rgba(255,255,255,0.35)" stroke="#ffffff" strokeWidth={stroke * 2} />
        {goalH < h ? <polygon points={quad(goalH, h)} fill={branded ? "#fafafa" : "#e4c9a0"} stroke={frame} strokeWidth={stroke} /> : null}
        {barLines}
      </g>
    );
  }

  return (
    <g>
      <polygon points={quad(0, h)} fill={branded ? "#fafafa" : "#e4c9a0"} stroke={frame} strokeWidth={stroke} />
      {barLines}
    </g>
  );
}
