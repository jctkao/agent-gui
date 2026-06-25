use rig::completion::Message;
use tokio::sync::oneshot;

pub struct TerminalResult {
    pub command: String,
    pub output: String,
    pub cancelled: bool,
}

pub struct AgentState {
    pub chat_history: Vec<Message>,
    pub approval_tx: Option<oneshot::Sender<TerminalResult>>,
}

impl Default for AgentState {
    fn default() -> Self {
        AgentState {
            chat_history: Vec::new(),
            approval_tx: None,
        }
    }
}
