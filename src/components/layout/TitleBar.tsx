import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "react";
import SettingsModal from "../settings/SettingsModal";

export default function TitleBar() {
  const [showSettings, setShowSettings] = useState(false);
  const win = getCurrentWindow();

  return (
    <>
      <div style={bar} data-tauri-drag-region>
        <div style={dots}>
          <button style={dot} onClick={() => win.close()} title="關閉" />
          <button style={dot} onClick={() => win.minimize()} title="最小化" />
          <button style={dot} onClick={() => win.toggleMaximize()} title="最大化" />
        </div>
        <span style={title} data-tauri-drag-region>AI Workbench</span>
        <button style={settingsBtn} onClick={() => setShowSettings(true)} title="設定">⚙</button>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

const bar: React.CSSProperties = {
  height: 40, flex: "none",
  background: "var(--bg-titlebar)",
  borderBottom: "2.5px solid var(--border)",
  display: "flex", alignItems: "center",
  padding: "0 14px", gap: 8,
  userSelect: "none",
};
const dots: React.CSSProperties = {
  display: "flex", gap: 8, alignItems: "center",
};
const dot: React.CSSProperties = {
  width: 12, height: 12,
  border: "2px solid var(--border)", borderRadius: "50%",
  background: "none", cursor: "pointer", padding: 0,
};
const title: React.CSSProperties = {
  marginLeft: 14, fontSize: 15, fontWeight: 700, color: "#4a4945",
  flex: 1,
};
const settingsBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 16, color: "var(--text-muted)", padding: "0 4px",
};
