import { Terminal } from "@xterm/xterm";

const registry = new Map<string, Terminal>();

export function createTerminal(id: string): Terminal {
  const term = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: "'Space Mono', 'Cascadia Code', monospace",
    theme: {
      background: "#2a2a28",
      foreground: "#d4d0c8",
      cursor: "#d4d0c8",
    },
    scrollback: 1000,
  });
  registry.set(id, term);
  return term;
}

export function getTerminal(id: string): Terminal | undefined {
  return registry.get(id);
}

export function destroyTerminal(id: string): void {
  const term = registry.get(id);
  if (term) {
    term.dispose();
    registry.delete(id);
  }
}
