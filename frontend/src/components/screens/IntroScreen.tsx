"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "orbit" | "settle" | "reveal" | "done";

export default function IntroScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("orbit");

  useEffect(() => {
    const settle = window.setTimeout(() => setPhase("settle"), 1200);
    const reveal = window.setTimeout(() => setPhase("reveal"), 2400);
    const done = window.setTimeout(() => setPhase("done"), 3200);
    const redirect = window.setTimeout(() => router.replace("/signin"), 4200);

    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(reveal);
      window.clearTimeout(done);
      window.clearTimeout(redirect);
    };
  }, [router]);

  return (
    <section className={`intro ${phase}`}>
      <div className="intro-mesh" aria-hidden="true" />
      <div className="intro-grid" aria-hidden="true" />

      <div className="intro-orbit-wrap" aria-hidden="true">
        <span className="intro-orbit-ring" />
        <span className="intro-orbit-ring slow" />
      </div>

      <div className="intro-content">
        <h1 className={`wordmark intro-wordmark ${phase}`} aria-label="netbot">
          <span className="net">net</span>
          <span className="b">b</span>
          <span className="o-orb intro-orb" />
          <span className="t">t</span>
          <span className="dot" />
        </h1>

        <p className={`intro-tagline ${phase === "reveal" || phase === "done" ? "show" : ""}`.trim()}>
          Your knowledge, <em>on speaking terms.</em>
        </p>

        {phase === "done" && (
          <p className="intro-hint" role="status">
            Taking you to sign in…
          </p>
        )}
      </div>
    </section>
  );
}
