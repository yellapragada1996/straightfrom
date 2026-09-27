import type { Metadata } from "next";
import { AdminCreatorDetail } from "@/components/admin/creators";

export const metadata: Metadata = { title: "Creator" };

export default async function AdminCreatorPage({ params }: PageProps<"/admin/creators/[id]">) {
  const { id } = await params;
  return <AdminCreatorDetail id={id} />;
}
