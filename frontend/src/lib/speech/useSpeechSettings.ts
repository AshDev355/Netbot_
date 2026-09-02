"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SPEECH_SETTINGS,
  readSpeechSettings,
  writeSpeechSettings,
  type SpeechSettings,
} from "@/lib/speech/settings";

export function useSpeechSettings() {
  const [settings, setSettings] = useState<SpeechSettings>(DEFAULT_SPEECH_SETTINGS);

  useEffect(() => {
    setSettings(readSpeechSettings());
  }, []);

  const update = useCallback((patch: Partial<SpeechSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeSpeechSettings(next);
      return next;
    });
  }, []);

  return { settings, update };
}
