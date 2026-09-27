import type { Metadata } from "next";
import { EarningsView } from "@/components/creator/earnings-view";

export const metadata: Metadata = { title: "Earnings" };

export default function EarningsPage() {
  return <EarningsView />;
}
