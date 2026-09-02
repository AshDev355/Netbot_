export type SpeechSettings = {
  autoReadReplies: boolean;
  voiceSend: boolean;
};

export const SPEECH_SETTINGS_KEY = "netbot-speech-settings";

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  autoReadReplies: true,
  voiceSend: false,
};

export function readSpeechSettings(): SpeechSettings {
  if (typeof window === "undefined") return DEFAULT_SPEECH_SETTINGS;
  try {
    // Use localStorage so preferences survive tab/browser close
    const raw = localStorage.getItem(SPEECH_SETTINGS_KEY);
    if (!raw) return DEFAULT_SPEECH_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SpeechSettings>;
    return {
      autoReadReplies: parsed.autoReadReplies ?? DEFAULT_SPEECH_SETTINGS.autoReadReplies,
      voiceSend: parsed.voiceSend ?? DEFAULT_SPEECH_SETTINGS.voiceSend,
    };
  } catch {
    return DEFAULT_SPEECH_SETTINGS;
  }
}

export function writeSpeechSettings(settings: SpeechSettings) {
  try {
    localStorage.setItem(SPEECH_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors (private browsing etc.)
  }
}
