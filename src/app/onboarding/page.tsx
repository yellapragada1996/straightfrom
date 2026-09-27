import type { Metadata } from "next";
import { Onboarding } from "@/components/creator/onboarding";

export const metadata: Metadata = { title: "Create your page", robots: { index: false } };

export default function OnboardingPage() {
  return <Onboarding />;
}
