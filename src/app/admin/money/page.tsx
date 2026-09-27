import type { Metadata } from "next";
import { AdminMoney } from "@/components/admin/money";

export const metadata: Metadata = { title: "Money" };

export default function AdminMoneyPage() {
  return <AdminMoney />;
}
