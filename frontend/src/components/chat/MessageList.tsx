"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

type Props = {
  messages: Message[];
  speakingId: string | null;
  onSpeak: (message: Message) => void;
  onCiteClick: (cite: string) => void;
};

const TOOL_LABELS: Record<string, string> = {
  calculator: "🧮 Calculator",
  web_search: "🔍 Web search",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? `🔧 ${name}`;
}

/**
 * Converts a plain-text bot reply into safe HTML:
 * - Preserves newlines as <br>
 * - **bold**, *italic*, `inline code`, ```code blocks```
 * - Bulleted and numbered lists
 */
function renderBotText(text: string): string {
  // 1. Isolate ```code blocks``` first (before HTML escaping)
  const BLOCK_PLACEHOLDER = "\x00CODEBLOCK\x00";
  const codeBlocks: string[] = [];

  let html = text.replace(/```[\w]*\n?([\s\S]*?)```/g, (_m, code) => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    codeBlocks.push(`<pre><code>${escaped.trimEnd()}</code></pre>`);
    return BLOCK_PLACEHOLDER;
  });

  // 2. HTML-escape everything outside code blocks
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 3. Re-insert code blocks (already escaped inside)
  codeBlocks.forEach((block) => {
    html = html.replace(BLOCK_PLACEHOLDER, block);
  });

  // 4. Inline markdown
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 5. Lists — collect consecutive list lines into <ul>
  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const bullet = line.match(/^[ \t]*[-*][ \t]+(.+)/);
    const numbered = line.match(/^[ \t]*\d+\.[ \t]+(.+)/);
    if (bullet || numbered) {
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${(bullet ?? numbered)![1]}</li>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(line);
    }
  }
  if (inList) result.push("</ul>");

  // 6. Newlines → <br> (skip inside block-level tags)
  html = result.join("\n");
  html = html
    .split(/(<pre>[\s\S]*?<\/pre>|<ul>[\s\S]*?<\/ul>)/g)
    .map((seg, i) => (i % 2 === 0 ? seg.replace(/\n/g, "<br>") : seg))
    .join("");

  return html;
}

export default function MessageList({ messages, speakingId, onSpeak, onCiteClick }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const userInitial = (user?.email.charAt(0) || "U").toUpperCase();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="messages">
      {messages.map((message) => (
        <div key={message.id} className={`msg ${message.role}`}>
          <div className="av" aria-hidden="true">
            {message.role === "user" ? userInitial : "N"}
          </div>

          <div className="bubble">
            {message.pending ? (
              <span className="typing" role="status" aria-label="netbot is thinking">
                <i /><i /><i />
              </span>
            ) : message.role === "bot" ? (
              <>
                {/* Render bot markdown as safe HTML */}
                <div
                  className="bot-text"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: renderBotText(message.text) }}
                />

                <div className="bubble-actions">
                  {/* Tools badge */}
                  {message.toolsUsed && message.toolsUsed.length > 0 && (
                    <span className="tools-badge" title="Tools used to answer this">
                      {message.toolsUsed.map(toolLabel).join(" · ")}
                    </span>
                  )}

                  {/* Source citation button */}
                  {message.cite && (
                    <button
                      type="button"
                      className="cite"
                      onClick={() => onCiteClick(message.cite as string)}
                      title="See source document"
                    >
                      📄 {message.cite}
                    </button>
                  )}

                  {/* Read-aloud button */}
                  <button
                    type="button"
                    className={`speak-btn ${speakingId === message.id ? "on" : ""}`.trim()}
                    onClick={() => onSpeak(message)}
                    title={speakingId === message.id ? "Stop reading" : "Read aloud"}
                    aria-label={speakingId === message.id ? "Stop reading" : "Read aloud"}
                  >
                    🔊 {speakingId === message.id ? "Stop" : "Play"}
                  </button>
                </div>
              </>
            ) : (
              // User messages: preserve newlines, no markdown processing
              <span style={{ whiteSpace: "pre-wrap" }}>{message.text}</span>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
