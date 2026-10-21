"use client";

import type { ReactNode } from "react";

export function Section({ title, hint, children, id }: { title: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={`${id}-title`} className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
  /** Pre-formatted price difference, e.g. "+ €560". */
  delta?: string;
  swatch?: string;
}

interface ChoiceGroupProps<T extends string | number> {
  name: string;
  legend: string;
  hideLegend?: boolean;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}

/** Radio group styled as cards. Native radios keep arrow-key navigation and screen-reader semantics. */
export function ChoiceGroup<T extends string | number>({ name, legend, hideLegend, options, value, onChange, columns = 2 }: ChoiceGroupProps<T>) {
  const cols = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3";
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : "mb-3 text-sm font-medium"}>{legend}</legend>
      <div className={`grid gap-3 ${cols}`}>
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={String(o.value)}
              className={`relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                checked ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]" : "border-line hover:border-muted"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={String(o.value)}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.swatch ? (
                <span aria-hidden="true" className="size-6 shrink-0 rounded-full border border-black/10" style={{ background: o.swatch }} />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{o.label}</span>
                {o.description ? <span className="block text-xs text-muted">{o.description}</span> : null}
              </span>
              {o.delta ? <span className="shrink-0 text-xs text-muted">{o.delta}</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface StepperProps {
  label: string;
  value: string;
  detail?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseLabel: string;
  increaseLabel: string;
}

export function Stepper({ label, value, detail, onDecrease, onIncrease, canDecrease, canIncrease, decreaseLabel, increaseLabel }: StepperProps) {
  const btn =
    "flex size-11 items-center justify-center rounded-full border border-line text-xl transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line";
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-xl font-semibold tabular-nums" aria-live="polite">
          {value}
        </p>
        {detail ? <p className="text-xs text-muted">{detail}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" className={btn} onClick={onDecrease} disabled={!canDecrease} aria-label={decreaseLabel}>
          −
        </button>
        <button type="button" className={btn} onClick={onIncrease} disabled={!canIncrease} aria-label={increaseLabel}>
          +
        </button>
      </div>
    </div>
  );
}

interface ToggleCardProps {
  label: string;
  description?: string;
  delta?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleCard({ label, description, delta, checked, onChange }: ToggleCardProps) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
        checked ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]" : "border-line hover:border-muted"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--color-accent)]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
      {delta ? <span className="shrink-0 text-xs text-muted">{delta}</span> : null}
    </label>
  );
}
