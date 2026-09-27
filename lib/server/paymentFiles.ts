import fs from "node:fs/promises";
import path from "node:path";
import { newUploadId } from "./codes";

/**
 * Payment screenshot storage.
 *
 * Files live under `<repo>/data/payments/<teamId>/<uploadId>.<ext>` — a
 * private server-side directory, never under `public/`. The only way to read
 * one is `GET /api/admin/payments/[id]/screenshot` behind `requireAdmin`.
 * There is deliberately no public URL.
 *
 * Validation: allowlist by magic bytes (not extension), 5 MB cap, executables
 * and SVGs rejected. The client filename is discarded entirely.
 */

export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const ALLOWED: { mime: string; ext: string; magic: number[][] }[] = [
  { mime: "image/png", ext: "png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  { mime: "image/jpeg", ext: "jpg", magic: [[0xff, 0xd8, 0xff]] },
  { mime: "image/webp", ext: "webp", magic: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF....WEBP checked below
];

function sniffMime(buf: Buffer): { mime: string; ext: string } | null {
  for (const a of ALLOWED) {
    if (!a.magic.some((m) => m.every((b, i) => buf[i] === b))) continue;
    if (a.mime === "image/webp") {
      // WEBP signature is RIFF xxxx WEBP — verify the trailer too.
      if (buf.subarray(8, 12).toString("ascii") !== "WEBP") continue;
    }
    return { mime: a.mime, ext: a.ext };
  }
  return null;
}

export type StoredScreenshot = {
  relativePath: string;
  mime: string;
  size: number;
};

export async function storePaymentScreenshot(
  teamId: string,
  file: File,
): Promise<StoredScreenshot> {
  if (file.size <= 0) throw new Error("Payment screenshot is empty.");
  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error("Payment screenshot must be under 5 MB.");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buf);
  if (!sniffed) {
    throw new Error("Payment screenshot must be a PNG, JPEG or WebP image.");
  }

  const dir = path.join(process.cwd(), "data", "payments", teamId);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const relativePath = path.join("data", "payments", teamId, `${newUploadId()}.${sniffed.ext}`);
  await fs.writeFile(path.join(process.cwd(), relativePath), buf, { mode: 0o600 });
  return { relativePath, mime: sniffed.mime, size: buf.length };
}

/** Resolves a stored relative path, refusing anything that escapes data/. */
export async function readPaymentScreenshot(relativePath: string): Promise<{ buf: Buffer; mime: string }> {
  const root = path.join(process.cwd(), "data", "payments");
  const abs = path.resolve(process.cwd(), relativePath);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error("Invalid screenshot path.");
  }
  const buf = await fs.readFile(abs);
  const sniffed = sniffMime(buf);
  if (!sniffed) throw new Error("Stored screenshot failed validation.");
  return { buf, mime: sniffed.mime };
}
