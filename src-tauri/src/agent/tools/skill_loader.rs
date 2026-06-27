use rig::completion::ToolDefinition;
use rig::tool::Tool;
use serde::Deserialize;
use serde_json::json;
use tauri::{AppHandle, Manager};

use super::ToolError;
use crate::agent::skills::SkillManager;

#[derive(Deserialize)]
pub struct LoadSkillArgs {
    name: String,
}

pub struct LoadSkillTool {
    pub app: AppHandle,
}

impl Tool for LoadSkillTool {
    const NAME: &'static str = "load-skill";
    type Error = ToolError;
    type Args = LoadSkillArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Load the full instructions of an available skill by name. \
                          Use this when you decide a skill is relevant to the current task."
                .to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The skill name exactly as listed in the available skills"
                    }
                },
                "required": ["name"]
            }),
        }
    }

    async fn call(&self, args: LoadSkillArgs) -> Result<String, ToolError> {
        tracing::debug!(target: "ai_workbench_lib", skill = %args.name, "load-skill called");
        let skill_manager = self.app.state::<SkillManager>();
        let result = skill_manager.load_skill_body(&args.name).map_err(ToolError);
        tracing::debug!(target: "ai_workbench_lib", skill = %args.name, ok = result.is_ok(), "load-skill done");
        result
    }
}
