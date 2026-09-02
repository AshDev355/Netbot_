"use client";

import type { Source } from "@/lib/data";

type Props = {
  sources: Source[];
  highlightedId: string | null;
  onSelect: (source: Source) => void;
};

export default function SourcesRail({ sources, highlightedId, onSelect }: Props) {
  return (
    <aside className="rail">
      <h5>Sources for this answer</h5>

      {sources.length === 0 ? (
        <p className="rail-empty">
          Ask a question and the documents that grounded the answer will appear here.
        </p>
      ) : (
        sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className="src-card"
            onClick={() => onSelect(source)}
            style={
              highlightedId === source.id
                ? { borderColor: "var(--navy)", boxShadow: "0 0 0 3px var(--ice)" }
                : undefined
            }
          >
            <span className="tag">{source.tag}</span>
            <b>{source.title}</b>
            <p>{source.blurb}</p>
            <span className="src-meta">
              <span>{source.meta}</span>
              <span>{source.match}% match</span>
            </span>
            <span className="relevance">
              <i style={{ width: `${source.match}%` }} />
            </span>
          </button>
        ))
      )}
    </aside>
  );
}
