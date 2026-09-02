"use client";

import { getSpeechSupport } from "@/lib/speech/support";
import { useSpeechSettings } from "@/lib/speech/useSpeechSettings";

type Props = {
  isSpeaking: boolean;
  onStopSpeaking: () => void;
};

export default function SpeechControls({ isSpeaking, onStopSpeaking }: Props) {
  const { settings, update } = useSpeechSettings();
  const support = getSpeechSupport();

  return (
    <div className="speech-controls">
      <button
        type="button"
        className={`speech-pill ${settings.autoReadReplies ? "on" : ""}`.trim()}
        onClick={() => update({ autoReadReplies: !settings.autoReadReplies })}
        disabled={!support.tts}
        title={support.tts ? "Read bot replies aloud automatically" : "Text-to-speech not supported"}
        aria-pressed={settings.autoReadReplies}
      >
        🔊 Auto-read
      </button>

      <button
        type="button"
        className={`speech-pill ${settings.voiceSend ? "on" : ""}`.trim()}
        onClick={() => update({ voiceSend: !settings.voiceSend })}
        disabled={!support.stt}
        title={support.stt ? "Send message automatically after you finish speaking" : "Speech-to-text not supported"}
        aria-pressed={settings.voiceSend}
      >
        🎙 Voice send
      </button>

      {isSpeaking && (
        <button type="button" className="speech-pill stop" onClick={onStopSpeaking}>
          ■ Stop audio
        </button>
      )}
    </div>
  );
}
