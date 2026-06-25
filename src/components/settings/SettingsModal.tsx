import { useEffect, useRef, useState } from "react";
import { getSetting, setSetting } from "../../lib/settings";

type Tab = 'ai' | 'shortcuts';

const SHORTCUTS = [
  { key: "j / k",  action: "向下 / 向上捲動" },
  { key: "d / u",  action: "向下 / 向上捲動半頁" },
  { key: "gg",     action: "捲動到頂部" },
  { key: "G",      action: "捲動到底部" },
  { key: "H / L",  action: "歷史上一頁 / 下一頁" },
  { key: "r",      action: "重新載入" },
  { key: "f",      action: "Hint 模式（鍵盤點擊連結）" },
  { key: "Esc",    action: "離開 hint / insert 模式" },
];

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ai");
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSetting("anthropic_api_key").then((v) => { if (v) setApiKey(v); });
    getSetting("ollama_url").then((v) => { if (v) setOllamaUrl(v); });
    getSetting("ollama_model").then((v) => { if (v) setOllamaModel(v); });
    inputRef.current?.focus();
  }, []);

  async function handleSave() {
    await setSetting("anthropic_api_key", apiKey);
    await setSetting("ollama_url", ollamaUrl || "http://localhost:11434");
    await setSetting("ollama_model", ollamaModel || "llama3.2");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={overlay}>
      <div style={dialog}>

        <div style={header}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>設定</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={body}>
          <div style={sidebar}>
            {(["ai", "shortcuts"] as Tab[]).map((tab) => (
              <button
                key={tab}
                style={{
                  ...tabItem,
                  ...(activeTab === tab ? tabItemActive : {}),
                  ...(activeTab !== tab && hoveredTab === tab ? tabItemHover : {}),
                }}
                onClick={() => setActiveTab(tab)}
                onMouseEnter={() => setHoveredTab(tab)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                {tab === "ai" ? "AI Models" : "Keyboard Shortcuts"}
              </button>
            ))}
          </div>

          <div style={content}>
            {activeTab === "ai" && (
              <div style={panel}>
                <h2 style={panelTitle}>AI Models</h2>

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
                <p style={hint}>儲存於本機 SQLite，不會傳送至任何伺服器。</p>

                <label style={label}>Ollama URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="selectable"
                  style={input}
                />
                <p style={hint}>本機 Ollama 伺服器位址。</p>

                <label style={label}>Ollama Model</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="llama3.2"
                  className="selectable"
                  style={input}
                />
                <p style={hint}>需支援 tool calling。</p>

                <div style={panelFooter}>
                  {saved && <span style={savedMsg}>已儲存</span>}
                  <button onClick={handleSave} style={btnPrimary}>儲存</button>
                </div>
              </div>
            )}

            {activeTab === "shortcuts" && (
              <div style={panel}>
                <h2 style={panelTitle}>Keyboard Shortcuts</h2>
                <p style={shortcutNote}>快捷鍵僅適用於瀏覽器面板。</p>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>按鍵</th>
                      <th style={th}>動作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHORTCUTS.map(({ key, action }) => (
                      <tr key={key}>
                        <td style={tdKey}><code style={kbd}>{key}</code></td>
                        <td style={tdAction}>{action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
};
const dialog: React.CSSProperties = {
  width: "75vw", height: "75vh",
  background: "var(--bg-panel)",
  border: "2.5px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  display: "flex", flexDirection: "column",
  overflow: "hidden",
};
const header: React.CSSProperties = {
  height: 44, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "0 16px",
  borderBottom: "2px solid var(--border)",
  background: "var(--bg-titlebar)",
};
const closeBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 16, color: "var(--text-muted)",
};
const body: React.CSSProperties = {
  flex: 1, display: "flex", minHeight: 0,
};
const sidebar: React.CSSProperties = {
  width: 180, flexShrink: 0,
  borderRight: "2px dashed var(--border-dash)",
  display: "flex", flexDirection: "column",
  padding: "12px 0",
  background: "var(--bg-tabbar)",
};
const tabItem: React.CSSProperties = {
  background: "none", border: "none",
  borderLeft: "3px solid transparent",
  textAlign: "left", padding: "8px 16px",
  cursor: "pointer", fontSize: 14,
  color: "var(--text)", fontFamily: "inherit",
};
const tabItemActive: React.CSSProperties = {
  background: "var(--accent-bg)",
  borderLeft: "3px solid var(--accent)",
  color: "var(--accent)", fontWeight: 700,
};
const tabItemHover: React.CSSProperties = {
  background: "var(--bg-tab-inactive)",
};
const content: React.CSSProperties = {
  flex: 1, overflowY: "auto",
  display: "flex", flexDirection: "column",
};
const panel: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column",
  padding: "24px 28px",
};
const panelTitle: React.CSSProperties = {
  fontSize: 17, fontWeight: 700, margin: "0 0 20px",
  borderBottom: "2px dashed var(--border-dash)", paddingBottom: 12,
};
const panelFooter: React.CSSProperties = {
  marginTop: "auto", paddingTop: 16,
  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12,
};
const savedMsg: React.CSSProperties = {
  fontSize: 13, color: "var(--text-muted)",
};
const label: React.CSSProperties = {
  display: "block", fontWeight: 700, marginBottom: 6,
};
const hint: React.CSSProperties = {
  fontSize: 13, color: "var(--text-muted)", margin: "6px 0 16px",
};
const input: React.CSSProperties = {
  width: "100%", height: 40, border: "2px solid var(--border-dash)",
  borderRadius: 8, padding: "0 12px", fontSize: 14,
  fontFamily: "'Space Mono', monospace", background: "#faf9f6",
  boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--accent)", color: "#fff",
  border: "2px solid var(--accent)", borderRadius: 8,
  padding: "6px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 14,
};
const shortcutNote: React.CSSProperties = {
  fontSize: 13, color: "var(--text-muted)", fontStyle: "italic",
  margin: "0 0 16px",
};
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "6px 12px",
  borderBottom: "2px dashed var(--border-dash)",
  fontWeight: 700, fontSize: 13, color: "var(--text-muted)",
};
const tdKey: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px dashed var(--border-dash)",
  width: 140,
};
const tdAction: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px dashed var(--border-dash)",
};
const kbd: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: 13,
  background: "var(--bg-tab-inactive)",
  border: "1px solid var(--border-dash)",
  borderRadius: 4, padding: "1px 6px",
};
