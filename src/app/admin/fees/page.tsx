import type { Metadata } from "next";
import { AdminFees } from "@/components/admin/fees";

export const metadata: Metadata = { title: "Fees" };

export default function AdminFeesPage() {
  return <AdminFees />;
}
