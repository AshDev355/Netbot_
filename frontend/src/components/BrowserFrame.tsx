import type { ReactNode } from "react";

export default function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div className="browser">
      <div className="chrome">
        <div className="tl">
          <span />
          <span />
          <span />
        </div>
        <div className="url">{url}</div>
      </div>
      {children}
    </div>
  );
}
