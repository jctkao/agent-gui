import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

interface Props {
  onOpenSettings: () => void;
}

export default function TitleBar({ onOpenSettings }: Props) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<'min' | 'max' | 'close' | null>(null);
  const win = getCurrentWindow();

  useEffect(() => {
    win.isMaximized().then(setIsMaximized);
    let unlisten: (() => void) | undefined;
    win.onResized(() => {
      win.isMaximized().then(setIsMaximized);
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  return (
    <>
      <div style={bar}>
        <button style={settingsBtn} onClick={onOpenSettings} title="設定">⚙</button>
        <span style={title} data-tauri-drag-region>AI Workbench</span>
        <div style={controls}>
          <button
            style={{ ...winBtn, background: hoveredBtn === 'min' ? 'rgba(0,0,0,0.08)' : 'transparent' }}
            onMouseEnter={() => setHoveredBtn('min')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => win.minimize()}
            title="最小化"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1.5" y1="5" x2="8.5" y2="5" />
            </svg>
          </button>
          <button
            style={{ ...winBtn, background: hoveredBtn === 'max' ? 'rgba(0,0,0,0.08)' : 'transparent' }}
            onMouseEnter={() => setHoveredBtn('max')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => win.toggleMaximize()}
            title={isMaximized ? "還原" : "最大化"}
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5">
                <rect x="2.5" y="0.5" width="7" height="7" fill="none" />
                <rect x="0.5" y="2.5" width="7" height="7" fill="var(--bg-titlebar)" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="8" height="8" />
              </svg>
            )}
          </button>
          <button
            style={{
              ...winBtn,
              background: hoveredBtn === 'close' ? '#c0392b' : 'transparent',
              color: hoveredBtn === 'close' ? 'white' : 'var(--text-muted)',
            }}
            onMouseEnter={() => setHoveredBtn('close')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => win.close()}
            title="關閉"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

const bar: React.CSSProperties = {
  height: 40, flex: "none",
  background: "var(--bg-titlebar)",
  borderBottom: "2.5px solid var(--border)",
  display: "flex", alignItems: "center",
  padding: "0 0 0 14px", gap: 8,
  userSelect: "none",
};
const title: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: "#4a4945",
  flex: 1,
};
const settingsBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 16, color: "var(--text-muted)", padding: "0 4px",
};
const controls: React.CSSProperties = {
  display: "flex", alignItems: "center", alignSelf: "stretch",
};
const winBtn: React.CSSProperties = {
  width: 44, height: 40,
  border: "none", borderRadius: 0,
  cursor: "pointer", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "var(--text-muted)",
};
