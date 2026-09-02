import type { Metadata } from "next";
import SignUpPageClient from "./SignUpPageClient";

export const metadata: Metadata = {
  title: "Create account · netbot",
};

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <SignUpPageClient />
    </div>
  );
}
