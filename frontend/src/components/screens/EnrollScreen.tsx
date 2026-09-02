"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FaceCamera, { type FaceCameraHandle } from "@/components/FaceCamera";
import { ENROLL_STEPS } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { NetBotApiError } from "@/lib/api";

const CAPTURE_MS = 1600; // time given to hold still before we grab the frame
const TICK_MS = 40;

type Props = {
  onComplete?: () => void;
  autoStart?: boolean;
};

export default function EnrollScreen({ onComplete, autoStart = true }: Props) {
  const router = useRouter();
  const { completeSignup } = useAuth();
  const cameraRef = useRef<FaceCameraHandle | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [capturing, setCapturing] = useState(autoStart);
  const [done, setDone] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!capturing || done || finishing) return;

    const increment = 100 / (CAPTURE_MS / TICK_MS);
    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearTimer();
          setCapturing(false);
          return 100;
        }
        return next;
      });
    }, TICK_MS);

    return clearTimer;
  }, [capturing, stepIndex, done, finishing, clearTimer]);

  const step = ENROLL_STEPS[stepIndex];
  const isLast = stepIndex === ENROLL_STEPS.length - 1;
  const captureComplete = progress >= 100;

  function goToStep(index: number) {
    clearTimer();
    setFinishing(false);
    setError(null);
    setStepIndex(index);
    setProgress(0);
    setCapturing(true);
    setDone(false);
  }

  async function finish(blob: Blob) {
    setFinishing(true);
    setError(null);
    try {
      await completeSignup(blob);
      setDone(true);
      window.setTimeout(() => {
        if (onComplete) onComplete();
        else router.replace("/chat");
      }, 900);
    } catch (err) {
      const message =
        err instanceof NetBotApiError
          ? err.message
          : "Could not create your account. Check your connection and try again.";
      setError(message);
      setFinishing(false);
      setCapturing(false);
    }
  }

  async function handleNext() {
    if (!captureComplete) return;

    // Only the first (center/frontal) pose is actually submitted -- the
    // backend accepts a single enrollment image. The left/right steps are
    // a guided UX to help the user hold a good frontal pose, not separate
    // uploads.
    if (stepIndex === 0) {
      const frame = await cameraRef.current?.capture();
      if (!frame) {
        setError("Couldn't capture your camera frame. Make sure your camera is enabled and try again.");
        return;
      }
      setCapturedBlob(frame);
    }

    if (isLast) {
      if (!capturedBlob) {
        setError("Couldn't capture your camera frame. Make sure your camera is enabled and try again.");
        return;
      }
      await finish(capturedBlob);
      return;
    }

    goToStep(stepIndex + 1);
  }

  return (
    <div className="face-full">
      <div className="face-copy">
        <div className="face-step">
          {done ? "All set" : `Step ${stepIndex + 1} of ${ENROLL_STEPS.length}`}
        </div>

        {done ? (
          <>
            <h3>
              Face ID is
              <br />
              <b>ready to go.</b>
            </h3>
            <p>Enrollment complete. Taking you to netbot…</p>
          </>
        ) : (
          <>
            <h3>
              {step.heading[0]}
              <br />
              <b>{step.heading[1]}</b>
            </h3>
            <p>{step.copy}</p>
          </>
        )}

        {error && <div className="field-error">{error}</div>}

        <div className="steps">
          {ENROLL_STEPS.map((s, i) => {
            const state = done || i < stepIndex ? "done" : i === stepIndex ? "on" : "";
            return (
              <button
                key={s.id}
                type="button"
                className={`stepdot ${state}`.trim()}
                onClick={() => goToStep(i)}
                aria-label={`Recapture ${s.label}`}
                disabled={finishing}
              >
                <span className="b" aria-hidden="true" />
                <small>{s.label}</small>
              </button>
            );
          })}
        </div>

        <div className="face-actions">
          {done ? (
            <button type="button" className="btn on-dark" disabled>
              Opening netbot…
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn on-dark"
                onClick={handleNext}
                disabled={!captureComplete || finishing}
              >
                {finishing
                  ? "Creating account…"
                  : captureComplete
                    ? isLast
                      ? "Finish enrollment"
                      : "Next capture"
                    : "Capturing…"}
              </button>
              <button
                type="button"
                className="btn on-dark-ghost"
                onClick={() => goToStep(stepIndex)}
                disabled={!captureComplete || finishing}
              >
                Retake
              </button>
            </>
          )}
        </div>
      </div>

      <div className="face-visual">
        <div className={`face-circle ${done ? "matched" : ""}`.trim()}>
          <FaceCamera ref={cameraRef} active={!done} />
          <div className="face-scan" aria-hidden="true" />
          <div className="face-outline" aria-hidden="true" />
          <div className="face-corners" aria-hidden="true" />
          <div
            className="face-percent"
            role="progressbar"
            aria-valuenow={Math.round(done ? 100 : progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {done ? (
              <>
                <b>✓</b>
                <span className="lbl">Enrolled</span>
              </>
            ) : (
              <>
                <b>{Math.round(progress)}</b>%
                <span className="lbl">{captureComplete ? "Captured" : "Capturing"}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
