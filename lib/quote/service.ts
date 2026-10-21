import "server-only";
import { and, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { pricing } from "@/config/pricing";
import { site } from "@/config/site";
import type { Db } from "@/lib/db/client";
import { customers, quoteEvents, quoteItems, quotes, uploads } from "@/lib/db/schema";
import { customerOfferEmail, ownerNotificationEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { renderOfferPdf } from "@/lib/pdf/OfferDocument";
import { aggregateBoms } from "@/lib/pricing/aggregate";
import { computeBom } from "@/lib/pricing/bom";
import { computeQuote } from "@/lib/pricing/quote";
import { rateLimit } from "@/lib/spam";
import { loadQuote } from "./load";
import { buildOffer } from "./offer";
import type { QuoteRequest } from "./schema";

export class RateLimitedError extends Error {}

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Rows from db.execute differ between drivers (postgres-js: array, PGlite: { rows }). */
function rowsOf<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

/**
 * Stores a quote request. Prices and BOMs are always recalculated here — the client's numbers are never used.
 */
export async function createQuote(db: Db, request: QuoteRequest, ipHash: string) {
  const since = new Date(Date.now() - rateLimit.windowMinutes * 60_000);
  const [recent] = await db.select({ n: count() }).from(quotes).where(and(eq(quotes.ipHash, ipHash), gt(quotes.createdAt, since)));
  if ((recent?.n ?? 0) >= rateLimit.maxQuotes) throw new RateLimitedError();

  const { customer, items, locale } = request;
  const totals = computeQuote(items, { country: customer.country, vatNumber: customer.vatNumber });
  const boms = items.map((c) => computeBom(c));
  const materials = aggregateBoms(boms.map((bom, i) => ({ bom, quantity: items[i]!.quantity })));
  const logoIds = items.map((c) => c.branding.logoUploadId).filter((id): id is string => Boolean(id));

  return db.transaction(async (tx) => {
    const [{ n }] = rowsOf<{ n: string | number }>(await tx.execute(sql`select nextval('quote_number_seq') as n`)) as [{ n: string | number }];
    const number = `Q-${new Date().getUTCFullYear()}-${String(n).padStart(4, "0")}`;

    const [cust] = await tx
      .insert(customers)
      .values({
        name: customer.name,
        company: customer.company || null,
        vatNumber: customer.vatNumber || null,
        email: customer.email,
        phone: customer.phone,
        country: customer.country,
        address: customer.address,
      })
      .returning({ id: customers.id });

    const [quote] = await tx
      .insert(quotes)
      .values({
        number,
        customerId: cust!.id,
        locale,
        desiredDate: customer.desiredDate || null,
        comment: customer.comment || null,
        deliveryZone: totals.delivery?.zone ?? null,
        delivery: totals.delivery?.amount ?? null,
        subtotal: totals.subtotal,
        discount: 0,
        net: totals.net,
        vatRate: totals.vatRate,
        vat: totals.vat,
        total: totals.total,
        reverseCharge: totals.reverseCharge,
        pricingVersion: totals.pricingVersion,
        materials,
        validUntil: addDays(pricing.quoteValidityDays),
        ipHash,
      })
      .returning({ id: quotes.id, number: quotes.number });

    await tx.insert(quoteItems).values(
      items.map((config, i) => ({
        quoteId: quote!.id,
        position: i + 1,
        product: config.product,
        quantity: config.quantity,
        unitPrice: totals.items[i]!.unitPrice,
        total: totals.items[i]!.total,
        config,
        bom: boms[i]!,
        price: totals.items[i]!,
      })),
    );

    if (logoIds.length) {
      await tx.update(uploads).set({ quoteId: quote!.id }).where(and(inArray(uploads.id, logoIds), isNull(uploads.quoteId)));
    }
    await tx.insert(quoteEvents).values({ quoteId: quote!.id, type: "created", data: { net: totals.net, items: items.length } });
    return quote!;
  });
}

/** Renders the PDF offer and emails it to the customer (and notifies the owner). Logs the outcome. */
export async function deliverQuote(db: Db, quoteId: string, { notifyOwner }: { notifyOwner: boolean }) {
  const loaded = await loadQuote(db, quoteId);
  if (!loaded) throw new Error(`Quote ${quoteId} not found`);
  const offer = buildOffer(loaded);
  const pdf = await renderOfferPdf(offer);
  const attachment = { filename: `${offer.number}.pdf`, content: pdf };

  const mail = customerOfferEmail(offer);
  const toCustomer = await sendEmail({ to: offer.customer.email, ...mail, replyTo: site.email, attachments: [attachment] });
  await db.insert(quoteEvents).values({
    quoteId,
    type: toCustomer.ok ? "email_sent" : "email_failed",
    data: toCustomer.ok ? { to: offer.customer.email, transport: toCustomer.transport, id: toCustomer.id } : { to: offer.customer.email, error: toCustomer.error },
  });

  const owner = process.env.QUOTE_NOTIFY_EMAIL;
  if (notifyOwner && owner) {
    const note = ownerNotificationEmail(offer, loaded.quote.materials, `${site.url}/admin/quotes/${quoteId}`);
    const toOwner = await sendEmail({ to: owner, ...note, replyTo: offer.customer.email, attachments: [attachment] });
    if (!toOwner.ok) await db.insert(quoteEvents).values({ quoteId, type: "email_failed", data: { to: owner, error: toOwner.error } });
  }
  return { emailed: toCustomer.ok };
}
