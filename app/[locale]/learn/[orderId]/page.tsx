import { notFound } from "next/navigation";
import { verifyAccess } from "@/lib/fulfillment";
import { CourseViewer } from "@/components/learn/CourseViewer";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();
  const order = await verifyAccess(orderId);
  if (!order || order.products.type !== "course") notFound();

  const modules =
    ((order.products.config?.modules ?? []) as {
      title: string;
      lessons: { title: string; video_url?: string; text?: string }[];
    }[]) ?? [];

  return (
    <div className="min-h-dvh bg-bg">
      <CourseViewer title={order.products.title} modules={modules} />
    </div>
  );
}
