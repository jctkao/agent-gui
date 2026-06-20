import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "../../store/workspace";
import TabBar from "./TabBar";
import SplitLayout from "./SplitLayout";
import BrowserPane from "./panes/BrowserPane";
import FilePane from "./panes/FilePane";
import EditorPane from "./panes/EditorPane";
import TerminalPane from "./panes/TerminalPane";

export default function WorkspacePanel() {
  const { mode, tabs, activeTabId, setMode, setActiveTab } = useWorkspaceStore();
  const prevActiveRef = useRef(activeTabId);

  // Task 6.6: show/hide browser overlay on tab switch
  useEffect(() => {
    const prev = prevActiveRef.current;
    prevActiveRef.current = activeTabId;
    if (prev === activeTabId) return;

    const prevTab = tabs.find((t) => t.id === prev);
    const nextTab = tabs.find((t) => t.id === activeTabId);

    if (prevTab?.type === "browser") {
      invoke("browser_hide").catch(console.error);
    }
    if (nextTab?.type === "browser") {
      invoke("browser_show").catch(console.error);
    }
  }, [activeTabId, tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  function renderActivePane() {
    if (!activeTab) return null;
    switch (activeTab.type) {
      case "browser":  return <BrowserPane url={activeTab.url} />;
      case "file":     return <FilePane />;
      case "editor":   return <EditorPane />;
      case "terminal": return <TerminalPane />;
    }
  }

  return (
    <div style={panel}>
      {mode === "tab" ? (
        <>
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            mode={mode}
            onSelectTab={setActiveTab}
            onSetMode={setMode}
          />
          <div style={paneContainer}>
            {renderActivePane()}
          </div>
        </>
      ) : (
        <>
          <div style={splitHeader}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>
              {tabs.length} 個窗格
            </span>
            <div style={modeToggle}>
              <button style={modeInactive} onClick={() => setMode("tab")}>分頁</button>
              <button style={modeActive}>分割</button>
            </div>
          </div>
          <SplitLayout />
        </>
      )}
    </div>
  );
}

const panel: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#fff",
};
const paneContainer: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
};
const splitHeader: React.CSSProperties = {
  height: 44, flexShrink: 0,
  borderBottom: "2.5px solid var(--border)",
  display: "flex", alignItems: "center",
  padding: "0 12px", gap: 8, background: "var(--bg-tabbar)",
};
const modeToggle: React.CSSProperties = {
  marginLeft: "auto", display: "flex",
  border: "2px solid var(--border)", borderRadius: 8,
  overflow: "hidden", fontSize: 13, fontWeight: 700,
};
const modeActive: React.CSSProperties = {
  padding: "5px 12px", background: "var(--border)", color: "#fff",
  border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
};
const modeInactive: React.CSSProperties = {
  padding: "5px 12px", background: "#fff", color: "var(--text-muted)",
  border: "none", cursor: "pointer", fontFamily: "inherit",
};
