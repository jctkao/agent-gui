mod commands;
mod pty;

use commands::browser::{
    browser_back, browser_forward, browser_hide, browser_open, browser_reload,
    browser_set_rect, browser_show, BrowserOverlayState,
};
use pty::{pty_create, pty_kill, pty_resize, pty_write, PtyManager};
use std::sync::Mutex;
use tauri::{Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl};
use tauri::webview::{PageLoadEvent, WebviewBuilder};
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
        .manage(PtyManager::default())
        .setup(|app| {
            // Create the browser overlay webview once, at startup, off-screen.
            // Runtime add_child deadlocks on Windows WebView2 (see commands/browser.rs);
            // setup-time creation is the supported multiwebview pattern. Runtime commands
            // only navigate/reposition this existing webview.
            let main_window = app.windows().remove("main").expect("main window not found");
            let app_handle = app.handle().clone();
            main_window
                .add_child(
                    WebviewBuilder::new(
                        "browser-overlay",
                        WebviewUrl::External("about:blank".parse().unwrap()),
                    )
                    .on_page_load(move |wv, payload| {
                        println!("[on_page_load] event={:?} url={}", payload.event(), payload.url());
                        if payload.event() == PageLoadEvent::Finished {
                            let url = payload.url().to_string();
                            if url != "about:blank" {
                                app_handle.emit("browser-url-changed", url).ok();
                                // Inject SPA navigation monitoring.
                                // Uses window.__TAURI__ if available; logs availability for debugging.
                                wv.eval(r#"
                                    (function() {
                                        if (window.__overlayMonitorInstalled) return;
                                        window.__overlayMonitorInstalled = true;
                                        console.log('[browser-overlay] __TAURI__:', typeof window.__TAURI__, 'ipc:', typeof window.ipc);
                                        function notifyUrl() {
                                            var url = window.location.href;
                                            if (window.__TAURI__ && window.__TAURI__.event) {
                                                window.__TAURI__.event.emit('browser-url-changed', url);
                                            }
                                        }
                                        var _push = history.pushState.bind(history);
                                        history.pushState = function(s, t, u) { _push(s, t, u); notifyUrl(); };
                                        var _replace = history.replaceState.bind(history);
                                        history.replaceState = function(s, t, u) { _replace(s, t, u); notifyUrl(); };
                                        window.addEventListener('popstate', notifyUrl);
                                    })();
                                "#).ok();
                            }
                        }
                    }),
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
            browser_back,
            browser_forward,
            browser_reload,
            pty_create,
            pty_write,
            pty_resize,
            pty_kill,
        ]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
