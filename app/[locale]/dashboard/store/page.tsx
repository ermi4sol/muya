import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import { getCreator, getCreatorProducts } from "@/lib/db/creator";
import { MyStoreEditor } from "@/components/dashboard/MyStoreEditor";

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  if (!creator.display_name) redirect("/dashboard/onboarding");
  const [products, { tab }] = await Promise.all([
    getCreatorProducts(creator.id),
    searchParams,
  ]);

  return (
    <MyStoreEditor creator={creator} products={products} initialTab={tab} />
  );
}
