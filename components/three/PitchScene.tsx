"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { optionCatalog } from "@/config/options";
import { getProduct, type Product } from "@/config/products";
import { fencingSpan } from "@/lib/pricing/bom";
import { computeGeometry, type Geometry, type Segment } from "@/lib/pricing/geometry";
import type { Configuration } from "@/lib/pricing/schema";

/**
 * Parametric 3D model, built from the same geometry as the BOM, so it always matches the quote.
 * Plan coordinates (x, z) map directly to three.js x / z; y is up.
 */

const PLYWOOD = "#d8b98c";
const PRINTED = "#f7f7f5";
const GALVANIZED = "#a7abb0";
const NET = "#ffffff";
const FRAME = 0.04;
const PANEL = 0.02;

interface Props {
  config: Configuration;
  label: string;
}

export default function PitchScene({ config, label }: Props) {
  const product = getProduct(config.product);
  const g = useMemo(() => computeGeometry(config), [config]);
  if (!product) return null;
  const frameColour = config.finish.type === "powder" && config.finish.ral ? optionCatalog.ralColours[config.finish.ral] ?? GALVANIZED : GALVANIZED;

  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 32, near: 0.1, far: 500 }}
      role="img"
      aria-label={label}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
    >
      <color attach="background" args={["#f5f5f7"]} />
      <fog attach="fog" args={["#f5f5f7", Math.max(g.length, g.width) * 1.6, Math.max(g.length, g.width) * 3.2]} />
      <hemisphereLight args={["#ffffff", "#d9dde2", 1.6]} />
      <directionalLight
        position={[g.length * 0.6, Math.max(g.length, g.width) * 1.2, g.width * 0.9]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-g.length}
        shadow-camera-right={g.length}
        shadow-camera-top={g.width * 1.5}
        shadow-camera-bottom={-g.width * 1.5}
        shadow-bias={-0.0005}
      />
      <CameraRig length={g.length} width={g.width} height={g.boardHeight + g.barHeight} />

      <Ground g={g} turf={config.surface === "turf"} />
      {g.segments.map((s, i) => (
        <SegmentModel key={i} s={s} g={g} product={product} frame={frameColour} printed={isPrinted(config, g, i)} />
      ))}
      {product.cage && g.barHeight > 0 ? <CageBars g={g} spacing={product.cage.barSpacing} frame={frameColour} /> : null}
      {config.fencingHeight > 0 ? <Fencing g={g} product={product} height={config.fencingHeight} frame={frameColour} /> : null}
      <ContactShadows position={[0, 0.001, 0]} scale={Math.max(g.length, g.width) * 1.6} opacity={0.35} blur={2.4} far={4} resolution={512} frames={1} />
    </Canvas>
  );
}

/** Which segments carry print: every panel for a full wrap, evenly spread boards for logos. */
function isPrinted(config: Configuration, g: Geometry, index: number): boolean {
  const { coverage, boards } = config.branding;
  const seg = g.segments[index];
  if (coverage === "none" || !seg || seg.kind === "goal") return false;
  if (coverage === "full") return true;
  if (seg.kind !== "board") return false;
  const boardIndices = g.segments.flatMap((s, i) => (s.kind === "board" ? [i] : []));
  const n = Math.min(boards, boardIndices.length);
  const chosen = new Set(Array.from({ length: n }, (_, k) => boardIndices[Math.floor((k * boardIndices.length) / n)]));
  return chosen.has(index);
}

/** Frames the whole pitch whenever its size changes; leaves the user's orbit alone otherwise. */
function CameraRig({ length, width, height }: { length: number; width: number; height: number }) {
  const { camera, invalidate } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const size = Math.max(length, width);

  useLayoutEffect(() => {
    const dist = size * 1.35 + height * 2;
    camera.position.set(dist * 0.55, dist * 0.62, dist * 0.78);
    camera.lookAt(0, height * 0.25, 0);
    controls.current?.target.set(0, height * 0.25, 0);
    controls.current?.update();
    invalidate();
  }, [camera, size, height, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={false}
      minDistance={size * 0.5}
      maxDistance={size * 3}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}

function Ground({ g, turf }: { g: Geometry; turf: boolean }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    g.segments.forEach((seg, i) => (i === 0 ? s.moveTo(seg.start[0], -seg.start[1]) : s.lineTo(seg.start[0], -seg.start[1])));
    s.closePath();
    return s;
  }, [g]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.002} receiveShadow>
        <circleGeometry args={[Math.max(g.length, g.width) * 2, 64]} />
        <meshStandardMaterial color="#eef0f2" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.004} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={turf ? "#2f9a4e" : "#7dbb87"} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Position + rotation that lays a box of length `s.length` along segment `s`. */
function placement(s: Segment) {
  const dx = s.end[0] - s.start[0];
  const dz = s.end[1] - s.start[1];
  return {
    mid: [(s.start[0] + s.end[0]) / 2, (s.start[1] + s.end[1]) / 2] as const,
    rotY: -Math.atan2(dz, dx),
    // Outward normal for a counter-clockwise loop.
    out: [dz / s.length, -dx / s.length] as const,
  };
}

function SegmentModel({ s, g, product, frame, printed }: { s: Segment; g: Geometry; product: Product; frame: string; printed: boolean }) {
  const { mid, rotY } = placement(s);
  const h = g.boardHeight;

  if (s.kind === "goal") {
    return <Goal s={s} g={g} product={product} frame={frame} />;
  }

  return (
    <group position={[mid[0], 0, mid[1]]} rotation-y={rotY}>
      <Panel length={s.length} y0={0} y1={h} frame={frame} printed={printed} />
    </group>
  );
}

/** Plywood panel in a steel frame, local x along the boarding. */
function Panel({ length, y0, y1, frame, printed }: { length: number; y0: number; y1: number; frame: string; printed: boolean }) {
  const h = y1 - y0;
  return (
    <group>
      <mesh position={[0, y0 + h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length - 0.01, h - FRAME, PANEL]} />
        <meshStandardMaterial color={printed ? PRINTED : PLYWOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, y1 - FRAME / 2, 0]} castShadow>
        <boxGeometry args={[length, FRAME, FRAME]} />
        <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (length - FRAME)) / 2, y0 + h / 2, 0]} castShadow>
          <boxGeometry args={[FRAME, h, FRAME]} />
          <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Goal({ s, g, product, frame }: { s: Segment; g: Geometry; product: Product; frame: string }) {
  const { mid, rotY } = placement(s);
  const { width: gw, height: gh, depth } = product.goal;
  const post = 0.06;
  const steel = <meshStandardMaterial color={frame} metalness={0.6} roughness={0.35} />;
  const net = <meshStandardMaterial color={NET} transparent opacity={0.35} side={THREE.DoubleSide} wireframe />;

  // Local frame: x along the boarding, +z points out of the pitch (the goal's depth).
  return (
    <group position={[mid[0], 0, mid[1]]} rotation-y={rotY}>
      <group scale={[1, 1, -1]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[(side * (gw - post)) / 2, gh / 2, 0]} castShadow>
            <boxGeometry args={[post, gh, post]} />
            {steel}
          </mesh>
        ))}
        <mesh position={[0, gh - post / 2, 0]} castShadow>
          <boxGeometry args={[gw, post, post]} />
          {steel}
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`g${side}`} position={[(side * (gw - post)) / 2, post / 2, depth / 2]}>
            <boxGeometry args={[post, post, depth]} />
            {steel}
          </mesh>
        ))}
        <mesh position={[0, post / 2, depth]}>
          <boxGeometry args={[gw, post, post]} />
          {steel}
        </mesh>
        {/* Net: back, top, sides */}
        <mesh position={[0, gh / 2, depth]}>
          <planeGeometry args={[gw, gh, Math.round(gw * 8), Math.round(gh * 8)]} />
          {net}
        </mesh>
        <mesh position={[0, gh, depth / 2]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[gw, depth, Math.round(gw * 8), Math.round(depth * 8)]} />
          {net}
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`n${side}`} position={[(side * gw) / 2, gh / 2, depth / 2]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[depth, gh, Math.round(depth * 8), Math.round(gh * 8)]} />
            {net}
          </mesh>
        ))}
      </group>
      {g.boardHeight - gh > 0.05 ? <Panel length={s.length} y0={gh} y1={g.boardHeight} frame={frame} printed={false} /> : null}
    </group>
  );
}

/** Vertical bars + top rail above the boards, as instanced meshes (hundreds of bars). */
function CageBars({ g, spacing, frame }: { g: Geometry; spacing: number; frame: string }) {
  const bars = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const list: [number, number][] = [];
    for (const s of g.segments) {
      const n = Math.max(1, Math.floor(s.length / spacing));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        list.push([s.start[0] + (s.end[0] - s.start[0]) * t, s.start[1] + (s.end[1] - s.start[1]) * t]);
      }
    }
    return list;
  }, [g, spacing]);

  useEffect(() => {
    const mesh = bars.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    positions.forEach(([x, z], i) => mesh.setMatrixAt(i, m.makeTranslation(x, g.boardHeight + g.barHeight / 2, z)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [positions, g.boardHeight, g.barHeight]);

  return (
    <group>
      <instancedMesh key={positions.length} ref={bars} args={[undefined, undefined, positions.length]} castShadow>
        <boxGeometry args={[0.02, g.barHeight, 0.02]} />
        <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
      </instancedMesh>
      {g.segments.map((s, i) => {
        const { mid, rotY } = placement(s);
        return (
          <group key={i} position={[mid[0], 0, mid[1]]} rotation-y={rotY}>
            <mesh position={[0, g.boardHeight + g.barHeight - 0.02, 0]} castShadow>
              <boxGeometry args={[s.length, 0.04, 0.04]} />
              <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[-s.length / 2, (g.boardHeight + g.barHeight) / 2, 0]} castShadow>
              <boxGeometry args={[0.06, g.boardHeight + g.barHeight, 0.06]} />
              <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Ball-stop net behind each goal, standing just outside the goal's depth. */
function Fencing({ g, product, height, frame }: { g: Geometry; product: Product; height: number; frame: string }) {
  const span = fencingSpan(product, g);
  return (
    <group>
      {g.segments
        .filter((s) => s.kind === "goal")
        .map((s, i) => {
          const { mid, rotY, out } = placement(s);
          const offset = product.goal.depth + 0.3;
          const posts = Math.ceil(span / 2.5) + 1;
          return (
            <group key={i} position={[mid[0] + out[0] * offset, 0, mid[1] + out[1] * offset]} rotation-y={rotY}>
              <mesh position={[0, height / 2, 0]}>
                <planeGeometry args={[span, height, Math.round(span * 6), Math.round(height * 6)]} />
                <meshStandardMaterial color={NET} transparent opacity={0.45} side={THREE.DoubleSide} wireframe />
              </mesh>
              {Array.from({ length: posts }, (_, k) => (
                <mesh key={k} position={[-span / 2 + (k * span) / (posts - 1), height / 2, 0]} castShadow>
                  <boxGeometry args={[0.06, height, 0.06]} />
                  <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
                </mesh>
              ))}
            </group>
          );
        })}
    </group>
  );
}
