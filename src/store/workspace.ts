import { create } from "zustand";

export type PaneType = "browser" | "file" | "editor" | "terminal";

export interface Pane {
  id: string;
  type: PaneType;
  label: string;
  url?: string;
  shell?: "powershell" | "wsl";
  ptyId?: string;
}

export type WorkspaceMode = "tab" | "split";

interface WorkspaceState {
  mode: WorkspaceMode;
  tabs: Pane[];
  activeTabId: string;
  setMode: (mode: WorkspaceMode) => void;
  setActiveTab: (id: string) => void;
  addTab: (pane: Pane) => void;
  closeTab: (id: string) => void;
  setPtyId: (tabId: string, ptyId: string) => void;
}

const DEFAULT_TABS: Pane[] = [
  { id: "browser-1",  type: "browser",  label: "Browser", url: "https://react.dev" },
  { id: "file-1",     type: "file",     label: "Files" },
  { id: "editor-1",   type: "editor",   label: "Editor" },
  { id: "terminal-1", type: "terminal", label: "Terminal", shell: "powershell" },
];

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  mode: "tab",
  tabs: DEFAULT_TABS,
  activeTabId: DEFAULT_TABS[0].id,

  setMode: (mode) => set({ mode }),
  setActiveTab: (id) => set({ activeTabId: id }),
  addTab: (pane) => set((s) => ({ tabs: [...s.tabs, pane], activeTabId: pane.id })),
  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id ? (tabs[0]?.id ?? "") : s.activeTabId;
      return { tabs, activeTabId };
    }),
  setPtyId: (tabId, ptyId) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, ptyId } : t)),
    })),
}));
