import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

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
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "bad_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `creators/${session.sub}/${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const db = supabaseAdmin();
  const { error } = await db.storage
    .from("store-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json(
      { error: "upload_failed", detail: error.message },
      { status: 502 }
    );
  }
  const { data } = db.storage.from("store-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
