import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import TitleBar from "./components/layout/TitleBar";
import ResizableSplitter from "./components/layout/ResizableSplitter";
import ChatPanel from "./components/chat/ChatPanel";
import WorkspacePanel from "./components/workspace/WorkspacePanel";
import SettingsModal from "./components/settings/SettingsModal";
import { loadOverrides, resolveBindings } from "./lib/keybindings";
import { getTerminal } from "./lib/terminalRegistry";
import { useWorkspaceStore, PaneType } from "./store/workspace";

function keyEventToString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey)  parts.push("Ctrl");
  if (e.altKey)   parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  parts.push(e.key);
  return parts.join("+");
}

function focusPane(tabId: string, tabType: PaneType) {
  if (tabType === "terminal") {
    invoke("main_focus")
      .then(() => getTerminal(tabId)?.focus())
      .catch(console.error);
  } else if (tabType === "browser") {
    invoke("browser_focus").catch(console.error);
  }
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => {
    const { tabs, activeTabId } = useWorkspaceStore.getState();
    if (tabs.find((t) => t.id === activeTabId)?.type === "browser") {
      invoke("browser_hide").catch(console.error);
    }
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    const { tabs, activeTabId } = useWorkspaceStore.getState();
    if (tabs.find((t) => t.id === activeTabId)?.type === "browser") {
      invoke("browser_show").catch(console.error);
    }
  }, []);

  const dispatchAction = useCallback((actionId: string, e?: KeyboardEvent) => {
    const { tabs, activeTabId, setActiveTab } = useWorkspaceStore.getState();

    function selectTab(index: number) {
      const tab = tabs[index];
      if (!tab) return;
      setActiveTab(tab.id);
      setTimeout(() => focusPane(tab.id, tab.type), 80);
    }

    switch (actionId) {
      case "focus_chat": {
        e?.preventDefault();
        invoke("main_focus")
          .then(() => document.getElementById("chat-input")?.focus())
          .catch(console.error);
        break;
      }
      case "focus_workspace": {
        e?.preventDefault();
        const active = tabs.find((t) => t.id === activeTabId);
        if (active) focusPane(active.id, active.type);
        break;
      }
      case "tab_prev": {
        e?.preventDefault();
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        if (idx > 0) selectTab(idx - 1);
        break;
      }
      case "tab_next": {
        e?.preventDefault();
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        if (idx < tabs.length - 1) selectTab(idx + 1);
        break;
      }
      case "tab_first": {
        e?.preventDefault();
        selectTab(0);
        break;
      }
      case "tab_last": {
        e?.preventDefault();
        selectTab(tabs.length - 1);
        break;
      }
      case "open_settings": {
        e?.preventDefault();
        openSettings();
        break;
      }
    }
  }, [openSettings]);

  useEffect(() => {
    let reverseMap: Record<string, string> = {};
    let active = true;
    let unlistenAppAction: (() => void) | undefined;

    loadOverrides().then((overrides) => {
      const effective = resolveBindings(overrides);
      for (const [id, key] of Object.entries(effective)) {
        reverseMap[key] = id;
      }
    });

    function onKeyDown(e: KeyboardEvent) {
      const key = keyEventToString(e);
      const actionId = reverseMap[key];
      if (!actionId) return;
      e.stopPropagation();
      dispatchAction(actionId, e);
    }

    document.addEventListener("keydown", onKeyDown, true);

    listen<string>("app-action", (event) => {
      dispatchAction(event.payload);
    }).then((fn) => {
      if (active) {
        unlistenAppAction = fn;
      } else {
        fn(); // StrictMode cleanup ran before promise resolved — unlisten immediately
      }
    });

    return () => {
      active = false;
      document.removeEventListener("keydown", onKeyDown, true);
      unlistenAppAction?.();
    };
  }, [dispatchAction]);

  return (
    <div style={root}>
      <TitleBar onOpenSettings={openSettings} />
      <ResizableSplitter
        left={<ChatPanel />}
        right={<WorkspacePanel />}
        defaultLeftWidth={360}
      />
      {settingsOpen && createPortal(
        <SettingsModal onClose={closeSettings} />,
        document.body
      )}
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
