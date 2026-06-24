import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { getSetting } from "../../lib/settings";

type Role = "user" | "assistant" | "tool-ran" | "approval";

interface Message {
  id: string;
  role: Role;
  content: string;
  command?: string; // for tool-ran and approval roles
}

let msgCounter = 0;
function nextId() { return `msg-${++msgCounter}`; }

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // Tracks the id of the pending approval message so we can replace it
  const pendingApprovalId = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      listen<string>("agent-approval-needed", (ev) => {
        const id = nextId();
        pendingApprovalId.current = id;
        setMessages((prev) => [
          ...prev,
          { id, role: "approval", content: "", command: ev.payload },
        ]);
      })
    );

    unlisteners.push(
      listen<{ command: string; output: string }>("agent-tool-ran", (ev) => {
        // Replace approval widget with the result
        const approvalId = pendingApprovalId.current;
        pendingApprovalId.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === approvalId
              ? { ...m, role: "tool-ran" as Role, content: ev.payload.output, command: ev.payload.command }
              : m
          )
        );
      })
    );

    unlisteners.push(
      listen("agent-done", () => {
        // Dismiss any lingering approval widget (rejection path)
        const approvalId = pendingApprovalId.current;
        if (approvalId) {
          pendingApprovalId.current = null;
          setMessages((prev) => prev.filter((m) => m.id !== approvalId));
        }
        setSending(false);
      })
    );

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
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

  async function handleApprove(approved: boolean) {
    await invoke("agent_approve", { approved }).catch(console.error);
    if (!approved) {
      // Rejection: remove approval widget immediately (agent-done will re-enable input)
      const approvalId = pendingApprovalId.current;
      pendingApprovalId.current = null;
      setMessages((prev) => prev.filter((m) => m.id !== approvalId));
    } else {
      // Approval: replace widget with "Running…" placeholder
      const approvalId = pendingApprovalId.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === approvalId ? { ...m, role: "assistant" as Role, content: "執行中…" } : m
        )
      );
    }
  }

  return (
    <div style={panel}>
      <div style={header}>
        <span style={{ fontSize: 18, color: "var(--accent)" }}>✦</span>
        <span style={{ fontSize: 17, fontWeight: 700 }}>AI 助理</span>
      </div>

      <div style={messagesStyle}>
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
          if (msg.role === "approval") {
            return (
              <div key={msg.id} style={assistantBubbleWrap}>
                <div style={approvalBlock}>
                  <div style={approvalLabel}>執行以下指令？</div>
                  <div style={approvalCmd} className="selectable">{msg.command}</div>
                  <div style={approvalButtons}>
                    <button onClick={() => handleApprove(true)} style={btnApprove}>執行</button>
                    <button onClick={() => handleApprove(false)} style={btnReject}>拒絕</button>
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
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
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
const approvalBlock: React.CSSProperties = {
  border: "2px solid var(--accent)", borderRadius: 8,
  overflow: "hidden", fontSize: 13,
};
const approvalLabel: React.CSSProperties = {
  background: "var(--accent)", color: "#fff",
  padding: "6px 10px", fontWeight: 700, fontSize: 12,
};
const approvalCmd: React.CSSProperties = {
  padding: "8px 10px", fontFamily: "'Space Mono', monospace",
  whiteSpace: "pre-wrap", background: "var(--bg-panel)",
};
const approvalButtons: React.CSSProperties = {
  display: "flex", gap: 8, padding: "8px 10px",
  background: "var(--bg-panel)", borderTop: "1px solid var(--border-dash)",
};
const btnApprove: React.CSSProperties = {
  background: "var(--accent)", color: "#fff",
  border: "none", borderRadius: 6,
  padding: "4px 14px", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
};
const btnReject: React.CSSProperties = {
  background: "none", border: "2px solid var(--border-dash)",
  borderRadius: 6, padding: "4px 14px",
  cursor: "pointer", fontSize: 13, fontFamily: "inherit",
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
