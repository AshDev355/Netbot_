import type { Metadata } from "next";
import AuthGuard from "@/components/AuthGuard";
import ProfileScreen from "@/components/screens/ProfileScreen";

export const metadata: Metadata = {
  title: "Profile · netbot",
};

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileScreen />
    </AuthGuard>
  );
}
