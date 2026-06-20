import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: string;
}

const STUB_MESSAGES: Message[] = [
  { id: "1", role: "user", content: "幫我看一下 main.py 的 parse 邏輯" },
  {
    id: "2", role: "assistant",
    content: "好的，我來看看 main.py 的解析邏輯。",
    action: "已開啟 main.py 於新分頁",
  },
  { id: "3", role: "assistant", content: "第 12–34 行的 parse 函式有一個邊界案例需要注意⋯" },
];

export default function ChatPanel() {
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;
    setInput("");
    // TODO: invoke Claude API
  }

  return (
    <div style={panel}>
      {/* Header */}
      <div style={header}>
        <span style={{ fontSize: 18, color: "var(--accent)" }}>✦</span>
        <span style={{ fontSize: 17, fontWeight: 700 }}>AI 助理</span>
      </div>

      {/* Message list */}
      <div style={messages}>
        {STUB_MESSAGES.map((msg) => (
          <div key={msg.id} style={msg.role === "user" ? userBubbleWrap : assistantBubbleWrap}>
            {msg.role === "user" ? (
              <div style={userBubble} className="selectable">{msg.content}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={assistantText} className="selectable">{msg.content}</div>
                {msg.action && (
                  <div style={actionChip}>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>↗</span>
                    <span style={{ color: "var(--accent)", fontSize: 14, fontWeight: 700 }}>
                      {msg.action}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="輸入訊息給 AI…"
          className="selectable"
          style={inputBox}
        />
        <button onClick={handleSend} style={sendBtn}>↑</button>
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
const messages: React.CSSProperties = {
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
const assistantText: React.CSSProperties = { fontSize: 14, lineHeight: 1.5 };
const actionChip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  border: "2px dashed var(--accent)", borderRadius: 9,
  padding: "6px 10px", background: "var(--accent-bg)",
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
