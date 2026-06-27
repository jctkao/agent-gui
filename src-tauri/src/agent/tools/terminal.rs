use std::sync::Mutex;

use rig::completion::ToolDefinition;
use rig::tool::Tool;
use serde::Deserialize;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use super::ToolError;
use crate::agent::state::AgentState;

#[derive(Deserialize)]
pub struct TerminalArgs {
    command: String,
}

pub struct TerminalTool {
    pub app: AppHandle,
}

impl Tool for TerminalTool {
    const NAME: &'static str = "run_terminal_command";
    type Error = ToolError;
    type Args = TerminalArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Run a shell command in the terminal and return its output. \
                          The user will be shown the command and must approve before it runs."
                .to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The shell command to execute"
                    }
                },
                "required": ["command"]
            }),
        }
    }

    async fn call(&self, args: TerminalArgs) -> Result<String, ToolError> {
        tracing::debug!(target: "ai_workbench_lib", command = %args.command, "run_terminal_command: emitting to terminal, awaiting approval");
        let (tx, rx) = tokio::sync::oneshot::channel();

        {
            let state = self.app.state::<Mutex<AgentState>>();
            state.lock().unwrap().approval_tx = Some(tx);
        }

        self.app
            .emit("agent-command-to-terminal", &args.command)
            .map_err(|e| ToolError(e.to_string()))?;

        let result = rx.await.map_err(|_| ToolError("Terminal channel closed".to_string()))?;
        tracing::debug!(target: "ai_workbench_lib", cancelled = result.cancelled, output_chars = result.output.len(), "run_terminal_command: received result");

        if result.cancelled {
            return Err(ToolError("User cancelled the command".to_string()));
        }

        Ok(result.output)
    }
}
