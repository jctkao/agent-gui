use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, State};

pub struct BrowserOverlayState {
    pub last_rect: Option<(f64, f64, f64, f64)>,
}

fn off_screen_rect() -> tauri::Rect {
    tauri::Rect {
        position: tauri::Position::Logical(LogicalPosition::new(-10000.0, -10000.0)),
        size: tauri::Size::Logical(LogicalSize::new(1.0, 1.0)),
    }
}

fn logical_rect(x: f64, y: f64, w: f64, h: f64) -> tauri::Rect {
    tauri::Rect {
        position: tauri::Position::Logical(LogicalPosition::new(x, y)),
        size: tauri::Size::Logical(LogicalSize::new(w, h)),
    }
}

// The "browser-overlay" webview is created once at startup in lib.rs `setup()`.
// Creating a child webview at runtime (`Window::add_child`) deadlocks on Windows:
// WebView2's controller-creation completion is delivered through the event loop,
// so blocking the command on it (even via run_on_main_thread) re-enters the loop
// and hangs. At runtime we only navigate/reposition the existing webview, which
// does not create a controller and therefore never blocks.

#[tauri::command]
pub fn browser_open(
    app: AppHandle,
    state: State<'_, Mutex<BrowserOverlayState>>,
    url: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    let parsed_url: tauri::Url = url.parse().map_err(|e| format!("Invalid URL: {e}"))?;
    s.last_rect = Some((x, y, w, h));

    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.navigate(parsed_url).map_err(|e| e.to_string())?;
        wv.set_bounds(logical_rect(x, y, w, h)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_set_rect(
    app: AppHandle,
    state: State<'_, Mutex<BrowserOverlayState>>,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.last_rect = Some((x, y, w, h));
    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.set_bounds(logical_rect(x, y, w, h)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_show(
    app: AppHandle,
    state: State<'_, Mutex<BrowserOverlayState>>,
) -> Result<(), String> {
    let s = state.lock().map_err(|e| e.to_string())?;
    if let Some(wv) = app.get_webview("browser-overlay") {
        let rect = s.last_rect
            .map(|(x, y, w, h)| logical_rect(x, y, w, h))
            .unwrap_or_else(off_screen_rect);
        wv.set_bounds(rect).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_hide(app: AppHandle) -> Result<(), String> {
    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.set_bounds(off_screen_rect()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_back(app: AppHandle) -> Result<(), String> {
    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.eval("history.back()").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_forward(app: AppHandle) -> Result<(), String> {
    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.eval("history.forward()").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_reload(app: AppHandle) -> Result<(), String> {
    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.eval("location.reload()").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_focus(app: AppHandle) -> Result<(), String> {
    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
