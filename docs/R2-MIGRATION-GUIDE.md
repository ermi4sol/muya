# MUYA — Cloudflare R2 Migration Guide (if Supabase Storage runs out)

MUYA stores files in Supabase Storage: `store-images` (public — product/profile images) and `product-files` (private — digital downloads, delivered via signed URLs). The free Supabase plan includes **1 GB storage and ~5 GB egress/month**. This guide is the step-by-step switch to **Cloudflare R2** (10 GB storage free, zero egress fees) when you approach those limits.

## Part 1 — How to know it's time

1. Supabase dashboard → **Settings → Usage**: watch **Storage size** and **Egress**.
2. Warning signs: storage above ~800 MB, or egress warnings in the monthly email Supabase sends.
3. You do NOT need to move the database — only file storage. Everything else stays on Supabase.

## Part 2 — Create the R2 bucket

1. Sign up at **dash.cloudflare.com** (free plan is fine; R2 asks for a card but the free tier costs nothing until you exceed it).
2. Left menu → **R2 Object Storage** → **Create bucket**:
   - `muya-product-files` (private — this is the important one)
   - `muya-store-images` (for public images; connect a public bucket URL or custom domain in the bucket's settings → Public access)
3. Note your **Account ID** (shown on the R2 overview page).

## Part 3 — Create the API token

1. R2 overview → **Manage R2 API Tokens** → **Create API Token**.
2. Permissions: **Object Read & Write**, scoped to the two buckets. Create.
3. Copy the **Access Key ID** and **Secret Access Key** (shown once).

## Part 4 — Environment variables

Add in Netlify (and redeploy after):

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | from Part 3 |
| `R2_SECRET_ACCESS_KEY` | from Part 3 |
| `R2_BUCKET` | `muya-product-files` |
| `R2_PUBLIC_BUCKET` | `muya-store-images` |
| `R2_PUBLIC_URL` | the public bucket URL (e.g. `https://pub-xxxx.r2.dev`) |

## Part 5 — Migrate the existing files (zero downtime order)

R2 speaks the S3 protocol, so the standard tool is **rclone** (free):

1. Install rclone locally, configure two remotes: `supabase` (S3-compatible endpoint from Supabase Storage settings) and `r2` (endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
2. Copy while the old storage keeps serving (nothing breaks during this):
   - `rclone copy supabase:product-files r2:muya-product-files --progress`
   - `rclone copy supabase:store-images r2:muya-store-images --progress`
3. Re-run the same commands right before the switch — rclone only copies what changed.

## Part 6 — Flip the code (tell Claude "switch storage to R2")

The storage touchpoints are isolated in four places, so the swap is small and reversible:

1. `/api/creator/upload` (public images) → upload via S3 API to `R2_PUBLIC_BUCKET`, return `R2_PUBLIC_URL` links.
2. `/api/creator/upload-file` (private product files) → upload to `R2_BUCKET`.
3. `/api/download/[orderId]` → generate an S3 **presigned GET URL** (10 min) instead of a Supabase signed URL.
4. Old records: files already migrated keep their stored paths — the download route tries R2 first and falls back to Supabase, so nothing old breaks while you finish migrating.

Existing public image URLs (Supabase links saved in products/profiles) keep working as long as the Supabase project exists; a one-time script can rewrite them to R2 URLs after Part 5.

## Part 7 — Verify, then clean up

1. Upload a new product image and a new digital file → confirm they land in R2 (Cloudflare dashboard shows the objects).
2. Buy + approve a test order → confirm the download comes from an `r2.cloudflarestorage.com` presigned link.
3. After 2–4 weeks of stable operation, delete the migrated files from Supabase Storage to free the space.
