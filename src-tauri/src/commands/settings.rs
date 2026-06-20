// Settings are managed via tauri-plugin-sql directly from the frontend.
// These Rust-side commands are provided as an alternative for
// server-side access if needed in the future.

#[tauri::command]
pub fn placeholder_settings() -> &'static str {
    "settings managed via tauri-plugin-sql on the frontend"
}
