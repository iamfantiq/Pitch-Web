import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_PREFIX = "local:";
// Statically scoped so build tracing doesn't pull in the whole project.
const localPath = (name: string) => path.join(process.cwd(), ".data", "uploads", path.basename(name));

export function storageAvailable(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || !(process.env.VERCEL || process.env.NETLIFY);
}

/** Stores a customer file. Vercel Blob when configured, local disk in development. Returns a storage URL. */
export async function putFile(filename: string, data: Buffer, contentType: string): Promise<string> {
  const safe = filename.replace(/[^\w.-]+/g, "_").slice(-80);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`logos/${safe}`, data, { access: "public", contentType, addRandomSuffix: true });
    return blob.url;
  }
  const name = `${randomUUID()}-${safe}`;
  await mkdir(path.dirname(localPath(name)), { recursive: true });
  await writeFile(localPath(name), data);
  return `${LOCAL_PREFIX}${name}`;
}

/** Reads a stored file back (admin downloads). */
export async function getFile(url: string): Promise<Buffer> {
  if (url.startsWith(LOCAL_PREFIX)) return readFile(localPath(url.slice(LOCAL_PREFIX.length)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
