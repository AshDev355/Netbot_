"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import Composer from "@/components/chat/Composer";
import MessageList from "@/components/chat/MessageList";
import SourcesRail from "@/components/chat/SourcesRail";
import SpeechControls from "@/components/chat/SpeechControls";
import type { Conversation, Message, Source } from "@/lib/data";
import { useSidebar, SidebarToggle } from "@/lib/sidebar-context";
import { useSpeechSettings } from "@/lib/speech/useSpeechSettings";
import { useSpeaker } from "@/lib/useSpeech";
import * as api from "@/lib/api";
import { NetBotApiError } from "@/lib/api";

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function groupForDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Today";
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (daysAgo <= 7) return "This week";
  return "Earlier";
}

function subtitleFor(sourceCount: number): string {
  return sourceCount > 0
    ? `Grounded on ${sourceCount} document${sourceCount === 1 ? "" : "s"} · updated just now`
    : "No documents retrieved yet";
}

export default function ChatScreen({ full = true }: { full?: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, api.DocumentSummary>>({});
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const toastTimer = useRef<number | null>(null);
  const loadedSessions = useRef<Set<string>>(new Set());

  const { settings } = useSpeechSettings();
  const { speakingId, speak, speakIfAutoRead, stop, isSpeaking } = useSpeaker(
    settings.autoReadReplies,
  );

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(Object.fromEntries(docs.map((d) => [d.id, d])));
    } catch {
      // Non-fatal -- sources will just show a generic label if this fails.
    }
  }, []);

  // Initial load: pull the user's sessions and documents, create a first
  // session if this is a brand-new account with nothing yet.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sessions] = await Promise.all([api.listSessions(), refreshDocuments()]);
        if (cancelled) return;

        let list = sessions;
        if (list.length === 0) {
          const created = await api.createSession("New Chat");
          list = [created];
        }

        const mapped: Conversation[] = list.map((s) => ({
          id: s.id,
          title: s.title,
          group: groupForDate(s.created_at),
          subtitle: "No documents retrieved yet",
          messages: [],
          sources: [],
        }));

        setConversations(mapped);
        setActiveId(mapped[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setWorkspaceError(
            err instanceof NetBotApiError
              ? err.message
              : "Couldn't reach the netbot backend. Is it running?",
          );
        }
      } finally {
        if (!cancelled) setLoadingWorkspace(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshDocuments]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const updateConversation = useCallback(
    (id: string, update: (conversation: Conversation) => Conversation) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? update(c) : c)));
    },
    [],
  );

  // Lazily load message history the first time a session becomes active.
  useEffect(() => {
    if (!activeId || loadedSessions.current.has(activeId)) return;
    loadedSessions.current.add(activeId);

    (async () => {
      try {
        const history = await api.getSessionMessages(activeId);
        const messages: Message[] = history.map((m) => ({
          id: nextId("m"),
          role: m.role === "user" ? "user" : "bot",
          text: m.content,
        }));
        updateConversation(activeId, (c) => ({ ...c, messages }));
      } catch {
        // Leave empty -- the session may just genuinely have no history yet.
      }
    })();
  }, [activeId, updateConversation]);

  const mapSources = useCallback(
    (sources: api.ChatSource[]): Source[] =>
      sources.map((s) => {
        const doc = documents[s.document_id];
        return {
          id: `${s.document_id}-${s.chunk_index}`,
          tag: "Document",
          title: doc?.filename ?? "Uploaded document",
          blurb: `Matched chunk #${s.chunk_index} of this document.`,
          meta: `chunk ${s.chunk_index}`,
          match: Math.round(s.similarity * 100),
        };
      }),
    [documents],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!active) return;
      const sessionId = active.id;

      const userMessage: Message = { id: nextId("u"), role: "user", text };
      const pendingId = nextId("b");

      updateConversation(sessionId, (c) => ({
        ...c,
        messages: [...c.messages, userMessage, { id: pendingId, role: "bot", text: "", pending: true }],
      }));
      setThinking(true);

      api
        .sendChatMessage(sessionId, text)
        .then((reply) => {
          const sources = mapSources(reply.sources);
          updateConversation(sessionId, (c) => ({
            ...c,
            subtitle: subtitleFor(sources.length),
            sources,
            messages: c.messages.map((m) =>
              m.id === pendingId
                ? {
                    id: pendingId,
                    role: "bot",
                    text: reply.response,
                    cite: sources[0] ? `${sources[0].title} · ${sources[0].meta}` : undefined,
                    toolsUsed: reply.tools_used.length > 0 ? reply.tools_used : undefined,
                  }
                : m,
            ),
          }));
          speakIfAutoRead(pendingId, reply.response);
        })
        .catch((err) => {
          const message =
            err instanceof NetBotApiError ? err.message : "Something went wrong reaching netbot.";
          updateConversation(sessionId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === pendingId ? { id: pendingId, role: "bot", text: `⚠ ${message}` } : m,
            ),
          }));
          flash(message);
        })
        .finally(() => setThinking(false));
    },
    [active, updateConversation, speakIfAutoRead, mapSources, flash],
  );

  const handleAttach = useCallback(
    async (file: File) => {
      flash(`Uploading ${file.name}…`);
      try {
        const result = await api.uploadDocument(file);
        await refreshDocuments();
        flash(`${result.filename} indexed (${result.chunks_indexed} chunks) — netbot can now use it`);
      } catch (err) {
        flash(err instanceof NetBotApiError ? err.message : `Couldn't upload ${file.name}`);
      }
    },
    [flash, refreshDocuments],
  );

  const handleNewChat = useCallback(async () => {
    try {
      const created = await api.createSession("New Chat");
      loadedSessions.current.add(created.id);
      const conversation: Conversation = {
        id: created.id,
        title: created.title,
        group: "Today",
        subtitle: "No documents retrieved yet",
        messages: [],
        sources: [],
      };
      setConversations((prev) => [conversation, ...prev]);
      setActiveId(conversation.id);
    } catch (err) {
      flash(err instanceof NetBotApiError ? err.message : "Couldn't start a new chat");
    }
  }, [flash]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.deleteSession(id);
      } catch (err) {
        flash(err instanceof NetBotApiError ? err.message : "Couldn't delete that conversation");
        return;
      }
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (id === activeId) setActiveId(next[0]?.id ?? null);
        return next;
      });
      setPinnedIds((prev) => prev.filter((p) => p !== id));
      flash("Conversation deleted");
    },
    [activeId, flash],
  );

  const handleRename = useCallback(
    async (id: string, title: string) => {
      updateConversation(id, (c) => ({ ...c, title }));
      try {
        await api.renameSession(id, title);
      } catch (err) {
        flash(err instanceof NetBotApiError ? err.message : "Couldn't save the new title");
      }
    },
    [updateConversation, flash],
  );

  const handleExport = useCallback(
    (id: string) => {
      const conversation = conversations.find((c) => c.id === id);
      if (!conversation) return;

      const blob = new Blob([JSON.stringify(conversation, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${conversation.id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      flash("Exported as JSON");
    },
    [conversations, flash],
  );

  const handleShare = useCallback(
    async (id: string) => {
      const link = `${window.location.origin}/chat?c=${id}`;
      try {
        await navigator.clipboard.writeText(link);
        flash("Share link copied");
      } catch {
        flash(link);
      }
    },
    [flash],
  );

  const handleSpeak = useCallback(
    (message: Message) => {
      speak(message.id, message.text);
    },
    [speak],
  );

  const handleCiteClick = useCallback(
    (cite: string) => {
      const match = active?.sources.find((s) => cite.startsWith(s.title));
      setHighlightedSourceId(match?.id ?? null);
    },
    [active],
  );

  const handleSourceSelect = useCallback((source: Source) => {
    setHighlightedSourceId((prev) => (prev === source.id ? null : source.id));
  }, []);

  if (loadingWorkspace) {
    return (
      <div className={`app ${full ? "full" : ""}`.trim()}>
        <main className="chat">
          <div className="chat-head">
            <div className="chat-head-title">
              <h4>Loading netbot…</h4>
              <div className="sub">Fetching your conversations</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (workspaceError || !active) {
    return (
      <div className={`app ${full ? "full" : ""}`.trim()}>
        <main className="chat">
          <div className="chat-head">
            <div className="chat-head-title">
              <h4>Couldn&apos;t load netbot</h4>
              <div className="sub">
                {workspaceError ?? "No conversation available."} Set{" "}
                <code>NEXT_PUBLIC_API_URL</code> and make sure the backend is running.
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`app ${full ? "full" : ""} ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`.trim()}>
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ChatSidebar
        conversations={conversations}
        activeId={active.id}
        pinnedIds={pinnedIds}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          setActiveId(id);
          if (window.innerWidth <= 640) setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onTogglePin={(id) =>
          setPinnedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
        }
        onDelete={handleDelete}
        onExport={handleExport}
        onShare={handleShare}
      />

      <main className="chat">
        <div className="chat-head">
          <SidebarToggle />

          <div className="chat-head-title">
            <h4>{active.title}</h4>
            <div className="sub">{toast ?? active.subtitle}</div>
          </div>
          <div className="badges">
            <span className="badge live">
              <span className="dot" aria-hidden="true" /> LIVE
            </span>
            <span className="badge">RAG · {active.sources.length} sources</span>
          </div>
        </div>

        <SpeechControls isSpeaking={isSpeaking} onStopSpeaking={stop} />

        <MessageList
          messages={active.messages}
          speakingId={speakingId}
          onSpeak={handleSpeak}
          onCiteClick={handleCiteClick}
        />

        <Composer onSend={handleSend} onAttach={handleAttach} disabled={thinking} />
      </main>

      <SourcesRail
        sources={active.sources}
        highlightedId={highlightedSourceId}
        onSelect={handleSourceSelect}
      />
    </div>
  );
}
