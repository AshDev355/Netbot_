import type { Metadata } from "next";
import AuthGuard from "@/components/AuthGuard";
import ChatScreen from "@/components/screens/ChatScreen";

export const metadata: Metadata = {
  title: "Workspace · netbot",
};

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatScreen />
    </AuthGuard>
  );
}
