export type SpeechSupport = {
  stt: boolean;
  tts: boolean;
};

export function getSpeechSupport(): SpeechSupport {
  if (typeof window === "undefined") {
    return { stt: false, tts: false };
  }

  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };

  return {
    stt: Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition),
    tts: "speechSynthesis" in window,
  };
}

export type SpeechErrorCode =
  | "unsupported"
  | "permission-denied"
  | "no-speech"
  | "network"
  | "aborted"
  | "unknown";

export function mapRecognitionError(code?: string): SpeechErrorCode {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission-denied";
    case "no-speech":
      return "no-speech";
    case "network":
    case "network-error":
      return "network";
    case "aborted":
      return "aborted";
    case "audio-capture":
      return "permission-denied";
    default:
      return "unknown";
  }
}

export function speechErrorMessage(code: SpeechErrorCode): string {
  switch (code) {
    case "unsupported":
      return "Speech recognition is not supported in this browser. Try Chrome or Edge.";
    case "permission-denied":
      return "Microphone access was blocked. Allow the mic in your browser settings.";
    case "no-speech":
      return "No speech detected. Try speaking a little louder.";
    case "network":
      return "Could not reach the speech service. Chrome sends audio to Google — allow mic access, disable VPN/ad-blockers, or try again.";
    case "aborted":
      return "Listening stopped.";
    default:
      return "Could not capture speech. Try again.";
  }
}

/** Ask for mic access before Web Speech API — avoids false network/permission errors. */
export async function ensureMicPermission(): Promise<SpeechErrorCode | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "permission-denied";
    }
    if (name === "NotFoundError") {
      return "unknown";
    }
    return null;
  }
}
