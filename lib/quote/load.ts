import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { customers, quoteEvents, quoteItems, quotes, uploads } from "@/lib/db/schema";

export async function loadQuote(db: Db, id: string) {
  const [row] = await db.select().from(quotes).innerJoin(customers, eq(quotes.customerId, customers.id)).where(eq(quotes.id, id));
  if (!row) return null;
  const [items, files, events] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, id)).orderBy(asc(quoteItems.position)),
    db.select().from(uploads).where(eq(uploads.quoteId, id)),
    db.select().from(quoteEvents).where(eq(quoteEvents.quoteId, id)).orderBy(desc(quoteEvents.createdAt)),
  ]);
  return { quote: row.quotes, customer: row.customers, items, uploads: files, events };
}

export type LoadedQuote = NonNullable<Awaited<ReturnType<typeof loadQuote>>>;
