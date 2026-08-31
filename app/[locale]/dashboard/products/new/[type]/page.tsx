import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { PRODUCT_TYPES } from "@/lib/db/products";
import { ProductBuilder } from "@/components/dashboard/ProductBuilder";

export default async function NewTypedProductPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const { type } = await params;
  if (!(PRODUCT_TYPES as readonly string[]).includes(type)) notFound();

  const { data: others } = await supabaseAdmin()
    .from("products")
    .select("id, title")
    .eq("creator_id", session.sub)
    .eq("status", "active")
    .order("sort_order");

  return (
    <ProductBuilder
      initial={{ type }}
      bumpOptions={(others ?? []).map((p) => ({ id: p.id, title: p.title ?? "" }))}
    />
  );
}
