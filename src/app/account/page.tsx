import type { Metadata } from "next";
import { FanAccount } from "@/components/fan/fan-account";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

export default function AccountPage() {
  return (
    <>
      <TopBar share={false} />
      <main className="flex-1">
        <FanAccount />
      </main>
    </>
  );
}
