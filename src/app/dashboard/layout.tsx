import type { Metadata } from "next";
import { DashboardShell } from "@/components/creator/dashboard-shell";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · StraightFrom" }, robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <DashboardShell>{children}</DashboardShell>;
}
