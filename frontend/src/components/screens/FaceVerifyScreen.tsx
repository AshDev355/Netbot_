"use client";

import { useEffect, useRef, useState } from "react";
import FaceCamera, { type FaceCameraHandle } from "@/components/FaceCamera";
import { useAuth } from "@/lib/auth-context";
import { NetBotApiError } from "@/lib/api";

// Give the camera a moment to settle before we snap the verification frame.
const SETTLE_MS = 1200;
const TICK_MS = 40;

type Props = {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
};

type Phase = "scanning" | "verifying" | "matched" | "failed";

export default function FaceVerifyScreen({ email, onSuccess, onCancel }: Props) {
  const { faceLogin } = useAuth();
  const cameraRef = useRef<FaceCameraHandle | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("scanning");
  const [error, setError] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);

  useEffect(() => {
    const increment = 100 / (SETTLE_MS / TICK_MS);
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          window.clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress < 100 || phase !== "scanning") return;

    let cancelled = false;
    setPhase("verifying");

    (async () => {
      const frame = await cameraRef.current?.capture();
      if (!frame) {
        if (!cancelled) {
          setError("Couldn't read your camera. Make sure it's enabled and try again.");
          setPhase("failed");
        }
        return;
      }
      try {
        const matchSimilarity = await faceLogin(email, frame);
        if (cancelled) return;
        setSimilarity(matchSimilarity);
        setPhase("matched");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof NetBotApiError
            ? err.message
            : "Face verification failed. Check your connection and try again.",
        );
        setPhase("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [progress, phase, email, faceLogin]);

  useEffect(() => {
    if (phase !== "matched") return;
    const t = window.setTimeout(onSuccess, 900);
    return () => window.clearTimeout(t);
  }, [phase, onSuccess]);

  const complete = progress >= 100;

  return (
    <div className="face-full face-verify">
      <div className="face-copy">
        <div className="face-step">
          {phase === "matched" ? "Verified" : phase === "failed" ? "Not verified" : "Face ID"}
        </div>

        {phase === "matched" ? (
          <>
            <h3>
              Welcome
              <br />
              <b>back.</b>
            </h3>
            <p>
              Face matched{similarity !== null ? ` at ${Math.round(similarity * 100)}%` : ""}. Opening your
              workspace…
            </p>
          </>
        ) : phase === "failed" ? (
          <>
            <h3>
              Couldn&apos;t
              <br />
              <b>verify you.</b>
            </h3>
            <p>{error}</p>
          </>
        ) : (
          <>
            <h3>
              Look at the
              <br />
              <b>camera.</b>
            </h3>
            <p>Hold still while we verify your face. Well-lit, face inside the frame.</p>
          </>
        )}

        <div className="face-actions">
          {phase === "scanning" && (
            <>
              <button type="button" className="btn on-dark" disabled={!complete}>
                {complete ? "Verifying…" : "Scanning…"}
              </button>
              <button type="button" className="btn on-dark-ghost" onClick={onCancel}>
                Use password instead
              </button>
            </>
          )}
          {phase === "verifying" && (
            <button type="button" className="btn on-dark" disabled>
              Verifying…
            </button>
          )}
          {phase === "failed" && (
            <>
              <button
                type="button"
                className="btn on-dark"
                onClick={() => {
                  setError(null);
                  setProgress(0);
                  setPhase("scanning");
                }}
              >
                Try again
              </button>
              <button type="button" className="btn on-dark-ghost" onClick={onCancel}>
                Use password instead
              </button>
            </>
          )}
        </div>
      </div>

      <div className="face-visual">
        <div className={`face-circle ${phase === "matched" ? "matched" : ""}`.trim()}>
          <FaceCamera ref={cameraRef} active={phase === "scanning" || phase === "verifying"} />
          <div className="face-scan" aria-hidden="true" />
          <div className="face-outline" aria-hidden="true" />
          <div className="face-corners" aria-hidden="true" />
          <div
            className="face-percent"
            role="progressbar"
            aria-valuenow={Math.round(phase === "matched" ? 100 : progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {phase === "matched" ? (
              <>
                <b>✓</b>
                <span className="lbl">Matched</span>
              </>
            ) : phase === "failed" ? (
              <>
                <b>✕</b>
                <span className="lbl">Failed</span>
              </>
            ) : (
              <>
                <b>{Math.round(progress)}</b>%
                <span className="lbl">{phase === "verifying" ? "Verifying" : "Scanning"}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
