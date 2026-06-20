const TREE = [
  { depth: 0, icon: "▸", name: "src", color: "var(--text-muted)" },
  { depth: 1, icon: "▾", name: "components", color: "var(--text-muted)" },
  { depth: 2, icon: "{ }", name: "App.tsx", color: "var(--accent)" },
  { depth: 2, icon: "{ }", name: "index.css", color: "var(--text-muted)" },
  { depth: 1, icon: "▸", name: "store", color: "var(--text-muted)" },
  { depth: 0, icon: "▸", name: "src-tauri", color: "var(--text-muted)" },
];

export default function FilePane() {
  return (
    <div style={pane}>
      <div style={paneHeader}>
        <span style={mono}>▦</span> 專案檔案
      </div>
      <div style={tree}>
        {TREE.map((item, i) => (
          <div key={i} style={{ ...row, marginLeft: item.depth * 18 }}>
            <span style={{ color: item.color, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
              {item.icon}
            </span>
            <span style={{ fontSize: 14, color: "var(--text)" }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const pane: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
  background: "#faf9f6",
};
const paneHeader: React.CSSProperties = {
  height: 34, flexShrink: 0,
  display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
  borderBottom: "2px dashed var(--border-dash)",
  fontSize: 14, fontWeight: 700, color: "#4a4945",
};
const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: 13 };
const tree: React.CSSProperties = {
  flex: 1, padding: "12px 14px",
  display: "flex", flexDirection: "column", gap: 9, overflowY: "auto",
};
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" };
