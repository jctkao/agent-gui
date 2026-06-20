const LINE_WIDTHS = [280, 200, 340, 300, 240, 180, 320, 150];

export default function EditorPane() {
  return (
    <div style={pane}>
      {/* Path bar */}
      <div style={pathBar}>
        <span style={mono}>{"{ }"}</span>
        <div style={pathInput}>~/project/src/main.py</div>
      </div>
      {/* Editor body */}
      <div style={body}>
        {/* Gutter */}
        <div style={gutter}>
          {LINE_WIDTHS.map((_, i) => (
            <span key={i} style={{ fontSize: 12, color: "var(--text-faint)" }}>{i + 1}</span>
          ))}
        </div>
        {/* Code skeleton */}
        <div style={code}>
          {LINE_WIDTHS.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, marginLeft: i > 1 && i < 6 ? (i === 4 ? 56 : 28) : 0 }}>
              <div style={{ height: 8, borderRadius: 4, background: "#d2d1cc", width: w }} />
              {i === LINE_WIDTHS.length - 1 && (
                <div style={{ width: 2, height: 18, background: "var(--accent)", marginLeft: 4, animation: "blink 1.1s step-end infinite" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const pane: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
};
const pathBar: React.CSSProperties = {
  height: 38, flexShrink: 0,
  display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
  borderBottom: "2px dashed var(--border-dash)", background: "#faf9f6",
};
const mono: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: 13, color: "var(--text-muted)",
};
const pathInput: React.CSSProperties = {
  flex: 1, height: 26, border: "2px solid var(--border-dash)", borderRadius: 13,
  display: "flex", alignItems: "center", padding: "0 12px",
  fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#8a8983",
};
const body: React.CSSProperties = {
  flex: 1, display: "flex", minHeight: 0,
};
const gutter: React.CSSProperties = {
  width: 44, flexShrink: 0, background: "var(--bg-editor)",
  borderRight: "2px dashed #d9d8d3", padding: "16px 0",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
  fontFamily: "'Space Mono', monospace",
};
const code: React.CSSProperties = {
  flex: 1, padding: "18px 22px",
  display: "flex", flexDirection: "column", gap: 9, overflowY: "auto",
};
