use std::sync::Mutex;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, State};

use super::ollama::call_ollama;
use super::state::AgentState;

#[tauri::command]
pub async fn agent_start(
    user_message: String,
    ollama_url: String,
    ollama_model: String,
    app: AppHandle,
    state: State<'_, Mutex<AgentState>>,
) -> Result<(), String> {
    {
        let mut s = state.lock().unwrap();
        s.messages.push(json!({ "role": "user", "content": user_message }));
    }

    let app_clone = app.clone();
    tokio::spawn(async move {
        run_loop(app_clone, ollama_url, ollama_model).await;
    });

    Ok(())
}

async fn run_loop(app: AppHandle, url: String, model: String) {
    loop {
        // Build message list (prepend system prompt if set, then history)
        let messages = {
            let state = app.state::<Mutex<AgentState>>();
            let s = state.lock().unwrap();
            let mut msgs = Vec::new();
            if let Some(sp) = &s.system_prompt {
                msgs.push(json!({ "role": "system", "content": sp }));
            }
            msgs.extend(s.messages.clone());
            msgs
        };

        match call_ollama(&url, &model, &messages).await {
            Err(e) => {
                app.emit("agent-message", &e).ok();
                app.emit("agent-done", ()).ok();
                break;
            }
            Ok(response) => {
                let message = response["message"].clone();
                let tool_calls = message["tool_calls"].as_array().cloned();

                if let Some(calls) = tool_calls.filter(|v| !v.is_empty()) {
                    // Append assistant message (with tool_calls) to history
                    {
                        let state = app.state::<Mutex<AgentState>>();
                        state.lock().unwrap().messages.push(message.clone());
                    }

                    let call = &calls[0];
                    let tool_call_id = call["id"].as_str().unwrap_or("call_0").to_string();
                    let command = call["function"]["arguments"]["command"]
                        .as_str()
                        .unwrap_or("")
                        .to_string();

                    // Park: create oneshot, store sender, emit approval request, await receiver
                    let (tx, rx) = tokio::sync::oneshot::channel::<bool>();
                    {
                        let state = app.state::<Mutex<AgentState>>();
                        state.lock().unwrap().approval_tx = Some(tx);
                    }
                    app.emit("agent-approval-needed", &command).ok();

                    let approved = rx.await.unwrap_or(false);

                    let tool_result = if approved {
                        let cmd = command.clone();
                        let output = tokio::task::spawn_blocking(move || {
                            std::process::Command::new("powershell")
                                .args(["-Command", &cmd])
                                .output()
                        })
                        .await;

                        let combined = match output {
                            Ok(Ok(o)) => {
                                let mut out = String::from_utf8_lossy(&o.stdout).to_string();
                                let err = String::from_utf8_lossy(&o.stderr).to_string();
                                if !err.is_empty() {
                                    out.push_str(&err);
                                }
                                out.trim().to_string()
                            }
                            Ok(Err(e)) => e.to_string(),
                            Err(e) => e.to_string(),
                        };

                        app.emit("agent-tool-ran", json!({ "command": command, "output": combined })).ok();
                        combined
                    } else {
                        "User rejected the command.".to_string()
                    };

                    {
                        let state = app.state::<Mutex<AgentState>>();
                        state.lock().unwrap().messages.push(json!({
                            "role": "tool",
                            "content": tool_result,
                            "tool_call_id": tool_call_id
                        }));
                    }
                    // continue loop — call Ollama again with tool result
                } else {
                    // Final text response
                    let content = message["content"].as_str().unwrap_or("").to_string();
                    {
                        let state = app.state::<Mutex<AgentState>>();
                        state.lock().unwrap().messages.push(json!({
                            "role": "assistant",
                            "content": content
                        }));
                    }
                    app.emit("agent-message", &content).ok();
                    app.emit("agent-done", ()).ok();
                    break;
                }
            }
        }
    }
}

#[tauri::command]
pub fn agent_approve(
    approved: bool,
    state: State<'_, Mutex<AgentState>>,
) -> Result<(), String> {
    let tx = state.lock().unwrap().approval_tx.take();
    match tx {
        Some(tx) => tx.send(approved).map_err(|_| "Failed to send approval signal".to_string()),
        None => Err("No pending approval".to_string()),
    }
}
