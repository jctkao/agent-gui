import { Pane, WorkspaceMode } from "../../store/workspace";

interface Props {
  tabs: Pane[];
  activeTabId: string;
  mode: WorkspaceMode;
  onSelectTab: (id: string) => void;
  onSetMode: (mode: WorkspaceMode) => void;
}

const PANE_ICONS: Record<string, string> = {
  browser:  "◯",
  file:     "▦",
  editor:   "{ }",
  terminal: "›_",
};

export default function TabBar({ tabs, activeTabId, mode, onSelectTab, onSetMode }: Props) {
  return (
    <div style={bar}>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            style={active ? activeTab : inactiveTab}
            onClick={() => onSelectTab(tab.id)}
          >
            <span style={mono}>{PANE_ICONS[tab.type] ?? "□"}</span>
            {tab.label}
          </button>
        );
      })}

      <button style={addBtn}>+</button>

      {/* Mode toggle */}
      <div style={modeToggle}>
        <button
          style={mode === "tab" ? modeActive : modeInactive}
          onClick={() => onSetMode("tab")}
        >分頁</button>
        <button
          style={mode === "split" ? modeActive : modeInactive}
          onClick={() => onSetMode("split")}
        >分割</button>
      </div>
    </div>
  );
}

const bar: React.CSSProperties = {
  height: 44, flexShrink: 0,
  borderBottom: "2.5px solid var(--border)",
  display: "flex", alignItems: "flex-end",
  padding: "0 10px", gap: 5,
  background: "var(--bg-tabbar)",
};
const baseTab: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7,
  padding: "7px 13px",
  border: "2px solid",
  borderBottom: "none",
  borderRadius: "9px 9px 0 0",
  fontSize: 14, fontFamily: "inherit", cursor: "pointer",
};
const activeTab: React.CSSProperties = {
  ...baseTab, borderColor: "var(--border)",
  background: "#fff", color: "var(--text)", fontWeight: 700,
  marginBottom: -2.5,
};
const inactiveTab: React.CSSProperties = {
  ...baseTab, borderColor: "var(--border-dash)",
  borderStyle: "dashed",
  background: "var(--bg-tab-inactive)", color: "var(--text-muted)",
};
const mono: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: 13,
};
const addBtn: React.CSSProperties = {
  width: 28, height: 28,
  border: "2px dashed var(--border-dash)", borderRadius: 7,
  background: "none", cursor: "pointer",
  color: "var(--text-muted)", fontSize: 16,
  marginBottom: 5, alignSelf: "center",
};
const modeToggle: React.CSSProperties = {
  marginLeft: "auto", marginBottom: 6,
  display: "flex", border: "2px solid var(--border)",
  borderRadius: 8, overflow: "hidden",
  fontSize: 13, fontWeight: 700,
};
const modeActive: React.CSSProperties = {
  padding: "5px 12px", background: "var(--border)", color: "#fff",
  border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
};
const modeInactive: React.CSSProperties = {
  padding: "5px 12px", background: "#fff", color: "var(--text-muted)",
  border: "none", cursor: "pointer", fontFamily: "inherit",
};
