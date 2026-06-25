use std::sync::Mutex;

use rig::client::CompletionClient;
use rig::completion::Chat;
use rig::providers::ollama;
use tauri::{AppHandle, Emitter, Manager, State};

use super::skills::SkillManager;
use super::state::{AgentState, TerminalResult};
use super::tools::skill_loader::LoadSkillTool;
use super::tools::terminal::TerminalTool;

#[tauri::command]
pub async fn agent_start(
    user_message: String,
    ollama_url: String,
    ollama_model: String,
    app: AppHandle,
) -> Result<(), String> {
    let app_clone = app.clone();
    tokio::spawn(async move {
        run_agent(app_clone, user_message, ollama_url, ollama_model).await;
    });
    Ok(())
}

async fn run_agent(app: AppHandle, user_message: String, ollama_url: String, model: String) {
    let mut history = {
        let state = app.state::<Mutex<AgentState>>();
        let h = state.lock().unwrap().chat_history.clone();
        h
    };

    let client = match ollama::Client::builder().api_key("").base_url(&ollama_url).build() {
        Ok(c) => c,
        Err(e) => {
            app.emit("agent-message", format!("Failed to create Ollama client: {e}")).ok();
            app.emit("agent-done", ()).ok();
            return;
        }
    };

    let skill_prompt = {
        let sm = app.state::<SkillManager>();
        sm.skill_list_prompt()
    };

    let system_prompt = if skill_prompt.is_empty() {
        "You are a helpful AI assistant.".to_string()
    } else {
        format!("You are a helpful AI assistant.\n\n{}", skill_prompt)
    };

    let agent = client
        .agent(&model)
        .preamble(&system_prompt)
        .tool(LoadSkillTool { app: app.clone() })
        .tool(TerminalTool { app: app.clone() })
        .build();

    match agent.chat(user_message, &mut history).await {
        Ok(response) => {
            {
                let state = app.state::<Mutex<AgentState>>();
                state.lock().unwrap().chat_history = history;
            }
            app.emit("agent-message", &response).ok();
            app.emit("agent-done", ()).ok();
        }
        Err(e) => {
            app.emit("agent-message", format!("Agent error: {e}")).ok();
            app.emit("agent-done", ()).ok();
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
