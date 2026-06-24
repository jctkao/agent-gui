use serde_json::Value;
use tokio::sync::oneshot;

pub struct AgentState {
    pub messages: Vec<Value>,
    pub approval_tx: Option<oneshot::Sender<bool>>,
    pub system_prompt: Option<String>,
}

impl Default for AgentState {
    fn default() -> Self {
        AgentState {
            messages: Vec::new(),
            approval_tx: None,
            system_prompt: None,
        }
    }
}
