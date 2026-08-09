import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
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

  return <ProductBuilder initial={{ type }} />;
}
