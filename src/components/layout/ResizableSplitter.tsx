import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  minLeft?: number;
  minRight?: number;
}

export default function ResizableSplitter({
  left, right,
  defaultLeftWidth = 360,
  minLeft = 260,
  minRight = 400,
}: Props) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(() => { dragging.current = true; }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newW = Math.max(minLeft, Math.min(e.clientX - rect.left, rect.width - minRight));
      setLeftWidth(newW);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [minLeft, minRight]);

  return (
    <div ref={containerRef} style={container}>
      <div style={{ width: leftWidth, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {left}
      </div>
      <div
        style={handle}
        onMouseDown={onMouseDown}
        title="拖曳調整寬度"
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        {right}
      </div>
    </div>
  );
}

const container: React.CSSProperties = {
  flex: 1, display: "flex", minHeight: 0, overflow: "hidden",
};
const handle: React.CSSProperties = {
  width: 6, flexShrink: 0, cursor: "col-resize",
  borderLeft: "2.5px dashed var(--border-dash-light)",
  background: "transparent",
};
