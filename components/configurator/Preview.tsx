"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import { PitchIllustration } from "@/components/ui/PitchIllustration";
import type { Product } from "@/config/products";
import type { Configuration } from "@/lib/pricing/schema";

// three.js is only downloaded on the configurator, and only when 3D is shown.
const PitchScene = dynamic(() => import("@/components/three/PitchScene"), { ssr: false, loading: () => null });

type Mode = "3d" | "2d";

let capability: Mode | null = null;
/** 3D by default when WebGL works and the device isn't low-end; the drawing otherwise. */
function detectCapability(): Mode {
  if (capability) return capability;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowEnd = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
    capability = gl && !lowEnd ? "3d" : "2d";
  } catch {
    capability = "2d";
  }
  return capability;
}

const noopSubscribe = () => () => {};

export function Preview({ config, product }: { config: Configuration; product: Product }) {
  const t = useTranslations("configurator");
  const detected = useSyncExternalStore(noopSubscribe, detectCapability, () => null);
  const [chosen, setChosen] = useState<Mode | null>(null);
  const [failed, setFailed] = useState(false);
  const mode: Mode = failed ? "2d" : (chosen ?? detected ?? "2d");

  const drawing = <PitchIllustration config={config} title={`${t("preview")}: ${product.name}`} className="aspect-[4/3] w-full" />;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface">
      {mode === "3d" ? (
        <div className="aspect-[4/3] w-full touch-none">
          <SceneBoundary fallback={drawing} onError={() => setFailed(true)}>
            <PitchScene config={config} label={t("model", { product: product.name })} />
          </SceneBoundary>
        </div>
      ) : (
        <div className="p-4 sm:p-8">{drawing}</div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <p className={`text-xs text-muted ${mode === "3d" ? "" : "invisible"}`}>{t("dragHint")}</p>
        {!failed && detected !== null ? (
          <div role="group" aria-label={t("viewLabel")} className="flex shrink-0 rounded-full bg-white/90 p-0.5 text-xs font-medium shadow-sm backdrop-blur">
            {(["3d", "2d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setChosen(m)}
                className={`min-h-8 rounded-full px-3 transition-colors ${mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                {m === "3d" ? t("view3d") : t("view2d")}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Falls back to the drawing if WebGL fails at runtime (lost context, driver issues). */
class SceneBoundary extends Component<{ fallback: ReactNode; onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
