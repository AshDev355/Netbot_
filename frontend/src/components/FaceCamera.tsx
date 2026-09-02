"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

type Props = {
  active: boolean;
};

export type FaceCameraHandle = {
  /** Grabs the current video frame as a JPEG Blob, or null if the camera isn't live. */
  capture: () => Promise<Blob | null>;
};

const FaceCamera = forwardRef<FaceCameraHandle, Props>(function FaceCamera({ active }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "live" | "denied" | "missing">("idle");

  useImperativeHandle(
    ref,
    () => ({
      capture: () =>
        new Promise((resolve) => {
          const video = videoRef.current;
          if (!video || status !== "live" || !video.videoWidth) {
            resolve(null);
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
        }),
    }),
    [status],
  );

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus("idle");
      return;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("missing");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setStatus("live");
        }
      } catch {
        setStatus("denied");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [active]);

  return (
    <>
      <video
        ref={videoRef}
        className={`face-video ${status === "live" ? "live" : ""}`.trim()}
        playsInline
        muted
        aria-hidden="true"
      />

      {status === "denied" && (
        <div className="face-camera-msg">
          <b>Camera blocked</b>
          <span>Allow camera access in your browser to capture your face.</span>
        </div>
      )}

      {status === "missing" && (
        <div className="face-camera-msg">
          <b>No camera found</b>
          <span>Connect a webcam or use a device with a front camera.</span>
        </div>
      )}
    </>
  );
});

export default FaceCamera;
