"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useDictation } from "@/lib/useSpeech";
import { useSpeechSettings } from "@/lib/speech/useSpeechSettings";

type Props = {
  onSend: (text: string) => void;
  onAttach?: (file: File) => void;
  disabled?: boolean;
};

export default function Composer({ onSend, onAttach, disabled = false }: Props) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);
  const { settings } = useSpeechSettings();

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleFinalTranscript = useCallback(
    (transcript: string) => {
      const merged = valueRef.current ? `${valueRef.current} ${transcript}` : transcript;
      const trimmed = merged.trim();

      if (settings.voiceSend && trimmed) {
        onSend(trimmed);
        setValue("");
        return;
      }

      setValue(trimmed);
    },
    [settings.voiceSend, onSend],
  );

  const { listening, interim, error, supported, toggle, clearError } = useDictation({
    onFinal: handleFinalTranscript,
  });

  const displayValue = listening && interim ? (value ? `${value} ${interim}` : interim) : value;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [displayValue]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="composer-row">
      {error && (
        <div className="composer-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className={`composer ${listening ? "active" : ""}`.trim()}>
        <textarea
          ref={textareaRef}
          className={`txt ${listening && interim ? "interim" : ""}`.trim()}
          rows={1}
          placeholder={
            listening
              ? interim || "Listening…"
              : settings.voiceSend
                ? "Tap mic and speak — sends when you stop"
                : "Ask netbot anything…"
          }
          value={displayValue}
          onChange={(e) => {
            if (!listening) setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Message netbot"
          readOnly={listening && Boolean(interim)}
        />

        {listening && (
          <span className="waveform" title="Listening" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        )}

        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setAttachment(file.name);
            onAttach?.(file);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />

        <button
          type="button"
          className="icobtn"
          title={attachment ?? "Attach a document"}
          aria-label="Attach a document"
          onClick={() => fileRef.current?.click()}
        >
          ＋
        </button>

        <button
          type="button"
          className={`icobtn mic ${listening ? "recording" : ""}`.trim()}
          title={
            !supported
              ? "Speech-to-text not supported in this browser"
              : listening
                ? "Stop listening"
                : "Speech to text — dictate your question"
          }
          aria-label={listening ? "Stop listening" : "Speech to text"}
          aria-pressed={listening}
          onClick={toggle}
          disabled={!supported}
        >
          🎙
        </button>

        <button
          type="button"
          className="icobtn send"
          title="Send"
          aria-label="Send message"
          onClick={submit}
          disabled={disabled || !value.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
