"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureMicPermission,
  getSpeechSupport,
  mapRecognitionError,
  speechErrorMessage,
  type SpeechErrorCode,
} from "@/lib/speech/support";
import { pickPreferredVoice, textForSpeech } from "@/lib/speech/text";

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type RecognitionErrorEvent = {
  error?: string;
};

/** Minimal Web Speech API recognition shape (not fully typed in lib.dom). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type DictationOptions = {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
};

/**
 * Speech-to-text for the composer mic.
 * Supports live interim transcripts and clear error states.
 */
export function useDictation({ onFinal, onInterim }: DictationOptions) {
  const support = getSpeechSupport();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const retryCountRef = useRef(0);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  const stop = useCallback(() => {
    retryCountRef.current = 0;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const launchRecognition = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError(speechErrorMessage("unsupported"));
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      retryCountRef.current = 0;
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }

      if (interimText) {
        setInterim(interimText);
        onInterimRef.current?.(interimText);
      }

      if (finalText.trim()) {
        onFinalRef.current(finalText.trim());
        setInterim("");
      }
    };

    recognition.onerror = (event) => {
      const code = mapRecognitionError(event.error);

      if (code === "network" && retryCountRef.current < 2) {
        retryCountRef.current += 1;
        recognitionRef.current = null;
        window.setTimeout(() => launchRecognition(), 600);
        return;
      }

      retryCountRef.current = 0;
      if (code !== "aborted") {
        setError(speechErrorMessage(code));
      }
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setListening(false);
        setInterim("");
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      retryCountRef.current = 0;
      setError(speechErrorMessage("unknown"));
      setListening(false);
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setInterim("");
    retryCountRef.current = 0;

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError(speechErrorMessage("unsupported"));
      return;
    }

    const micError = await ensureMicPermission();
    if (micError) {
      setError(speechErrorMessage(micError));
      return;
    }

    launchRecognition();
  }, [launchRecognition]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return {
    listening,
    interim,
    error,
    supported: support.stt,
    toggle,
    stop,
    clearError,
  };
}

/** Text-to-speech for reading bot answers aloud. */
export function useSpeaker(autoReadEnabled: boolean) {
  const support = getSpeechSupport();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const autoReadRef = useRef(autoReadEnabled);

  useEffect(() => {
    autoReadRef.current = autoReadEnabled;
  }, [autoReadEnabled]);

  useEffect(() => {
    if (!support.tts) return;

    function loadVoices() {
      voiceRef.current = pickPreferredVoice(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [support.tts]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (id: string, text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const prepared = textForSpeech(text);
      if (!prepared) return;

      window.speechSynthesis.cancel();

      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(prepared);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [speakingId],
  );

  const speakIfAutoRead = useCallback(
    (id: string, text: string) => {
      if (autoReadRef.current) speak(id, text);
    },
    [speak],
  );

  useEffect(() => () => stop(), [stop]);

  return {
    speakingId,
    speak,
    speakIfAutoRead,
    stop,
    supported: support.tts,
    isSpeaking: speakingId !== null,
  };
}

export type { SpeechErrorCode };
