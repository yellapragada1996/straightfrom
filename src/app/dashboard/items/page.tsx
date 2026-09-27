import type { Metadata } from "next";
import { ItemsList } from "@/components/creator/items-list";

export const metadata: Metadata = { title: "Your pieces" };

export default function ItemsPage() {
  return <ItemsList />;
}
