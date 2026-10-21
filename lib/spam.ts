import "server-only";
import { createHash } from "node:crypto";

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/** Salted hash so raw IP addresses are never stored. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.RATE_LIMIT_SALT ?? "pitch-web"}:${ip}`).digest("hex").slice(0, 32);
}

/** Cloudflare Turnstile check. Skipped (passes) when TURNSTILE_SECRET_KEY isn't configured. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const rateLimit = { maxQuotes: Number(process.env.QUOTE_RATE_LIMIT ?? 3), windowMinutes: 10 };
