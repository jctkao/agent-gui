use tokio::sync::oneshot;

pub struct TerminalResult {
    pub command: String,
    pub output: String,
    pub cancelled: bool,
}

pub struct AgentState {
    pub approval_tx: Option<oneshot::Sender<TerminalResult>>,
}

impl Default for AgentState {
    fn default() -> Self {
        AgentState {
            approval_tx: None,
        }
    }
}
