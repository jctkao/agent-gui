import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../../../store/workspace";
import { Pane } from "../../../store/workspace";
import { createTerminal, destroyTerminal } from "../../../lib/terminalRegistry";

interface Props {
  pane: Pane;
  isActive: boolean;
}

export default function TerminalPane({ pane, isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ptyIdRef = useRef<string | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const setPtyId = useWorkspaceStore((s) => s.setPtyId);

  // Mount: create terminal + PTY session
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = createTerminal(pane.id);
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    let unlistenData: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;
    let disposed = false;

    invoke<string>("pty_create", { shell: pane.shell ?? "powershell" })
      .then(async (ptyId) => {
        if (disposed) {
          invoke("pty_kill", { id: ptyId }).catch(() => {});
          return;
        }
        ptyIdRef.current = ptyId;
        setPtyId(pane.id, ptyId);

        // Forward PTY output to xterm
        unlistenData = await listen<number[]>(`pty-data-${ptyId}`, (ev) => {
          term.write(new Uint8Array(ev.payload));
        });

        // User input → PTY
        term.onData((s) => {
          if (!ptyIdRef.current) return;
          const bytes = Array.from(new TextEncoder().encode(s));
          invoke("pty_write", { id: ptyIdRef.current, data: bytes }).catch(console.error);
        });

        // PTY exit
        unlistenExit = await listen(`pty-exit-${ptyId}`, () => {
          term.writeln("\r\n\x1b[90m[process exited]\x1b[0m");
        });

        // Resize observer
        const ro = new ResizeObserver(() => {
          if (!ptyIdRef.current) return;
          fitAddon.fit();
          const { rows, cols } = term;
          invoke("pty_resize", { id: ptyIdRef.current, rows, cols }).catch(console.error);
        });
        ro.observe(container);

        // Cleanup attached to dispose flag
        return () => ro.disconnect();
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        closeTab(pane.id);
      });

    return () => {
      disposed = true;
      unlistenData?.();
      unlistenExit?.();
      if (ptyIdRef.current) {
        invoke("pty_kill", { id: ptyIdRef.current }).catch(() => {});
      }
      destroyTerminal(pane.id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit when this tab becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  }, [isActive]);

  return (
    <div style={paneStyle}>
      {error && <div style={errorBanner}>{error}</div>}
      <div ref={containerRef} style={xtermContainer} />
    </div>
  );
}

const paneStyle: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
  background: "#2a2a28",
};
const xtermContainer: React.CSSProperties = {
  flex: 1, minHeight: 0, padding: "4px 2px",
};
const errorBanner: React.CSSProperties = {
  padding: "8px 14px",
  background: "#5c1a1a", color: "#ffaaaa",
  fontSize: 12, fontFamily: "'Space Mono', monospace",
};
