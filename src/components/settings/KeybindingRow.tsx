import { useEffect, useRef, useState } from "react";
import { ActionDef, detectConflict } from "../../lib/keybindings";

interface Props {
  action: ActionDef;
  effectiveKey: string;
  isOverride: boolean;
  effectiveMap: Record<string, string>;
  onSave: (actionId: string, key: string) => void;
  onReset: (actionId: string) => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "recording"; seq: string }
  | { kind: "proposed"; key: string; conflict: string | null };

function formatKey(e: KeyboardEvent): string | null {
  // Ignore bare modifier keypresses
  if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return null;
  if (e.ctrlKey)  return "Ctrl+"  + e.key;
  if (e.altKey)   return "Alt+"   + e.key;
  if (e.metaKey)  return "Meta+"  + e.key;
  return e.key;
}

export default function KeybindingRow({
  action, effectiveKey, isOverride, effectiveMap, onSave, onReset,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>({ kind: "idle" });
  phaseRef.current = phase;

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  function cancel() {
    clearTimer();
    setPhase({ kind: "idle" });
  }

  function propose(key: string) {
    clearTimer();
    const conflict = detectConflict(action.id, key, effectiveMap);
    setPhase({ kind: "proposed", key, conflict });
  }

  function startRecording() {
    clearTimer();
    setPhase({ kind: "recording", seq: "" });
  }

  function confirm(key: string) {
    onSave(action.id, key);
    setPhase({ kind: "idle" });
  }

  // Keydown listener — active only while recording
  useEffect(() => {
    if (phase.kind !== "recording") return;

    function handleKey(e: KeyboardEvent) {
      const cur = phaseRef.current;
      if (cur.kind !== "recording") return;

      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
        return;
      }

      const key = formatKey(e);
      if (key === null) return;

      e.preventDefault();

      const isModifierCombo = e.ctrlKey || e.altKey || e.metaKey;

      if (isModifierCombo) {
        // Modifier combos commit immediately — no sequence extension possible
        propose(key);
        return;
      }

      const newSeq = cur.seq + key;
      clearTimer();

      // Start 1-second timer; a second keypress within it extends the sequence
      timerRef.current = setTimeout(() => {
        const latest = phaseRef.current;
        if (latest.kind === "recording") propose(latest.seq + (latest.seq === cur.seq ? key : ""));
      }, 1000);

      setPhase({ kind: "recording", seq: newSeq });
    }

    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  // Click-outside cancels recording
  useEffect(() => {
    if (phase.kind !== "recording") return;
    function handleClick() { cancel(); }
    // Defer so the click that started recording doesn't immediately cancel it
    const id = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimer(), []);

  const isRecording = phase.kind === "recording";
  const isProposed  = phase.kind === "proposed";
  const conflict    = isProposed ? phase.conflict : null;

  return (
    <tr style={row}>
      <td style={tdLabel}>{action.label}</td>

      <td style={tdKey}>
        {phase.kind === "idle" && (
          <code style={{ ...kbd, ...(isOverride ? kbdOverride : {}) }}>
            {effectiveKey}
            {isOverride && <span style={overrideDot}> *</span>}
          </code>
        )}
        {phase.kind === "recording" && (
          <span style={recording}>
            {phase.seq ? <code style={kbdRecording}>{phase.seq}</code> : null}
            <span style={cursor}>_</span>
          </span>
        )}
        {phase.kind === "proposed" && (
          <code style={{ ...kbd, ...(conflict ? kbdConflict : kbdOk) }}>
            {phase.key}
          </code>
        )}
      </td>

      <td style={tdConflict}>
        {conflict && <span style={conflictMsg}>{conflict}</span>}
      </td>

      <td style={tdActions}>
        {phase.kind === "idle" && (
          <button onClick={startRecording} style={btnSecondary}>Record</button>
        )}
        {(isRecording || isProposed) && (
          <button onClick={cancel} style={btnSecondary}>Cancel</button>
        )}
        {isProposed && !conflict && (
          <button onClick={() => confirm(phase.key)} style={btnConfirm}>✓</button>
        )}
      </td>

      <td style={tdReset}>
        <button
          onClick={() => onReset(action.id)}
          disabled={!isOverride}
          style={{ ...btnReset, ...(isOverride ? {} : btnResetDisabled) }}
        >
          Reset
        </button>
      </td>
    </tr>
  );
}

const row: React.CSSProperties = {
  borderBottom: "1px dashed var(--border-dash)",
};
const tdLabel: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13,
};
const tdKey: React.CSSProperties = {
  padding: "8px 12px", width: 120,
};
const tdConflict: React.CSSProperties = {
  padding: "8px 12px", fontSize: 12, color: "#c00",
};
const tdActions: React.CSSProperties = {
  padding: "8px 8px", whiteSpace: "nowrap", display: "flex", gap: 6, alignItems: "center",
};
const tdReset: React.CSSProperties = {
  padding: "8px 8px",
};
const kbd: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: 13,
  background: "var(--bg-tab-inactive)",
  border: "1px solid var(--border-dash)",
  borderRadius: 4, padding: "1px 6px",
};
const kbdOverride: React.CSSProperties = {
  fontWeight: 700,
  borderColor: "var(--accent)",
};
const kbdOk: React.CSSProperties = {
  background: "#eafaea", borderColor: "#5a9",
};
const kbdConflict: React.CSSProperties = {
  background: "#fdecea", borderColor: "#c00",
};
const kbdRecording: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: 13,
  background: "#fff8dc", border: "1px solid #c8a900",
  borderRadius: 4, padding: "1px 6px",
};
const recording: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 4,
};
const cursor: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: 13,
  color: "var(--accent)", animation: "none",
};
const overrideDot: React.CSSProperties = {
  color: "var(--accent)", fontWeight: 700,
};
const conflictMsg: React.CSSProperties = {
  color: "#c00",
};
const btnSecondary: React.CSSProperties = {
  background: "none", border: "1px solid var(--border-dash)",
  borderRadius: 6, padding: "3px 10px", cursor: "pointer",
  fontSize: 12, fontFamily: "inherit", color: "var(--text-muted)",
};
const btnConfirm: React.CSSProperties = {
  background: "var(--accent)", color: "#fff",
  border: "none", borderRadius: 6,
  padding: "3px 10px", cursor: "pointer",
  fontSize: 12, fontFamily: "inherit",
};
const btnReset: React.CSSProperties = {
  background: "none", border: "1px solid var(--border-dash)",
  borderRadius: 6, padding: "3px 10px", cursor: "pointer",
  fontSize: 12, fontFamily: "inherit", color: "var(--text-muted)",
};
const btnResetDisabled: React.CSSProperties = {
  opacity: 0.35, cursor: "not-allowed",
};
