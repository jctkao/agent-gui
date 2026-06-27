import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { getSetting } from "../../lib/settings";
import { getTerminal } from "../../lib/terminalRegistry";
import { useWorkspaceStore, Pane } from "../../store/workspace";

type Role = "user" | "assistant" | "tool-ran" | "terminal-waiting" | "browser-action";

interface Message {
  id: string;
  role: Role;
  content: string;
  command?: string;
}

let msgCounter = 0;
function nextId() { return `msg-${++msgCounter}`; }

function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\[[0-9;]*[mGKHFABCDJST]/g, "")
    .replace(/\x1b\[\?[0-9;]*[hl]/g, "")
    .replace(/\x1b[()][AB012]/g, "")
    .replace(/\r/g, "");
}

function snapshotPrompt(tabId: string): string {
  const term = getTerminal(tabId);
  if (!term) return "";
  const buf = term.buffer.active;
  for (let i = buf.cursorY; i >= 0; i--) {
    const line = buf.getLine(i);
    if (!line) continue;
    const text = line.translateToString(true);
    if (text.trim()) return text.trimEnd();
  }
  return "";
}

const PROMPT_CHARS = ["$", "#", ">", "%", "❯"];

function looksLikePrompt(line: string): boolean {
  const t = line.trimEnd();
  if (t.length === 0 || t.length > 120) return false;
  return PROMPT_CHARS.some((c) => t.endsWith(c));
}

function waitForInitialPrompt(ptyId: string, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    let unlisten: (() => void) | null = null;
    let accum = "";
    const timer = setTimeout(() => {
      unlisten?.();
      reject(new Error("Timed out waiting for terminal prompt"));
    }, timeout);

    listen<number[]>(`pty-data-${ptyId}`, (ev) => {
      accum += new TextDecoder().decode(new Uint8Array(ev.payload));
      const stripped = stripAnsi(accum);
      const lines = stripped.split("\n");
      if (lines.some(looksLikePrompt)) {
        clearTimeout(timer);
        unlisten?.();
        resolve();
      }
    }).then((fn) => { unlisten = fn; });
  });
}

function waitForPtyId(tabId: string, timeout = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    const existing = useWorkspaceStore.getState().tabs.find((t) => t.id === tabId);
    if (existing?.ptyId) { resolve(existing.ptyId); return; }
    const timer = setTimeout(() => { unsub(); resolve(null); }, timeout);
    const unsub = useWorkspaceStore.subscribe((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (tab?.ptyId) { clearTimeout(timer); unsub(); resolve(tab.ptyId); }
    });
  });
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const pendingWaitingId = useRef<string | null>(null);
  const pendingUnlisten = useRef<(() => void) | null>(null);
  const pendingPtyId = useRef<string | null>(null);
  const shouldFocusCancelRef = useRef(false);
  const focusInputOnDoneRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const draftRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 130) + "px";
  }, [input]);

  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];

    unlisteners.push(
      listen<string>("agent-message", (ev) => {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: ev.payload },
        ]);
      })
    );

    unlisteners.push(
      listen<string>("agent-command-to-terminal", (ev) => {
        const suggestedCommand = ev.payload;
        const id = nextId();
        shouldFocusCancelRef.current = document.activeElement?.id === "chat-input";
        pendingWaitingId.current = id;
        setMessages((prev) => [
          ...prev,
          { id, role: "terminal-waiting", content: "", command: suggestedCommand },
        ]);
        handleInjectToTerminal(suggestedCommand, id, shouldFocusCancelRef.current);
      })
    );

    unlisteners.push(
      listen<{ summary: string }>("agent-browser-action", (ev) => {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "browser-action", content: ev.payload.summary },
        ]);
      })
    );

    unlisteners.push(
      listen("agent-done", () => {
        const waitingId = pendingWaitingId.current;
        if (waitingId) {
          pendingWaitingId.current = null;
          setMessages((prev) => prev.filter((m) => m.id !== waitingId));
        }
        setSending(false);
        focusInputOnDoneRef.current = false;
        setTimeout(() => document.getElementById("chat-input")?.focus(), 0);
      })
    );

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInjectToTerminal(suggestedCommand: string, waitingMsgId: string, chatHasFocus = false) {
    const store = useWorkspaceStore.getState();
    const activeTab = store.tabs.find((t) => t.id === store.activeTabId);

    let targetTabId: string;
    let ptyId: string | null;

    if (activeTab?.type === "terminal" && activeTab.ptyId) {
      targetTabId = activeTab.id;
      ptyId = activeTab.ptyId;
    } else {
      const newPane: Pane = {
        id: `terminal-ai-${Date.now()}`,
        type: "terminal",
        label: "Terminal",
        shell: "powershell",
      };
      store.addTab(newPane);
      targetTabId = newPane.id;
      ptyId = await waitForPtyId(targetTabId);
      if (ptyId) {
        try {
          await waitForInitialPrompt(ptyId);
        } catch {
          ptyId = null;
        }
      }
    }

    if (!ptyId) {
      await invoke("agent_terminal_result", { command: "", output: "Failed to open terminal.", cancelled: true }).catch(console.error);
      pendingWaitingId.current = null;
      setMessages((prev) => prev.filter((m) => m.id !== waitingMsgId));
      setSending(false);
      return;
    }

    pendingPtyId.current = ptyId;

    store.setActiveTab(targetTabId);
    setTimeout(() => {
      invoke("main_focus").catch(console.error);
      if (!chatHasFocus) getTerminal(targetTabId)?.focus();
    }, 80);

    // Snapshot prompt for boundary detection
    const promptSnapshot = snapshotPrompt(targetTabId);
    function isPromptLine(line: string): boolean {
      const t = line.trimEnd();
      if (promptSnapshot && t.endsWith(promptSnapshot)) return true;
      return looksLikePrompt(line);
    }

    // Inject command into PTY without newline
    const bytes = Array.from(new TextEncoder().encode(suggestedCommand));
    await invoke("pty_write", { id: ptyId, data: bytes }).catch(console.error);

    // Capture output
    let accum = "";
    let enterDetected = false;
    let resultSent = false;
    let captureUnlistenFn: (() => void) | null = null;

    function cleanup() {
      if (captureUnlistenFn) { captureUnlistenFn(); captureUnlistenFn = null; }
      pendingUnlisten.current = null;
      pendingPtyId.current = null;
    }

    function finishCapture(command: string, output: string, cancelled: boolean) {
      if (resultSent) return;
      resultSent = true;
      cleanup();
      if (pendingWaitingId.current === waitingMsgId) {
        pendingWaitingId.current = null;
      }
      if (cancelled) {
        setMessages((prev) => prev.filter((m) => m.id !== waitingMsgId));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === waitingMsgId
              ? { ...m, role: "tool-ran" as Role, content: output, command }
              : m
          )
        );
      }
      invoke("agent_terminal_result", { command, output, cancelled }).catch(console.error);
    }

    const unlisten = await listen<number[]>(`pty-data-${ptyId}`, (ev) => {
      if (resultSent) return;

      const raw = new TextDecoder().decode(new Uint8Array(ev.payload));
      accum += raw;

      if (!enterDetected) {
        // Wait for Enter: first \r\n in the stream
        const nl = accum.indexOf("\r\n");
        if (nl < 0) return;
        enterDetected = true;
        accum = accum.slice(nl + 2); // keep only post-Enter content
      }

      // Strip ANSI and scan for next prompt
      const stripped = stripAnsi(accum);
      const lines = stripped.split("\n");

      for (let i = lines.length - 1; i >= 0; i--) {
        if (isPromptLine(lines[i])) {
          const outputLines = lines
            .slice(0, i)
            .map((l) => l.trimEnd())
            .filter((l) => l.length > 0);

          const isCancelled = outputLines.some((l) => l.includes("^C") || l.includes(""));

          if (isCancelled) {
            finishCapture("", "", true);
          } else {
            const output = outputLines.join("\n");
            finishCapture(suggestedCommand, output, false);
          }
          return;
        }
      }
    });

    captureUnlistenFn = unlisten;
    pendingUnlisten.current = cleanup;
  }

  async function handleCancel(waitingMsgId: string) {
    const ptyId = pendingPtyId.current;
    if (pendingUnlisten.current) {
      pendingUnlisten.current();
    }
    // Send Ctrl+C to clear the pre-typed command in the terminal
    if (ptyId) {
      await invoke("pty_write", { id: ptyId, data: [0x03] }).catch(console.error);
    }
    pendingWaitingId.current = null;
    focusInputOnDoneRef.current = true;
    setMessages((prev) => prev.filter((m) => m.id !== waitingMsgId));
    await invoke("agent_terminal_result", { command: "", output: "", cancelled: true }).catch(console.error);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    historyRef.current.push(text);
    historyIndexRef.current = -1;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text }]);

    const ollamaUrl = (await getSetting("ollama_url")) ?? "http://localhost:11434";
    const ollamaModel = (await getSetting("ollama_model")) ?? "llama3.2";

    await invoke("agent_start", {
      userMessage: text,
      ollamaUrl,
      ollamaModel,
    }).catch((e: unknown) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: `錯誤：${String(e)}` },
      ]);
      setSending(false);
    });
  }

  return (
    <div style={panel}>
      <div style={header}>
        <span style={{ fontSize: 18, color: "var(--accent)" }}>✦</span>
        <span style={{ fontSize: 17, fontWeight: 700 }}>AI 助理</span>
      </div>

      <div
        style={messagesStyle}
        onClick={(e) => {
          const cancelBtn = document.getElementById("active-cancel-btn");
          if (cancelBtn && !(e.target as Element).closest("button, input, a")) {
            cancelBtn.focus();
          }
        }}
      >
        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} style={userBubbleWrap}>
                <div style={userBubble} className="selectable">{msg.content}</div>
              </div>
            );
          }
          if (msg.role === "assistant") {
            return (
              <div key={msg.id} style={assistantBubbleWrap}>
                <div style={assistantText} className="selectable">{msg.content}</div>
              </div>
            );
          }
          if (msg.role === "tool-ran") {
            return (
              <div key={msg.id} style={assistantBubbleWrap}>
                <div style={toolBlock}>
                  <div style={toolCmd}>$ {msg.command}</div>
                  {msg.content && <div style={toolOutput} className="selectable">{msg.content}</div>}
                </div>
              </div>
            );
          }
          if (msg.role === "browser-action") {
            return (
              <div key={msg.id} style={assistantBubbleWrap}>
                <div style={browserActionBadge}>[Browser] {msg.content}</div>
              </div>
            );
          }
          if (msg.role === "terminal-waiting") {
            return (
              <div key={msg.id} style={assistantBubbleWrap}>
                <div style={waitingBlock}>
                  <div style={waitingLabel}>在 terminal 中等待執行…</div>
                  <div style={waitingCmd} className="selectable">{msg.command}</div>
                  <div style={waitingButtons}>
                    <button
                      id="active-cancel-btn"
                      ref={(el) => {
                        if (el && shouldFocusCancelRef.current) {
                          el.focus();
                          shouldFocusCancelRef.current = false;
                        }
                      }}
                      onClick={() => handleCancel(msg.id)}
                      style={btnCancel}
                    >取消</button>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
        <div ref={bottomRef} />
      </div>

      <div style={inputRow}>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 130) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            } else if (e.key === "ArrowUp" && e.altKey) {
              e.preventDefault();
              const history = historyRef.current;
              if (history.length === 0) return;
              const idx = historyIndexRef.current;
              if (idx === -1) {
                draftRef.current = input;
                historyIndexRef.current = history.length - 1;
              } else if (idx > 0) {
                historyIndexRef.current = idx - 1;
              }
              setInput(history[historyIndexRef.current]);
            } else if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              const idx = historyIndexRef.current;
              if (idx === -1) return;
              const history = historyRef.current;
              if (idx < history.length - 1) {
                historyIndexRef.current = idx + 1;
                setInput(history[historyIndexRef.current]);
              } else {
                historyIndexRef.current = -1;
                setInput(draftRef.current);
              }
            }
          }}
          placeholder={sending ? "等待回應…" : "傳訊息給 AI 助理…"}
          disabled={sending}
          className="selectable"
          style={{ ...inputBox, opacity: sending ? 0.6 : 1 }}
        />
        <button onClick={handleSend} disabled={sending} style={{ ...sendBtn, opacity: sending ? 0.6 : 1 }}>↑</button>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
  background: "var(--bg-panel)",
  borderRight: "2.5px dashed var(--border-dash-light)",
};
const header: React.CSSProperties = {
  height: 42, flexShrink: 0,
  display: "flex", alignItems: "center", gap: 8, padding: "0 16px",
  borderBottom: "2px dashed var(--border-dash)",
};
const messagesStyle: React.CSSProperties = {
  flex: 1, padding: "18px 16px",
  display: "flex", flexDirection: "column", gap: 16,
  overflowY: "auto",
};
const userBubbleWrap: React.CSSProperties = { alignSelf: "flex-end", maxWidth: "78%" };
const assistantBubbleWrap: React.CSSProperties = { alignSelf: "flex-start", maxWidth: "88%" };
const userBubble: React.CSSProperties = {
  background: "var(--bg-titlebar)", border: "2px solid var(--border-dash)",
  borderRadius: "12px 12px 3px 12px", padding: "10px 12px", fontSize: 14,
};
const assistantText: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
};
const toolBlock: React.CSSProperties = {
  border: "2px solid var(--border-dash)", borderRadius: 8,
  overflow: "hidden", fontSize: 13,
};
const toolCmd: React.CSSProperties = {
  background: "var(--bg-titlebar)", padding: "6px 10px",
  fontFamily: "'Space Mono', monospace", fontWeight: 700,
};
const toolOutput: React.CSSProperties = {
  padding: "8px 10px", fontFamily: "'Space Mono', monospace",
  whiteSpace: "pre-wrap", lineHeight: 1.5,
};
const waitingBlock: React.CSSProperties = {
  border: "2px solid var(--accent)", borderRadius: 8,
  overflow: "hidden", fontSize: 13,
};
const waitingLabel: React.CSSProperties = {
  background: "var(--accent)", color: "#fff",
  padding: "6px 10px", fontWeight: 700, fontSize: 12,
};
const waitingCmd: React.CSSProperties = {
  padding: "8px 10px", fontFamily: "'Space Mono', monospace",
  whiteSpace: "pre-wrap", background: "var(--bg-panel)",
};
const waitingButtons: React.CSSProperties = {
  display: "flex", gap: 8, padding: "8px 10px",
  background: "var(--bg-panel)", borderTop: "1px solid var(--border-dash)",
};
const btnCancel: React.CSSProperties = {
  background: "none", border: "2px solid var(--border-dash)",
  borderRadius: 6, padding: "4px 14px",
  cursor: "pointer", fontSize: 13, fontFamily: "inherit",
};
const inputRow: React.CSSProperties = {
  flexShrink: 0, padding: "14px 16px",
  borderTop: "2px dashed var(--border-dash)",
  display: "flex", gap: 8, alignItems: "flex-end",
};
const inputBox: React.CSSProperties = {
  flex: 1, minHeight: 42, maxHeight: 130,
  border: "2px solid var(--border-dash)",
  borderRadius: 10, padding: "10px 12px", fontSize: 15,
  fontFamily: "inherit", background: "#faf9f6", color: "var(--text)",
  resize: "none", overflowY: "auto", lineHeight: 1.5,
};
const sendBtn: React.CSSProperties = {
  width: 42, height: 42, flexShrink: 0,
  border: "2px solid var(--accent)", background: "var(--accent)",
  borderRadius: 10, cursor: "pointer", color: "#fff", fontSize: 18,
};
const browserActionBadge: React.CSSProperties = {
  fontSize: 12, color: "var(--text-muted)",
  fontFamily: "'Space Mono', monospace",
  padding: "3px 8px",
  border: "1px dashed var(--border-dash)",
  borderRadius: 6, display: "inline-block",
};
