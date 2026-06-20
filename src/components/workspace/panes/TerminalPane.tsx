export default function TerminalPane() {
  return (
    <div style={pane}>
      <div style={paneHeader}>
        <span style={mono}>›_</span> zsh
      </div>
      <div style={body}>
        <div style={{ color: "var(--text-terminal-green)" }}>$ npm run dev</div>
        <div style={skeletonLine(70)} />
        <div style={skeletonLine(55)} />
        <div style={{ color: "var(--text-terminal-blue)" }}>➜  localhost:3000</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "var(--text-terminal-green)" }}>$</span>
          <span style={cursor} />
        </div>
      </div>
    </div>
  );
}

function skeletonLine(widthPct: number): React.CSSProperties {
  return {
    height: 7, borderRadius: 4, background: "#54534e", width: `${widthPct}%`,
  };
}

const pane: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
  background: "var(--bg-terminal)",
};
const paneHeader: React.CSSProperties = {
  height: 34, flexShrink: 0,
  display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
  borderBottom: "2px solid #45443f",
  fontSize: 14, fontWeight: 700, color: "var(--text-terminal)",
};
const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: 13 };
const body: React.CSSProperties = {
  flex: 1, padding: "12px 14px",
  display: "flex", flexDirection: "column", gap: 8,
  fontFamily: "'Space Mono', monospace", fontSize: 12, color: "var(--text-terminal)",
  overflowY: "auto",
};
const cursor: React.CSSProperties = {
  width: 8, height: 14, background: "var(--text-terminal)",
  animation: "blink 1.1s step-end infinite",
};
