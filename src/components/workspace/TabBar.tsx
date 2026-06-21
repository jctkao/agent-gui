import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { Pane, PaneType, WorkspaceMode } from "../../store/workspace";

interface Props {
  tabs: Pane[];
  activeTabId: string;
  mode: WorkspaceMode;
  onSelectTab: (id: string) => void;
  onSetMode: (mode: WorkspaceMode) => void;
  onCloseTab: (id: string) => void;
  onAddTab: (type: PaneType, shell?: "powershell" | "wsl") => void;
}

const PANE_ICONS: Record<string, string> = {
  browser:  "◯",
  file:     "▦",
  editor:   "{ }",
  terminal: "›_",
};

const ADD_OPTIONS = [
  { label: "網頁",        type: "browser"  as PaneType },
  { label: "檔案總管",    type: "file"     as PaneType },
  { label: "PowerShell", type: "terminal" as PaneType, shell: "powershell" as const },
  { label: "bash (WSL)", type: "terminal" as PaneType, shell: "wsl"        as const },
];

export default function TabBar({ tabs, activeTabId, mode, onSelectTab, onSetMode, onCloseTab, onAddTab }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [dropdownOpen]);

  // Hide browser overlay when dropdown opens so it doesn't cover the menu
  useEffect(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab?.type !== "browser") return;
    if (dropdownOpen) {
      invoke("browser_hide").catch(console.error);
    } else {
      invoke("browser_show").catch(console.error);
    }
  }, [dropdownOpen, tabs, activeTabId]);

  return (
    <div style={bar}>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div key={tab.id} style={active ? activeTabWrap : inactiveTabWrap}>
            <button
              style={active ? activeTabBtn : inactiveTabBtn}
              onClick={() => onSelectTab(tab.id)}
            >
              <span style={mono}>{PANE_ICONS[tab.type] ?? "□"}</span>
              {tab.label}
            </button>
            <button
              style={closeBtn}
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
              title="關閉"
            >×</button>
          </div>
        );
      })}

      <div style={{ position: "relative", alignSelf: "center", marginBottom: 5 }} ref={dropdownRef}>
        <button style={addBtn} onClick={() => setDropdownOpen((v) => !v)}>+</button>
        {dropdownOpen && (
          <div style={dropdown}>
            {ADD_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                style={dropdownItem}
                onClick={() => { onAddTab(opt.type, opt.shell); setDropdownOpen(false); }}
              >
                <span style={mono}>{PANE_ICONS[opt.type]}</span>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

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

const baseWrap: React.CSSProperties = {
  display: "flex", alignItems: "center",
  border: "2px solid",
  borderBottom: "none",
  borderRadius: "9px 9px 0 0",
};
const activeTabWrap: React.CSSProperties = {
  ...baseWrap,
  borderColor: "var(--border)",
  background: "#fff",
  marginBottom: -2.5,
};
const inactiveTabWrap: React.CSSProperties = {
  ...baseWrap,
  borderColor: "var(--border-dash)",
  borderStyle: "dashed",
  background: "var(--bg-tab-inactive)",
};

const baseTabBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7,
  padding: "7px 4px 7px 13px",
  border: "none", background: "none",
  fontSize: 14, fontFamily: "inherit", cursor: "pointer",
};
const activeTabBtn: React.CSSProperties = {
  ...baseTabBtn, color: "var(--text)", fontWeight: 700,
};
const inactiveTabBtn: React.CSSProperties = {
  ...baseTabBtn, color: "var(--text-muted)",
};

const closeBtn: React.CSSProperties = {
  width: 20, height: 20,
  border: "none", background: "none",
  cursor: "pointer", color: "var(--text-muted)",
  fontSize: 14, lineHeight: 1,
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 4, marginRight: 6,
  padding: 0,
};

const addBtn: React.CSSProperties = {
  width: 28, height: 28,
  border: "2px dashed var(--border-dash)", borderRadius: 7,
  background: "none", cursor: "pointer",
  color: "var(--text-muted)", fontSize: 16,
};

const dropdown: React.CSSProperties = {
  position: "absolute", top: "100%", left: 0,
  marginTop: 4,
  background: "#fff",
  border: "2px solid var(--border)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
  zIndex: 100,
  display: "flex", flexDirection: "column",
  minWidth: 160, overflow: "hidden",
};
const dropdownItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "9px 14px",
  border: "none", background: "none",
  cursor: "pointer", fontSize: 14,
  fontFamily: "inherit", color: "var(--text)",
  textAlign: "left",
};

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: 13 };

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
