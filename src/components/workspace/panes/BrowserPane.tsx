import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";

interface Props {
  url?: string;
}

export default function BrowserPane({ url = "https://react.dev" }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [inputUrl, setInputUrl] = useState(url);
  const [error, setError] = useState<string | null>(null);

  function syncRect() {
    const el = overlayRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    invoke("browser_set_rect", { x: r.left, y: r.top, w: r.width, h: r.height }).catch(console.error);
  }

  // Open overlay on mount
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    invoke("browser_open", {
      url: currentUrl, x: r.left, y: r.top, w: r.width, h: r.height,
    }).catch((e) => setError(String(e)));

    // ResizeObserver keeps rect in sync
    const ro = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(syncRect);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      invoke("browser_hide").catch(console.error);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate() {
    let target = inputUrl.trim();
    if (target && !target.startsWith("http")) target = "https://" + target;
    setCurrentUrl(target);
    const el = overlayRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    invoke("browser_open", { url: target, x: r.left, y: r.top, w: r.width, h: r.height }).catch((e) => setError(String(e)));
  }

  return (
    <div style={pane}>
      {/* URL bar */}
      <div style={urlBar}>
        <span style={mono}>◯</span>
        <input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && navigate()}
          placeholder="輸入網址…"
          className="selectable"
          style={urlInput}
        />
        <button onClick={navigate} style={goBtn}>→</button>
      </div>
      {/* Error banner — visible only when browser_open fails */}
      {error && (
        <div style={{ padding: 12, color: "#c00", fontFamily: "monospace", fontSize: 12, background: "#fff3f3" }}>
          {error}
        </div>
      )}
      {/* Overlay target — the browser webview sits exactly here */}
      <div ref={overlayRef} style={overlayTarget} />
    </div>
  );
}

const pane: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
  background: "#faf9f6",
};
const urlBar: React.CSSProperties = {
  height: 38, flexShrink: 0,
  display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
  borderBottom: "2px dashed var(--border-dash)", background: "#faf9f6",
};
const mono: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: 13, color: "var(--text-muted)",
};
const urlInput: React.CSSProperties = {
  flex: 1, height: 26, border: "2px solid var(--border-dash)", borderRadius: 13,
  padding: "0 12px", fontFamily: "'Space Mono', monospace", fontSize: 12,
  color: "#8a8983", background: "#fff",
};
const goBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 16, color: "var(--accent)", padding: "0 4px",
};
const overlayTarget: React.CSSProperties = {
  flex: 1,
  // Transparent so the Tauri webview overlay shows through.
  // Do NOT set background here or it will cover the overlay.
  background: "transparent",
};
