use std::sync::Mutex;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, State};

use super::ollama::call_ollama;
use super::state::{AgentState, TerminalResult};

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

                    // Park: create oneshot, store sender, emit to terminal, await receiver
                    let (tx, rx) = tokio::sync::oneshot::channel::<TerminalResult>();
                    {
                        let state = app.state::<Mutex<AgentState>>();
                        state.lock().unwrap().approval_tx = Some(tx);
                    }
                    app.emit("agent-command-to-terminal", &command).ok();

                    let result = rx.await.unwrap_or(TerminalResult {
                        command: String::new(),
                        output: String::new(),
                        cancelled: true,
                    });

                    if result.cancelled {
                        {
                            let state = app.state::<Mutex<AgentState>>();
                            state.lock().unwrap().messages.push(json!({
                                "role": "tool",
                                "content": "User cancelled the command.",
                                "tool_call_id": tool_call_id
                            }));
                        }
                        app.emit("agent-done", ()).ok();
                        break;
                    }

                    app.emit("agent-tool-ran", json!({
                        "command": result.command,
                        "output": result.output
                    })).ok();

                    {
                        let state = app.state::<Mutex<AgentState>>();
                        state.lock().unwrap().messages.push(json!({
                            "role": "tool",
                            "content": result.output,
                            "tool_call_id": tool_call_id
                        }));
                    }
                    // continue loop — call Ollama again with tool result
                } else {
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
pub fn agent_terminal_result(
    command: String,
    output: String,
    cancelled: bool,
    state: State<'_, Mutex<AgentState>>,
) -> Result<(), String> {
    let tx = state.lock().unwrap().approval_tx.take();
    match tx {
        Some(tx) => tx
            .send(TerminalResult { command, output, cancelled })
            .map_err(|_| "Failed to send terminal result".to_string()),
        None => Err("No pending terminal operation".to_string()),
    }
}
