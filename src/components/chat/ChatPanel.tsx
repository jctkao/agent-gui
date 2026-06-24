import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { Pane, useWorkspaceStore } from "../../store/workspace";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\r/g, "");
}

async function waitForPtyId(tabId: string, timeout = 5000): Promise<string | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const pane = useWorkspaceStore.getState().tabs.find((t) => t.id === tabId);
    if (pane?.ptyId) return pane.ptyId;
    await new Promise((res) => setTimeout(res, 100));
  }
  return null;
}

let msgCounter = 0;
function nextMsgId() { return `msg-${++msgCounter}`; }

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const addTab = useWorkspaceStore((s) => s.addTab);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const cmd = input.trim();
    if (!cmd || sending) return;
    setInput("");
    setSending(true);

    // 3.7: Add user message immediately
    setMessages((prev) => [...prev, { id: nextMsgId(), role: "user", content: cmd }]);

    // 3.3: Find active terminal with a ready ptyId
    let ptyId: string | null = null;
    const readyTerm = tabs.find((t) => t.type === "terminal" && t.ptyId);

    if (readyTerm) {
      // 3.3: Active terminal exists and PTY is ready
      ptyId = readyTerm.ptyId!;
    } else {
      const existingTerm = tabs.find((t) => t.type === "terminal");
      let targetTabId: string;
      if (existingTerm) {
        // 3.5: Terminal tab exists but PTY not yet ready — wait
        targetTabId = existingTerm.id;
      } else {
        // 3.4: No terminal tab at all — auto-create one
        targetTabId = `chat-term-${Date.now()}`;
        const newPane: Pane = { id: targetTabId, type: "terminal", label: "PowerShell", shell: "powershell" };
        addTab(newPane);
      }
      ptyId = await waitForPtyId(targetTabId);
    }

    // 4.5: Timeout or PTY unavailable
    if (!ptyId) {
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), role: "assistant", content: "錯誤：無法連接到 Terminal（逾時），請確認 Terminal 分頁已正常開啟。" },
      ]);
      setSending(false);
      return;
    }

    // 3.6: Send command to PTY
    const bytes = Array.from(new TextEncoder().encode(cmd + "\r"));
    await invoke("pty_write", { id: ptyId, data: bytes }).catch(console.error);

    // 4.1 + 4.2: Subscribe to PTY output for 1.5s
    const chunks: Uint8Array[] = [];
    const unlisten = await listen<number[]>(`pty-data-${ptyId}`, (ev) => {
      chunks.push(new Uint8Array(ev.payload));
    });
    await new Promise((res) => setTimeout(res, 1500));
    unlisten();

    // 4.3 + 4.4: Decode, strip ANSI, strip echoed command, display
    if (chunks.length > 0) {
      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }

      const raw = new TextDecoder().decode(merged);
      const clean = stripAnsi(raw);
      const lines = clean.split("\n");
      const firstIdx = lines.findIndex(
        (l) => l.trim() !== "" && !l.trim().startsWith(cmd.trim())
      );
      const output = (firstIdx >= 0 ? lines.slice(firstIdx) : lines).join("\n").trim();

      if (output) {
        setMessages((prev) => [...prev, { id: nextMsgId(), role: "assistant", content: output }]);
      }
    }

    setSending(false);
  }

  return (
    <div style={panel}>
      <div style={header}>
        <span style={{ fontSize: 18, color: "var(--accent)" }}>✦</span>
        <span style={{ fontSize: 17, fontWeight: 700 }}>AI 助理</span>
      </div>

      <div style={messagesStyle}>
        {messages.map((msg) => (
          <div key={msg.id} style={msg.role === "user" ? userBubbleWrap : assistantBubbleWrap}>
            {msg.role === "user" ? (
              <div style={userBubble} className="selectable">{msg.content}</div>
            ) : (
              <div style={assistantText} className="selectable">{msg.content}</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={sending ? "執行中…" : "輸入指令傳送到 Terminal…"}
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
const inputRow: React.CSSProperties = {
  flexShrink: 0, padding: "14px 16px",
  borderTop: "2px dashed var(--border-dash)",
  display: "flex", gap: 8, alignItems: "center",
};
const inputBox: React.CSSProperties = {
  flex: 1, height: 42, border: "2px solid var(--border-dash)",
  borderRadius: 10, padding: "0 12px", fontSize: 15,
  fontFamily: "inherit", background: "#faf9f6", color: "var(--text)",
};
const sendBtn: React.CSSProperties = {
  width: 42, height: 42, flexShrink: 0,
  border: "2px solid var(--accent)", background: "var(--accent)",
  borderRadius: 10, cursor: "pointer", color: "#fff", fontSize: 18,
};
