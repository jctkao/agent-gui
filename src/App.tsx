import TitleBar from "./components/layout/TitleBar";
import ResizableSplitter from "./components/layout/ResizableSplitter";
import ChatPanel from "./components/chat/ChatPanel";
import WorkspacePanel from "./components/workspace/WorkspacePanel";

export default function App() {
  return (
    <div style={root}>
      <TitleBar />
      <ResizableSplitter
        left={<ChatPanel />}
        right={<WorkspacePanel />}
        defaultLeftWidth={360}
      />
    </div>
  );
}

const root: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg)",
  overflow: "hidden",
};
