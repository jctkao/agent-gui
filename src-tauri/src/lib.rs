mod commands;

use commands::browser::{
    browser_hide, browser_open, browser_set_rect, browser_show, BrowserOverlayState,
};
use std::sync::Mutex;
use tauri::{LogicalPosition, LogicalSize, Manager, WebviewUrl};
use tauri::webview::WebviewBuilder;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_settings_table",
        sql: "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);",
        kind: MigrationKind::Up,
    }];

    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:settings.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(BrowserOverlayState { last_rect: None }))
        .setup(|app| {
            // Create the browser overlay webview once, at startup, off-screen.
            // Runtime add_child deadlocks on Windows WebView2 (see commands/browser.rs);
            // setup-time creation is the supported multiwebview pattern. Runtime commands
            // only navigate/reposition this existing webview.
            let main_window = app.windows().remove("main").expect("main window not found");
            main_window
                .add_child(
                    WebviewBuilder::new(
                        "browser-overlay",
                        WebviewUrl::External("about:blank".parse().unwrap()),
                    ),
                    LogicalPosition::new(-10000.0, -10000.0),
                    LogicalSize::new(1.0, 1.0),
                )
                .expect("failed to create browser overlay webview");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            browser_open,
            browser_set_rect,
            browser_show,
            browser_hide,
        ]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
