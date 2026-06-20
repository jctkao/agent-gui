import { useEffect, useRef, useState } from "react";
import { getSetting, setSetting } from "../../lib/settings";

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSetting("anthropic_api_key").then((v) => {
      if (v) setApiKey(v);
    });
    inputRef.current?.focus();
  }, []);

  async function handleSave() {
    await setSetting("anthropic_api_key", apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={overlay}>
      <div style={dialog}>
        <div style={header}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>設定</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <label style={label}>Anthropic API Key</label>
        <input
          ref={inputRef}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="selectable"
          style={input}
        />
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 16px" }}>
          儲存於本機 SQLite，不會傳送至任何伺服器。
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary}>取消</button>
          <button onClick={handleSave} style={btnPrimary}>
            {saved ? "已儲存 ✓" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};
const dialog: React.CSSProperties = {
  background: "#fdfdfc", border: "2.5px solid var(--border)",
  borderRadius: 11, padding: 24, width: 420, boxShadow: "0 8px 32px rgba(0,0,0,.2)",
};
const header: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
};
const closeBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 16, color: "var(--text-muted)",
};
const label: React.CSSProperties = {
  display: "block", fontWeight: 700, marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%", height: 40, border: "2px solid var(--border-dash)",
  borderRadius: 8, padding: "0 12px", fontSize: 14,
  fontFamily: "'Space Mono', monospace", background: "#faf9f6",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--accent)", color: "#fff",
  border: "2px solid var(--accent)", borderRadius: 8,
  padding: "6px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 14,
};
const btnSecondary: React.CSSProperties = {
  background: "none", border: "2px solid var(--border-dash)",
  borderRadius: 8, padding: "6px 18px",
  cursor: "pointer", fontFamily: "inherit", fontSize: 14,
};
