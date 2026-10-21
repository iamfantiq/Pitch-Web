/**
 * All pricing parameters in one place. Edit values here; no logic changes needed.
 * Later this moves into the admin panel (same shape, stored in the database).
 *
 * Bump `version` whenever you change anything: every quote stores the version it was priced with.
 */

export type PricingMode = "calibration" | "cost";

export interface DeliveryZone {
  /** ISO 3166-1 alpha-2 country codes. */
  countries: readonly string[];
  base: number;
  perPallet: number;
}

export const pricing = {
  version: "2026-10-21.1",

  /**
   * "calibration": price = catalog price × BOM cost(config) / BOM cost(standard).
   *                Use until real unit costs are entered in config/materials.ts.
   * "cost":        price = (materials + labour + finishing + overhead) × (1 + margin).
   */
  mode: "calibration" as PricingMode,

  /** Customer-facing amounts are rounded to this many EUR. */
  roundTo: 10,

  vat: {
    rate: 0.21,
    homeCountry: "LV",
    /** 0% VAT for EU B2B customers outside the home country with a VAT number. */
    reverseChargeEu: true,
  },

  quoteValidityDays: 30,

  /** Production cost model (internal, never shown to customers). TODO(owner): real values. */
  cost: {
    labourRatePerHour: 30,
    labourHours: {
      perBoard: 1.5,
      perCornerBoard: 2,
      perGoalSurroundBoard: 0.75,
      perLintelBoard: 0.75,
      perGoal: 4,
      perMetreOfBars: 1.2,
    },
    overheadRate: 0.15,
    margin: 0.35,
  },

  /** Construction rules used to derive the BOM. TODO(owner): confirm. */
  construction: {
    /** Vertical studs inside a board frame, max spacing (m). */
    studSpacing: 1.0,
    /** Back brace length = board height × this factor. */
    braceLengthFactor: 1.4,
    boltsPerJoint: 4,
    footPlatesPerBoard: 1,
    /** Waste added when a plywood piece is larger than a sheet and must be joined. */
    plywoodWaste: 0.1,
    /** Ball-stop fencing extends this far beyond the goal slot on each side (m). */
    fenceSideExtension: 1.0,
    fencePostSpacing: 2.5,
    /** Boards per transport cart / per pallet for delivery. */
    boardsPerCart: 12,
    boardsPerPallet: 20,
  },

  /** Customer prices for options (EUR excl. VAT). TODO(owner): real prices. */
  options: {
    branding: { perM2: 40, setupFee: 150 },
    fencing: { perM2: 28 },
    goalPro: { perGoal: 350 },
    powderCoat: { perKgSteel: 1.5 },
    turf: { perM2: 18 },
    transportCart: { each: 650 },
    storageBags: { perSet: 120 },
    installation: { dayRate: 900, boardsPerDay: 30 },
  },

  /** Delivery is priced per quote (all items ship together). Unlisted countries: on request. */
  delivery: {
    zones: {
      lv: { countries: ["LV"], base: 150, perPallet: 40 },
      baltics: { countries: ["EE", "LT"], base: 350, perPallet: 70 },
      eu: {
        countries: ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"],
        base: 800,
        perPallet: 140,
      },
    } satisfies Record<string, DeliveryZone>,
  },
};

export type PricingSettings = typeof pricing;

/** EU member states (for reverse charge). */
export const euCountries = ["LV", "EE", "LT", ...pricing.delivery.zones.eu.countries] as const;
