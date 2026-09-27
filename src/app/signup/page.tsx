import type { Metadata } from "next";
import { LoginForm } from "@/components/creator/login-form";

export const metadata: Metadata = { title: "Sign up", description: "Create your StraightFrom page. It takes about 2 minutes." };

export default function SignupPage() {
  return <LoginForm mode="signup" />;
}
