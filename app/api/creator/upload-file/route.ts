import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

// Digital product files — stored in the PRIVATE bucket, delivered to buyers
// via short-lived signed URLs after an entitlement check (Phase 8).
const ALLOWED = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const MAX_BYTES = 50 * 1024 * 1024;
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|msi|apk|js|jar|com|scr|ps1|vbs)$/i;

export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type) || BLOCKED_EXT.test(file.name)) {
    return NextResponse.json({ error: "bad_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `creators/${session.sub}/${randomUUID()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin()
    .storage.from("product-files")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json(
      { error: "upload_failed", detail: error.message },
      { status: 502 }
    );
  }
  // Return the private storage path (NOT a public URL)
  return NextResponse.json({ path, name: file.name, size: file.size });
}
