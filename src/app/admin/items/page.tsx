import type { Metadata } from "next";
import { AdminItems } from "@/components/admin/items";

export const metadata: Metadata = { title: "Items" };

export default async function AdminItemsPage({ searchParams }: PageProps<"/admin/items">) {
  const { q } = await searchParams;
  return <AdminItems key={typeof q === "string" ? q : ""} initialQuery={typeof q === "string" ? q : ""} />;
}
