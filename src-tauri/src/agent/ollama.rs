use serde_json::{json, Value};

pub async fn call_ollama(url: &str, model: &str, messages: &[Value]) -> Result<Value, String> {
    let client = reqwest::Client::new();

    let body = json!({
        "model": model,
        "messages": messages,
        "stream": false,
        "tools": [{
            "type": "function",
            "function": {
                "name": "run_terminal_command",
                "description": "Run a shell command and return its output. Use this when the user asks you to execute something in the terminal.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "The shell command to execute"
                        }
                    },
                    "required": ["command"]
                }
            }
        }]
    });

    let response = client
        .post(format!("{}/api/chat", url.trim_end_matches('/')))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ollama unreachable at {url}: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Ollama returned {status}: {text}"));
    }

    response
        .json::<Value>()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {e}"))
}
