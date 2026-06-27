use std::sync::Mutex;

use rig::client::CompletionClient;
use rig::completion::Prompt;
use rig::memory::InMemoryConversationMemory;
use rig::providers::ollama;
use tauri::{AppHandle, Emitter, Manager, State};

use super::skills::SkillManager;
use super::state::{AgentState, TerminalResult};
use super::tools::browser::{
    BrowserClickTool, BrowserFillTool, BrowserGetElementsTool, BrowserGetPageInfoTool,
    BrowserGetPageTextTool, BrowserGetSectionTextTool, BrowserGetSectionsTool, BrowserSelectTool,
};
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
    tracing::debug!(target: "ai_workbench_lib", model = %model, url = %ollama_url, msg = %user_message, "run_agent start");
    let memory = app.state::<InMemoryConversationMemory>().inner().clone();

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
        .additional_params(serde_json::json!({ "num_ctx": 8192, "think": true }))
        .default_max_turns(10)
        .memory(memory)
        .tool(LoadSkillTool { app: app.clone() })
        .tool(TerminalTool { app: app.clone() })
        .tool(BrowserGetPageInfoTool { app: app.clone() })
        .tool(BrowserGetPageTextTool { app: app.clone() })
        .tool(BrowserGetSectionsTool { app: app.clone() })
        .tool(BrowserGetSectionTextTool { app: app.clone() })
        .tool(BrowserGetElementsTool { app: app.clone() })
        .tool(BrowserClickTool { app: app.clone() })
        .tool(BrowserFillTool { app: app.clone() })
        .tool(BrowserSelectTool { app: app.clone() })
        .build();

    match agent.prompt(user_message).conversation("main").await {
        Ok(response) => {
            tracing::debug!(target: "ai_workbench_lib", chars = response.len(), "run_agent ok");
            app.emit("agent-message", &response).ok();
            app.emit("agent-done", ()).ok();
        }
        Err(e) => {
            tracing::error!(target: "ai_workbench_lib", error = ?e, "run_agent error");
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
