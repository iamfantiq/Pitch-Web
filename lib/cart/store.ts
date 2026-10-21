"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { configurationSchema, type Configuration } from "@/lib/pricing/schema";

export interface CartItem {
  id: string;
  config: Configuration;
}

interface CartState {
  items: CartItem[];
  add: (config: Configuration) => string;
  update: (id: string, config: Configuration) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (config) => {
        const id = newId();
        set({ items: [...get().items, { id, config }] });
        return id;
      },
      update: (id, config) => set({ items: get().items.map((i) => (i.id === id ? { ...i, config } : i)) }),
      duplicate: (id) => {
        const items = get().items;
        const index = items.findIndex((i) => i.id === id);
        const item = items[index];
        if (!item) return;
        const copy = { id: newId(), config: structuredClone(item.config) };
        set({ items: [...items.slice(0, index + 1), copy, ...items.slice(index + 1)] });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQuantity: (id, quantity) =>
        set({ items: get().items.map((i) => (i.id === id ? { ...i, config: { ...i.config, quantity } } : i)) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "pitch-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Drop items that no longer validate (e.g. after a product config change).
      merge: (persisted, current) => {
        const items = ((persisted as Partial<CartState> | undefined)?.items ?? []).filter(
          (i) => configurationSchema.safeParse(i.config).success,
        );
        return { ...current, items };
      },
    },
  ),
);

/** True after the persisted cart has loaded on the client (avoids hydration mismatches). */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useCart.persist.onFinishHydration(onChange),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}
