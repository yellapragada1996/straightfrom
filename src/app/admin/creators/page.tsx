import type { Metadata } from "next";
import { AdminCreators } from "@/components/admin/creators";

export const metadata: Metadata = { title: "Creators" };

export default function AdminCreatorsPage() {
  return <AdminCreators />;
}
