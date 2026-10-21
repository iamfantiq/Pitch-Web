import { after, NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { createQuote, deliverQuote, RateLimitedError } from "@/lib/quote/service";
import { quoteRequestSchema } from "@/lib/quote/schema";
import { clientIp, hashIp, verifyTurnstile } from "@/lib/spam";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  }

  const ip = clientIp(request.headers);
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
    return NextResponse.json({ error: "captcha" }, { status: 400 });
  }

  const db = await getDb();
  try {
    const quote = await createQuote(db, parsed.data, hashIp(ip));
    // PDF + emails after the response, so the customer isn't kept waiting.
    after(async () => {
      try {
        await deliverQuote(db, quote.id, { notifyOwner: true });
      } catch (error) {
        console.error(`[quotes] delivering ${quote.number} failed`, error);
      }
    });
    return NextResponse.json({ ok: true, number: quote.number });
  } catch (error) {
    if (error instanceof RateLimitedError) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    console.error("[quotes] create failed", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
