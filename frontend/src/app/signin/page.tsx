import type { Metadata } from "next";
import SignInScreen from "@/components/screens/SignInScreen";

export const metadata: Metadata = {
  title: "Sign in · netbot",
};

export default function SignInPage() {
  return (
    <div className="auth-page">
      <SignInScreen />
    </div>
  );
}
