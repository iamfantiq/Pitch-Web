import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
}

export type SendResult = { ok: true; id: string | null; transport: "resend" | "outbox" } | { ok: false; error: string };

/**
 * Sends through Resend when RESEND_API_KEY is set. Otherwise (development, tests) the email and its
 * attachments are written to .data/outbox so nothing is lost and the flow can be inspected.
 */
export async function sendEmail(email: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Offers <onboarding@resend.dev>";

  if (key) {
    try {
      const { Resend } = await import("resend");
      const { data, error } = await new Resend(key).emails.send({
        from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: email.replyTo,
        attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id ?? null, transport: "resend" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (process.env.VERCEL || process.env.NETLIFY) {
    console.warn(`[email] RESEND_API_KEY is not set — not sending "${email.subject}" to ${email.to}.`);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const dir = process.env.OUTBOX_DIR ?? path.join(process.cwd(), ".data/outbox");
  const stamp = `${Date.now()}-${email.to.replace(/[^a-z0-9@.]/gi, "_")}`;
  await mkdir(dir, { recursive: true });
  const { attachments, ...rest } = email;
  await writeFile(path.join(dir, `${stamp}.json`), JSON.stringify({ from, ...rest, attachments: attachments?.map((a) => a.filename) }, null, 2));
  for (const a of attachments ?? []) await writeFile(path.join(dir, `${stamp}-${a.filename}`), a.content);
  console.info(`[email] outbox: "${email.subject}" → ${email.to}`);
  return { ok: true, id: null, transport: "outbox" };
}
