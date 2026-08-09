import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import { getProductWithPhysical } from "@/lib/db/products";
import {
  ProductBuilder,
  type BuilderInitial,
} from "@/components/dashboard/ProductBuilder";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const { id } = await params;

  const full = await getProductWithPhysical(id);
  if (!full || full.product.creator_id !== session.sub) notFound();

  const initial: BuilderInitial = {
    id: full.product.id,
    type: full.product.type,
    title: full.product.title,
    description: full.product.description ?? "",
    price: Number(full.product.price),
    status: full.product.status,
    is_recurring: full.product.is_recurring,
    billing_interval: full.product.billing_interval,
    config: full.product.config ?? {},
    attributes: full.attributes,
    variants: full.variants as BuilderInitial["variants"],
  };

  return <ProductBuilder initial={initial} />;
}
