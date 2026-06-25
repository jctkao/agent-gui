import { getSetting, setSetting } from "./settings";
import { invoke } from "@tauri-apps/api/core";

export type ActionContext = "browser" | "app";

export interface ActionDef {
  id: string;
  label: string;
  context: ActionContext;
  defaultKey: string;
}

export const ACTION_DEFINITIONS: ActionDef[] = [
  // Browser vimium actions
  { id: "scroll_down",      label: "Scroll down",         context: "browser", defaultKey: "j"  },
  { id: "scroll_up",        label: "Scroll up",           context: "browser", defaultKey: "k"  },
  { id: "scroll_half_down", label: "Scroll ½ down",       context: "browser", defaultKey: "d"  },
  { id: "scroll_half_up",   label: "Scroll ½ up",         context: "browser", defaultKey: "u"  },
  { id: "scroll_to_top",    label: "Scroll to top",       context: "browser", defaultKey: "gg" },
  { id: "scroll_to_bottom", label: "Scroll to bottom",    context: "browser", defaultKey: "G"  },
  { id: "history_back",     label: "History back",        context: "browser", defaultKey: "H"  },
  { id: "history_forward",  label: "History forward",     context: "browser", defaultKey: "L"  },
  { id: "reload",           label: "Reload page",         context: "browser", defaultKey: "r"  },
  { id: "hint_mode",        label: "Hint mode (click)",   context: "browser", defaultKey: "f"  },

  // App-level action slots (unimplemented — reserved for future use)
  { id: "open_settings",    label: "Open settings",       context: "app",     defaultKey: "Ctrl+," },
  { id: "focus_chat",       label: "Focus chat input",    context: "app",     defaultKey: "Ctrl+l" },
];

/** Overrides map: action id → user-set key (only entries that differ from default). */
export type Overrides = Record<string, string>;

/** Returns the effective key for every action, merging defaults with overrides. */
export function resolveBindings(overrides: Overrides): Record<string, string> {
  const result: Record<string, string> = {};
  for (const def of ACTION_DEFINITIONS) {
    result[def.id] = overrides[def.id] ?? def.defaultKey;
  }
  return result;
}

/** Loads stored overrides from SQLite. Returns {} if none saved yet. */
export async function loadOverrides(): Promise<Overrides> {
  const raw = await getSetting("keybindings");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Overrides;
  } catch {
    return {};
  }
}

/**
 * Saves overrides to SQLite and syncs Rust managed state so the next
 * browser page load picks up the new bindings.
 */
export async function saveOverrides(overrides: Overrides): Promise<void> {
  await setSetting("keybindings", JSON.stringify(overrides));
  await invoke("sync_keybindings", { overrides });
}

/**
 * Checks whether `proposedKey` conflicts with any existing binding in the
 * same context as `actionId`.
 *
 * Returns a human-readable conflict description, or null if no conflict.
 * Blocks both direct duplicates and prefix relationships.
 */
export function detectConflict(
  actionId: string,
  proposedKey: string,
  effectiveMap: Record<string, string>
): string | null {
  const action = ACTION_DEFINITIONS.find((a) => a.id === actionId);
  if (!action) return null;

  for (const def of ACTION_DEFINITIONS) {
    if (def.id === actionId) continue;
    if (def.context !== action.context) continue;

    const existing = effectiveMap[def.id];
    if (!existing) continue;

    if (existing === proposedKey) {
      return `Already bound to "${def.label}"`;
    }
    if (existing.startsWith(proposedKey)) {
      return `Prefix of "${def.label}" (${existing})`;
    }
    if (proposedKey.startsWith(existing)) {
      return `"${def.label}" (${existing}) is a prefix of this key`;
    }
  }
  return null;
}
