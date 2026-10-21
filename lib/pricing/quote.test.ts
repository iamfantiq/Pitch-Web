import { describe, expect, it } from "vitest";
import { pricing } from "@/config/pricing";
import { computeQuote, isPlausibleVatNumber, isReverseCharge } from "./quote";
import { defaultConfiguration } from "./schema";

const items = [defaultConfiguration("the-pitch"), { ...defaultConfiguration("panna-pitch"), quantity: 2 }];

describe("quote totals", () => {
  it("adds items, delivery and 21% VAT for a Latvian customer", () => {
    const q = computeQuote(items, { country: "LV" });
    expect(q.items.map((i) => i.total)).toEqual([6000, 5000]);
    expect(q.delivery?.zone).toBe("lv");
    expect(q.subtotal).toBe(11000 + q.delivery!.amount);
    expect(q.vatRate).toBe(0.21);
    expect(q.vat).toBeCloseTo(q.net * 0.21);
    expect(q.total).toBeCloseTo(q.net * 1.21);
    expect(q.reverseCharge).toBe(false);
  });

  it("applies EU reverse charge for a German company with a VAT number", () => {
    const q = computeQuote(items, { country: "DE", vatNumber: "DE 123456789" });
    expect(q.reverseCharge).toBe(true);
    expect(q.vat).toBe(0);
    expect(q.total).toBe(q.net);
    expect(q.delivery?.zone).toBe("eu");
  });

  it("charges VAT without a valid VAT number, and in the home country", () => {
    expect(isReverseCharge({ country: "DE" })).toBe(false);
    expect(isReverseCharge({ country: "DE", vatNumber: "FR123456789" })).toBe(false);
    expect(isReverseCharge({ country: "LV", vatNumber: "LV40000000000" })).toBe(false);
    expect(isReverseCharge({ country: "NO", vatNumber: "NO123456789" })).toBe(false);
    expect(isPlausibleVatNumber("GR", "EL123456789")).toBe(true);
  });

  it("leaves delivery open for countries outside the zones, and before a country is chosen", () => {
    expect(computeQuote(items, { country: "US" }).delivery).toBeNull();
    expect(computeQuote(items, { country: "" }).delivery).toBeNull();
  });

  it("applies a discount but never below zero", () => {
    const q = computeQuote(items, { country: "LV" }, 500);
    expect(q.net).toBe(q.subtotal - 500);
    expect(computeQuote(items, { country: "LV" }, 1e9).net).toBe(0);
  });

  it("records the pricing version", () => {
    expect(computeQuote(items, { country: "LV" }).pricingVersion).toBe(pricing.version);
  });
});
