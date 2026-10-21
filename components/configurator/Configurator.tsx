"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { optionCatalog } from "@/config/options";
import { getProduct, type OctagonProduct, type Product, type ProductSlug, type RectangleProduct } from "@/config/products";
import { Link } from "@/i18n/navigation";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import { formatNumber, formatPrice } from "@/lib/format";
import { computeGeometry, octagonDimensions, rectangleDimensions } from "@/lib/pricing/geometry";
import { priceItem } from "@/lib/pricing/price";
import { configurationSchema, defaultConfiguration, type Configuration } from "@/lib/pricing/schema";
import { ChoiceGroup, Section, Stepper, ToggleCard, type ChoiceOption } from "./controls";
import { Preview } from "./Preview";
import { PriceLines, PriceTotal } from "./PriceSummary";

type Update = (next: Configuration) => void;
/** Formatted per-unit price difference if `next` replaced the current configuration. */
type DeltaFor = (next: Configuration) => string | undefined;

export function Configurator({ slug }: { slug: ProductSlug }) {
  const editId = useSearchParams().get("edit");
  const hydrated = useCartHydrated();
  const item = useCart((s) => (editId ? s.items.find((i) => i.id === editId && i.config.product === slug) : undefined));
  // Editing a cart item: wait for the persisted cart so the form starts from the saved configuration.
  if (editId && !hydrated) return null;
  return <ConfiguratorForm key={item?.id ?? "new"} slug={slug} initial={item?.config} initialEditing={item?.id ?? null} />;
}

function ConfiguratorForm({ slug, initial, initialEditing }: { slug: ProductSlug; initial?: Configuration; initialEditing: string | null }) {
  const product = getProduct(slug)!;
  const t = useTranslations("configurator");
  const locale = useLocale();
  const add = useCart((s) => s.add);
  const update = useCart((s) => s.update);
  const [config, setConfig] = useState<Configuration>(() => initial ?? defaultConfiguration(slug));
  const [editing, setEditing] = useState<string | null>(initialEditing);
  const [status, setStatus] = useState<"added" | "updated" | "invalid" | null>(null);

  const price = useMemo(() => priceItem(config), [config]);

  const deltaFor: DeltaFor = (next) => {
    const diff = priceItem({ ...next, quantity: 1 }).unitPrice - price.unitPrice;
    if (diff === 0) return undefined;
    return `${diff > 0 ? "+" : "−"} ${formatPrice(Math.abs(diff), locale)}`;
  };

  const set: Update = (next) => {
    setStatus(null);
    setConfig(next);
  };

  const submit = () => {
    const parsed = configurationSchema.safeParse(config);
    if (!parsed.success) {
      setStatus("invalid");
      return;
    }
    if (editing) {
      update(editing, parsed.data);
      setStatus("updated");
    } else {
      setEditing(add(parsed.data));
      setStatus("added");
    }
  };

  const action = (
    <button type="button" onClick={submit} className={buttonClass("primary", "w-full")}>
      {editing ? t("updateCart") : t("addToCart")}
    </button>
  );

  const statusMessage =
    status === null ? null : (
      <p role="status" className={`text-sm ${status === "invalid" ? "text-danger" : "text-accent"}`}>
        {status === "invalid" ? t("invalid") : t(status)}{" "}
        {status !== "invalid" ? (
          <Link href="/cart" className="font-medium underline underline-offset-4">
            {t("viewCart")}
          </Link>
        ) : null}
      </p>
    );

  return (
    <div className="container-page pb-40 pt-6 lg:pb-0">
      <Link href={`/products/${slug}`} className="text-sm text-accent hover:underline underline-offset-4">
        {t("back", { product: product.name })}
      </Link>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{t("title", { product: product.name })}</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="space-y-6 lg:sticky lg:top-16">
            <Preview config={config} product={product} />
            <aside aria-label={t("summary.title")} className="hidden rounded-[var(--radius-card)] bg-surface p-6 lg:block">
              <h2 className="mb-4 text-lg font-semibold">{t("summary.title")}</h2>
              <PriceLines price={price} config={config} />
              <div className="my-4 border-t border-line" />
              <PriceTotal price={price} />
              <div className="mt-5 space-y-3">
                {action}
                {statusMessage}
              </div>
            </aside>
          </div>
        </div>

        <div className="lg:col-span-5">
          <SizeSection product={product} config={config} set={set} deltaFor={deltaFor} />
          <HeightSection product={product} config={config} set={set} deltaFor={deltaFor} />
          <GoalSection config={config} set={set} deltaFor={deltaFor} />
          {product.allows.fencing ? <FencingSection config={config} set={set} deltaFor={deltaFor} /> : null}
          <BrandingSection config={config} set={set} deltaFor={deltaFor} />
          <FinishSection config={config} set={set} deltaFor={deltaFor} />
          {product.allows.turf ? <SurfaceSection config={config} set={set} deltaFor={deltaFor} /> : null}
          <ExtrasSection config={config} set={set} deltaFor={deltaFor} />
          <QuantitySection config={config} set={set} />
        </div>
      </div>

      <MobileBar config={config} price={price} action={action} status={statusMessage} />
    </div>
  );
}

interface SectionProps {
  config: Configuration;
  set: Update;
  deltaFor: DeltaFor;
}

function SizeSection({ product, config, set, deltaFor }: SectionProps & { product: Product }) {
  const t = useTranslations("configurator");
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, locale, 2);

  if (product.shape === "octagon") return <OctagonSize product={product} config={config} set={set} deltaFor={deltaFor} />;
  if (config.size.shape !== "rectangle") return null;
  const size = config.size;
  const p: RectangleProduct = product;
  const dims = rectangleDimensions(p, size.lengthBoards, size.widthBoardsPerSide);
  const resize = (lengthBoards: number, widthBoardsPerSide: number) =>
    set({ ...config, size: { shape: "rectangle", lengthBoards, widthBoardsPerSide } });
  const { lengthBoards: lb, widthBoardsPerSide: wb } = p.layout;

  return (
    <Section id="size" title={t("sections.size")} hint={t("hints.size")}>
      <Stepper
        label={t("length")}
        value={`${n(dims.length)} m`}
        detail={t("boardsLength", { count: size.lengthBoards })}
        onDecrease={() => resize(size.lengthBoards - 1, size.widthBoardsPerSide)}
        onIncrease={() => resize(size.lengthBoards + 1, size.widthBoardsPerSide)}
        canDecrease={size.lengthBoards > lb.min}
        canIncrease={size.lengthBoards < lb.max}
        decreaseLabel={t("decrease", { what: t("length") })}
        increaseLabel={t("increase", { what: t("length") })}
      />
      <Stepper
        label={t("width")}
        value={`${n(dims.width)} m`}
        detail={t("boardsWidth", { count: size.widthBoardsPerSide })}
        onDecrease={() => resize(size.lengthBoards, size.widthBoardsPerSide - 1)}
        onIncrease={() => resize(size.lengthBoards, size.widthBoardsPerSide + 1)}
        canDecrease={size.widthBoardsPerSide > wb.min}
        canIncrease={size.widthBoardsPerSide < wb.max}
        decreaseLabel={t("decrease", { what: t("width") })}
        increaseLabel={t("increase", { what: t("width") })}
      />
    </Section>
  );
}

function OctagonSize({ product, config, set, deltaFor }: SectionProps & { product: OctagonProduct }) {
  const t = useTranslations("configurator");
  const locale = useLocale();
  if (config.size.shape !== "octagon") return null;
  const options: ChoiceOption<string>[] = product.layout.sizes.map((s) => {
    const d = octagonDimensions(product, s.id);
    const next: Configuration = { ...config, size: { shape: "octagon", sizeId: s.id } };
    const dim = formatNumber(d.length, locale, 1);
    return { value: s.id, label: t("octagonSize", { size: `${dim} × ${dim}` }), delta: deltaFor(next) };
  });
  return (
    <Section id="size" title={t("sections.size")}>
      <ChoiceGroup
        name="size"
        legend={t("sections.size")}
        hideLegend
        columns={1}
        options={options}
        value={config.size.sizeId}
        onChange={(sizeId) => set({ ...config, size: { shape: "octagon", sizeId } })}
      />
    </Section>
  );
}

function HeightSection({ product, config, set, deltaFor }: SectionProps & { product: Product }) {
  const t = useTranslations("configurator");
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, locale, 2);
  const boardChoices = product.boardHeight.options;
  const barChoices = product.cage?.barHeight.options ?? [];
  if (boardChoices.length < 2 && barChoices.length < 2) return null;
  const total = config.boardHeight + (config.barHeight ?? 0);

  return (
    <Section id="height" title={t("sections.height")} hint={t("totalHeight", { value: n(total) })}>
      {boardChoices.length > 1 ? (
        <ChoiceGroup
          name="boardHeight"
          legend={t("boardHeight")}
          columns={3}
          options={boardChoices.map((h) => ({ value: h, label: `${n(h)} m`, delta: deltaFor({ ...config, boardHeight: h }) }))}
          value={config.boardHeight}
          onChange={(boardHeight) => set({ ...config, boardHeight })}
        />
      ) : null}
      {barChoices.length > 1 && config.barHeight !== null ? (
        <ChoiceGroup
          name="barHeight"
          legend={t("barHeight")}
          columns={3}
          options={barChoices.map((h) => ({ value: h, label: `${n(h)} m`, delta: deltaFor({ ...config, barHeight: h }) }))}
          value={config.barHeight}
          onChange={(barHeight) => set({ ...config, barHeight })}
        />
      ) : null}
    </Section>
  );
}

function GoalSection({ config, set, deltaFor }: SectionProps) {
  const t = useTranslations("configurator");
  return (
    <Section id="goals" title={t("sections.goals")}>
      <ChoiceGroup
        name="goal"
        legend={t("sections.goals")}
        hideLegend
        options={optionCatalog.goalTypes.map((g) => ({
          value: g,
          label: t(`goal.${g}`),
          description: t(`goal.${g}Text`),
          delta: deltaFor({ ...config, goal: g }),
        }))}
        value={config.goal}
        onChange={(goal) => set({ ...config, goal })}
      />
    </Section>
  );
}

function FencingSection({ config, set, deltaFor }: SectionProps) {
  const t = useTranslations("configurator");
  const locale = useLocale();
  const heights = [0, ...optionCatalog.fencingHeights];
  return (
    <Section id="fencing" title={t("sections.fencing")} hint={t("hints.fencing")}>
      <ChoiceGroup
        name="fencing"
        legend={t("sections.fencing")}
        hideLegend
        options={heights.map((h) => ({
          value: h,
          label: h === 0 ? t("fencingNone") : t("fencingHeight", { value: formatNumber(h, locale) }),
          delta: deltaFor({ ...config, fencingHeight: h }),
        }))}
        value={config.fencingHeight}
        onChange={(fencingHeight) => set({ ...config, fencingHeight })}
      />
    </Section>
  );
}

function BrandingSection({ config, set, deltaFor }: SectionProps) {
  const t = useTranslations("configurator");
  const b = config.branding;
  const maxBoards = computeGeometry(config).counts.boards;
  const withBranding = (patch: Partial<Configuration["branding"]>): Configuration => ({ ...config, branding: { ...b, ...patch } });

  return (
    <Section id="branding" title={t("sections.branding")} hint={t("hints.branding")}>
      <ChoiceGroup
        name="coverage"
        legend={t("sections.branding")}
        hideLegend
        columns={1}
        options={optionCatalog.brandingCoverage.map((c) => ({
          value: c,
          label: t(`coverage.${c}`),
          description: t(`coverage.${c}Text`),
          delta: deltaFor(withBranding({ coverage: c, boards: c === "logos" ? Math.max(b.boards, 2) : b.boards })),
        }))}
        value={b.coverage}
        onChange={(coverage) => set(withBranding({ coverage, boards: coverage === "logos" ? Math.max(b.boards, 2) : b.boards }))}
      />
      {b.coverage === "logos" ? (
        <Stepper
          label={t("logoBoards")}
          value={String(b.boards)}
          onDecrease={() => set(withBranding({ boards: b.boards - 1 }))}
          onIncrease={() => set(withBranding({ boards: b.boards + 1 }))}
          canDecrease={b.boards > 1}
          canIncrease={b.boards < maxBoards}
          decreaseLabel={t("decrease", { what: t("logoBoards") })}
          increaseLabel={t("increase", { what: t("logoBoards") })}
        />
      ) : null}
      {b.coverage !== "none" ? (
        <ChoiceGroup
          name="sides"
          legend={t("sides.label")}
          options={[
            { value: 1, label: t("sides.one"), delta: deltaFor(withBranding({ sides: 1 })) },
            { value: 2, label: t("sides.two"), delta: deltaFor(withBranding({ sides: 2 })) },
          ]}
          value={b.sides}
          onChange={(sides) => set(withBranding({ sides: sides as 1 | 2 }))}
        />
      ) : null}
    </Section>
  );
}

function FinishSection({ config, set, deltaFor }: SectionProps) {
  const t = useTranslations("configurator");
  const ral = Object.entries(optionCatalog.ralColours);
  const firstRal = ral[0]?.[0] ?? null;
  const withFinish = (finish: Configuration["finish"]): Configuration => ({ ...config, finish });

  return (
    <Section id="finish" title={t("sections.finish")} hint={t("hints.finish")}>
      <ChoiceGroup
        name="finish"
        legend={t("sections.finish")}
        hideLegend
        options={optionCatalog.finishes.map((f) => {
          const next = withFinish(f === "powder" ? { type: "powder", ral: config.finish.ral ?? firstRal } : { type: "galvanized", ral: null });
          return { value: f, label: t(`finishType.${f}`), description: t(`finishType.${f}Text`), delta: deltaFor(next) };
        })}
        value={config.finish.type}
        onChange={(type) => set(withFinish(type === "powder" ? { type, ral: config.finish.ral ?? firstRal } : { type, ral: null }))}
      />
      {config.finish.type === "powder" ? (
        <ChoiceGroup
          name="ral"
          legend={t("colour")}
          columns={3}
          options={ral.map(([code, hex]) => ({ value: code, label: code, swatch: hex }))}
          value={config.finish.ral ?? ""}
          onChange={(code) => set(withFinish({ type: "powder", ral: code }))}
        />
      ) : null}
    </Section>
  );
}

function SurfaceSection({ config, set, deltaFor }: SectionProps) {
  const t = useTranslations("configurator");
  const locale = useLocale();
  const area = formatNumber(computeGeometry(config).area, locale, 0);
  return (
    <Section id="surface" title={t("sections.surface")}>
      <ChoiceGroup
        name="surface"
        legend={t("sections.surface")}
        hideLegend
        options={optionCatalog.surfaces.map((s) => ({
          value: s,
          label: t(`surface.${s}`),
          description: t(`surface.${s}Text`, { area }),
          delta: deltaFor({ ...config, surface: s }),
        }))}
        value={config.surface}
        onChange={(surface) => set({ ...config, surface })}
      />
    </Section>
  );
}

function ExtrasSection({ config, set, deltaFor }: SectionProps) {
  const t = useTranslations("configurator");
  const keys = ["transportCart", "storageBags", "installation"] as const;
  return (
    <Section id="extras" title={t("sections.extras")}>
      {keys.map((key) => {
        const toggled: Configuration = { ...config, extras: { ...config.extras, [key]: !config.extras[key] } };
        return (
          <ToggleCard
            key={key}
            label={t(`extras.${key}`)}
            description={t(`extras.${key}Text`)}
            delta={config.extras[key] ? undefined : deltaFor(toggled)}
            checked={config.extras[key]}
            onChange={() => set(toggled)}
          />
        );
      })}
    </Section>
  );
}

function QuantitySection({ config, set }: Omit<SectionProps, "deltaFor">) {
  const t = useTranslations("configurator");
  return (
    <Section id="quantity" title={t("sections.quantity")}>
      <Stepper
        label={t("sections.quantity")}
        value={String(config.quantity)}
        onDecrease={() => set({ ...config, quantity: config.quantity - 1 })}
        onIncrease={() => set({ ...config, quantity: config.quantity + 1 })}
        canDecrease={config.quantity > 1}
        canIncrease={config.quantity < optionCatalog.maxQuantity}
        decreaseLabel={t("decrease", { what: t("sections.quantity") })}
        increaseLabel={t("increase", { what: t("sections.quantity") })}
      />
    </Section>
  );
}

function MobileBar({
  config,
  price,
  action,
  status,
}: {
  config: Configuration;
  price: ReturnType<typeof priceItem>;
  action: ReactNode;
  status: ReactNode;
}) {
  const t = useTranslations("configurator");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 backdrop-blur-xl lg:hidden">
      <div
        id="price-sheet"
        className={`container-page overflow-y-auto transition-[max-height] duration-300 ease-[var(--ease-apple)] ${open ? "max-h-[60dvh]" : "max-h-0"}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="py-4">
          <h2 className="mb-3 font-semibold">{t("summary.title")}</h2>
          <PriceLines price={price} config={config} />
          <div className="my-3 border-t border-line" />
          <PriceTotal price={price} />
        </div>
      </div>
      <div className="container-page space-y-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {status}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="price-sheet"
            className="min-h-11 flex-1 text-left"
          >
            <span className="block text-lg font-semibold tabular-nums">{formatPrice(price.total, locale)}</span>
            <span className="block text-xs text-accent">{open ? t("summary.hideDetails") : t("summary.showDetails")}</span>
          </button>
          <div className="w-44 shrink-0">{action}</div>
        </div>
      </div>
    </div>
  );
}
