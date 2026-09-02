"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { authed, ready } = useAuth();

  useEffect(() => {
    if (ready && !authed) router.replace("/signin");
  }, [authed, ready, router]);

  if (!ready || !authed) return null;
  return <>{children}</>;
}
