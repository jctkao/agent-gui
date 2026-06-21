import BrowserPane from "./panes/BrowserPane";
import FilePane from "./panes/FilePane";
import TerminalPane from "./panes/TerminalPane";
import { useWorkspaceStore } from "../../store/workspace";

export default function SplitLayout() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const browserTab = tabs.find((t) => t.type === "browser");
  const terminalTab = tabs.find((t) => t.type === "terminal");

  return (
    <div style={container}>
      {/* Left: browser */}
      <div style={leftPane}>
        <BrowserPane url={browserTab?.url} />
        <div style={grabDots("right")} />
      </div>

      {/* Right: file top + terminal bottom */}
      <div style={rightColumn}>
        <div style={topPane}>
          <FilePane />
          <div style={grabDots("bottom")} />
        </div>
        <div style={bottomPane}>
          {terminalTab
            ? <TerminalPane pane={terminalTab} isActive />
            : <div style={{ flex: 1, background: "#2a2a28" }} />}
        </div>
      </div>
    </div>
  );
}

function grabDots(side: "right" | "bottom"): React.CSSProperties {
  const isRight = side === "right";
  return {
    position: "absolute",
    ...(isRight
      ? { top: "50%", right: -7, transform: "translateY(-50%)", flexDirection: "column" as const }
      : { left: "50%", bottom: -7, transform: "translateX(-50%)", flexDirection: "row" as const }),
    display: "flex", gap: 4, zIndex: 2,
  };
}

const container: React.CSSProperties = {
  flex: 1, display: "flex", minHeight: 0,
};
const leftPane: React.CSSProperties = {
  flex: 1.25, display: "flex", flexDirection: "column", minWidth: 0,
  borderRight: "2.5px dashed var(--border)", position: "relative",
};
const rightColumn: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
};
const topPane: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column",
  borderBottom: "2.5px dashed var(--border)", minHeight: 0, position: "relative",
};
const bottomPane: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
};
