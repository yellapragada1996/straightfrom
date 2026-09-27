import type { Metadata } from "next";
import { AdminOrderDetail } from "@/components/admin/orders";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: id };
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  return <AdminOrderDetail id={id} />;
}
