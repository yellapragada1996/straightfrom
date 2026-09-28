import type { Metadata } from "next";
import { LoginForm } from "@/components/creator/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return <LoginForm />;
}
