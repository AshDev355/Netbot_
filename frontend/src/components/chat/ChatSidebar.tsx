"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Conversation } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

type MenuState = { id: string; top: number; left: number } | null;

type Props = {
  conversations: Conversation[];
  activeId: string;
  pinnedIds: string[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onShare: (id: string) => void;
};

export default function ChatSidebar({
  conversations,
  activeId,
  pinnedIds,
  onClose,
  onSelect,
  onNewChat,
  onRename,
  onTogglePin,
  onDelete,
  onExport,
  onShare,
}: Props) {
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<MenuState>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const sidebarRef = useRef<HTMLElement | null>(null);
  const { user } = useAuth();
  const email = user?.email ?? "";
  const shortName = email.split("@")[0] || "Account";
  const initial = shortName.charAt(0).toUpperCase() || "N";

  useEffect(() => {
    if (!menu) return;

    function close(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".sb-menu") && !target.closest(".sb-item .k")) {
        setMenu(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const groups = new Map<string, Conversation[]>();
  for (const conversation of filtered) {
    const group = pinnedIds.includes(conversation.id) ? "Pinned" : conversation.group;
    const bucket = groups.get(group);
    if (bucket) bucket.push(conversation);
    else groups.set(group, [conversation]);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === "Pinned") return -1;
    if (b === "Pinned") return 1;
    return 0;
  });

  function openMenu(event: React.MouseEvent<HTMLSpanElement>, id: string) {
    event.stopPropagation();
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const top = buttonRect.bottom - sidebarRect.top + 6;
    const maxTop = sidebar.clientHeight - 230;

    setMenu({
      id,
      top: Math.max(8, Math.min(top, Math.max(8, maxTop))),
      left: Math.min(buttonRect.left - sidebarRect.left - 140, sidebar.clientWidth - 192),
    });
  }

  function startRename(id: string, currentTitle: string) {
    setRenamingId(id);
    setDraftTitle(currentTitle);
    setMenu(null);
  }

  function commitRename() {
    if (renamingId && draftTitle.trim()) {
      onRename(renamingId, draftTitle.trim());
    }
    setRenamingId(null);
  }

  return (
    <aside className="sidebar" ref={sidebarRef}>
      <div className="sb-top">
        <Link href="/chat" className="sb-brand">
          <span className="m">N</span> netbot
        </Link>
        <button type="button" className="sb-close" onClick={onClose} aria-label="Close sidebar">
          ×
        </button>
      </div>

      <button type="button" className="new-chat" onClick={onNewChat}>
        <span className="plus" aria-hidden="true">
          +
        </span>{" "}
        New chat
      </button>

      <div className="sb-search">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search conversations"
        />
      </div>

      <div className="sb-scroll">
        {orderedGroups.length === 0 && (
          <div className="sb-group">No conversations match “{query}”</div>
        )}

        {orderedGroups.map(([group, items]) => (
          <div key={group}>
            <div className="sb-group">{group}</div>
            {items.map((conversation) => (
              <div
                key={conversation.id}
                className={`sb-item ${conversation.id === activeId ? "on" : ""}`.trim()}
                onClick={() => onSelect(conversation.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(conversation.id);
                  }
                }}
              >
                {renamingId === conversation.id ? (
                  <input
                    className="rename-input"
                    value={draftTitle}
                    autoFocus
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Conversation title"
                  />
                ) : (
                  <>
                    <span className="t">
                      {pinnedIds.includes(conversation.id) && "📌 "}
                      {conversation.title}
                    </span>
                    <span
                      className={`k ${menu?.id === conversation.id ? "open" : ""}`.trim()}
                      role="button"
                      tabIndex={0}
                      aria-label={`Options for ${conversation.title}`}
                      onClick={(e) => openMenu(e, conversation.id)}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      ⋯
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {menu && (
        <div className="sb-menu" style={{ top: menu.top, left: menu.left }} role="menu">
          <button
            type="button"
            className="mi"
            role="menuitem"
            onClick={() => {
              const target = conversations.find((c) => c.id === menu.id);
              if (target) startRename(target.id, target.title);
            }}
          >
            <span className="ic">✎</span> Rename
          </button>
          <button
            type="button"
            className="mi"
            role="menuitem"
            onClick={() => {
              onTogglePin(menu.id);
              setMenu(null);
            }}
          >
            <span className="ic">⇪</span> {pinnedIds.includes(menu.id) ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            className="mi"
            role="menuitem"
            onClick={() => {
              onShare(menu.id);
              setMenu(null);
            }}
          >
            <span className="ic">↗</span> Share
          </button>
          <button
            type="button"
            className="mi"
            role="menuitem"
            onClick={() => {
              onExport(menu.id);
              setMenu(null);
            }}
          >
            <span className="ic">↓</span> Export
          </button>
          <button
            type="button"
            className="mi danger"
            role="menuitem"
            onClick={() => {
              onDelete(menu.id);
              setMenu(null);
            }}
          >
            <span className="ic">🗑</span> Delete
          </button>
        </div>
      )}

      <Link href="/settings/profile" className="sb-user">
        <div className="av">{initial}</div>
        <div className="who">
          <b>{shortName}</b>
          <span>{email}</span>
        </div>
        <div className="gear" aria-hidden="true">
          ⚙
        </div>
      </Link>
    </aside>
  );
}
