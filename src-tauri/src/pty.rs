use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

pub struct PtySession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn Child + Send + Sync>,
}

pub struct PtyManager(pub Mutex<HashMap<String, PtySession>>);

impl Default for PtyManager {
    fn default() -> Self {
        PtyManager(Mutex::new(HashMap::new()))
    }
}

fn resolve_shell(shell: &str) -> CommandBuilder {
    match shell {
        "wsl" => {
            let mut cmd = CommandBuilder::new("wsl.exe");
            cmd.arg("-e");
            cmd.arg("bash");
            cmd
        }
        _ => {
            // Try pwsh first, fall back to powershell
            if which_exists("pwsh.exe") {
                CommandBuilder::new("pwsh.exe")
            } else {
                CommandBuilder::new("powershell.exe")
            }
        }
    }
}

fn which_exists(name: &str) -> bool {
    std::process::Command::new("where.exe")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub fn pty_create(
    shell: String,
    app: AppHandle,
    state: State<PtyManager>,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let cmd = resolve_shell(&shell);
    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    let emit_id = id.clone();
    let emit_app = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data: Vec<u8> = buf[..n].to_vec();
                    emit_app.emit(&format!("pty-data-{}", emit_id), data).ok();
                }
            }
        }
        emit_app.emit(&format!("pty-exit-{}", emit_id), ()).ok();
    });

    let session = PtySession { writer, master: pair.master, child };
    state.0.lock().unwrap().insert(id.clone(), session);

    Ok(id)
}

#[tauri::command]
pub fn pty_write(
    id: String,
    data: Vec<u8>,
    state: State<PtyManager>,
) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    let session = map.get_mut(&id).ok_or_else(|| format!("no PTY session: {id}"))?;
    session.writer.write_all(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(
    id: String,
    rows: u16,
    cols: u16,
    state: State<PtyManager>,
) -> Result<(), String> {
    let map = state.0.lock().unwrap();
    let session = map.get(&id).ok_or_else(|| format!("no PTY session: {id}"))?;
    session
        .master
        .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_kill(id: String, state: State<PtyManager>) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    if let Some(mut session) = map.remove(&id) {
        session.child.kill().ok();
    }
    Ok(())
}
