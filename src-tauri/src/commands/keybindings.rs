use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

pub const DEFAULT_BINDINGS: &[(&str, &str)] = &[
    ("scroll_down",      "j"),
    ("scroll_up",        "k"),
    ("scroll_half_down", "d"),
    ("scroll_half_up",   "u"),
    ("scroll_to_top",    "gg"),
    ("scroll_to_bottom", "G"),
    ("history_back",     "H"),
    ("history_forward",  "L"),
    ("reload",           "r"),
    ("hint_mode",        "f"),
];

// App-context actions and their defaults. Key format matches keyEventToString in App.tsx.
pub const DEFAULT_APP_BINDINGS: &[(&str, &str)] = &[
    ("open_settings",   "Ctrl+,"),
    ("focus_chat",      "Alt+n"),
    ("focus_workspace", "Alt+m"),
    ("tab_prev",        "Alt+j"),
    ("tab_next",        "Alt+k"),
    ("tab_first",       "Alt+1"),
    ("tab_last",        "Alt+0"),
];

/// Holds user overrides: action_id → custom key.
/// Absent means "use default".
pub struct KeybindingState(pub Mutex<HashMap<String, String>>);

impl Default for KeybindingState {
    fn default() -> Self {
        KeybindingState(Mutex::new(HashMap::new()))
    }
}

/// Builds the JS snippet that sets window.__bindings and window.__app_bindings,
/// merging defaults with overrides. Key format for app bindings matches keyEventToString in App.tsx.
pub fn bindings_js(overrides: &HashMap<String, String>) -> String {
    let browser_entries: Vec<String> = DEFAULT_BINDINGS
        .iter()
        .map(|(id, default_key)| {
            let key = overrides.get(*id).map(String::as_str).unwrap_or(default_key);
            format!("\"{}\":\"{}\"", id, key.replace('"', "\\\""))
        })
        .collect();
    let app_entries: Vec<String> = DEFAULT_APP_BINDINGS
        .iter()
        .map(|(id, default_key)| {
            let key = overrides.get(*id).map(String::as_str).unwrap_or(default_key);
            format!("\"{}\":\"{}\"", id, key.replace('"', "\\\""))
        })
        .collect();
    format!(
        "window.__bindings={{{}}};window.__app_bindings={{{}}};",
        browser_entries.join(","),
        app_entries.join(",")
    )
}

/// Called from the frontend after the user saves bindings.
/// Updates managed state so the next page load picks up the new bindings.
#[tauri::command]
pub fn sync_keybindings(
    state: State<'_, KeybindingState>,
    overrides: HashMap<String, String>,
) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = overrides;
    Ok(())
}
