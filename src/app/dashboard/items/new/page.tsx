import type { Metadata } from "next";
import { ItemEditor } from "@/components/creator/item-editor";

export const metadata: Metadata = { title: "New item" };

export default function NewItemPage() {
  return <ItemEditor />;
}
