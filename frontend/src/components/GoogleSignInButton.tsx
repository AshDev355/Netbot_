"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NetBotApiError } from "@/lib/api";

type CredentialResponse = { credential: string };

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      shape?: "rectangular" | "pill" | "circle" | "square";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      width?: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

type Props = {
  /** Matches Google's own button copy options -- pick whichever fits the screen. */
  text?: "signin_with" | "signup_with" | "continue_with";
  onError?: (message: string) => void;
};

/**
 * Renders Google's own "Sign in with Google" button (via Google Identity
 * Services) and wires its result into our /auth/google endpoint. Renders
 * nothing if NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set, so it's safe to drop
 * into a screen unconditionally.
 */
export default function GoogleSignInButton({ text = "continue_with", onError }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { googleAuth } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;
    let cancelled = false;

    async function handleCredential(response: CredentialResponse) {
      setLoading(true);
      try {
        await googleAuth(response.credential);
        router.replace("/chat");
      } catch (err) {
        onError?.(
          err instanceof NetBotApiError
            ? err.message
            : "Couldn't sign in with Google. Try again.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          width: 320,
        });
      })
      .catch(() => onError?.("Couldn't load Google sign-in. Check your connection."));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!CLIENT_ID) return null;

  return (
    <div className={`google-btn-wrap ${loading ? "busy" : ""}`.trim()}>
      <div ref={containerRef} />
    </div>
  );
}
