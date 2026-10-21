import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { uploads } from "@/lib/db/schema";
import { putFile, storageAvailable } from "@/lib/storage";

/** Logos and artwork. Kept under the 4.5 MB serverless request limit. */
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf", "application/postscript", "application/illustrator"]);

export async function POST(request: NextRequest) {
  if (!storageAvailable()) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "type" }, { status: 415 });

  const url = await putFile(file.name, Buffer.from(await file.arrayBuffer()), file.type);
  const db = await getDb();
  const [row] = await db
    .insert(uploads)
    .values({ filename: file.name.slice(0, 200), contentType: file.type, size: file.size, url })
    .returning({ id: uploads.id, filename: uploads.filename });
  return NextResponse.json({ ok: true, id: row!.id, filename: row!.filename });
}
