import type { Metadata } from "next";
import { ItemEditor } from "@/components/creator/item-editor";

export const metadata: Metadata = { title: "Edit piece" };

export default async function EditItemPage({ params }: PageProps<"/dashboard/items/[id]">) {
  const { id } = await params;
  return <ItemEditor id={id} />;
}
