import { boolean, date, index, integer, jsonb, numeric, pgEnum, pgSequence, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { MaterialSummary } from "@/lib/pricing/aggregate";
import type { Bom } from "@/lib/pricing/bom";
import type { ItemPrice } from "@/lib/pricing/price";
import type { Configuration } from "@/lib/pricing/schema";

export const quoteStatuses = ["new", "sent", "accepted", "in_production", "delivered", "rejected"] as const;
export const quoteStatus = pgEnum("quote_status", quoteStatuses);

export const quoteNumberSeq = pgSequence("quote_number_seq", { startWith: 1 });

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  company: text("company"),
  vatNumber: text("vat_number"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  country: text("country").notNull(),
  address: text("address").notNull(),
  createdAt: createdAt(),
});

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    status: quoteStatus("status").notNull().default("new"),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    locale: text("locale").notNull(),
    desiredDate: date("desired_date"),
    comment: text("comment"),
    deliveryZone: text("delivery_zone"),
    delivery: money("delivery"),
    subtotal: money("subtotal").notNull(),
    discount: money("discount").notNull().default(0),
    net: money("net").notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 4, mode: "number" }).notNull(),
    vat: money("vat").notNull(),
    total: money("total").notNull(),
    reverseCharge: boolean("reverse_charge").notNull().default(false),
    pricingVersion: text("pricing_version").notNull(),
    /** Total material requirement across all items, snapshot at submission. */
    materials: jsonb("materials").$type<MaterialSummary>().notNull(),
    validUntil: date("valid_until").notNull(),
    /** Salted hash of the submitter's IP, for rate limiting only. */
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quotes_created_at_idx").on(t.createdAt), index("quotes_ip_hash_idx").on(t.ipHash)],
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    product: text("product").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: money("unit_price").notNull(),
    total: money("total").notNull(),
    config: jsonb("config").$type<Configuration>().notNull(),
    /** BOM for one unit; multiply by quantity for the order. */
    bom: jsonb("bom").$type<Bom>().notNull(),
    price: jsonb("price").$type<ItemPrice>().notNull(),
  },
  (t) => [index("quote_items_quote_idx").on(t.quoteId)],
);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  createdAt: createdAt(),
});

export const quoteEventTypes = ["created", "status_changed", "email_sent", "email_failed", "price_adjusted", "resent"] as const;

export const quoteEvents = pgTable(
  "quote_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    type: text("type", { enum: quoteEventTypes }).notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("quote_events_quote_idx").on(t.quoteId)],
);

export type QuoteStatus = (typeof quoteStatuses)[number];
export type QuoteRow = typeof quotes.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type QuoteItemRow = typeof quoteItems.$inferSelect;
