use std::fs;
use std::path::{Path, PathBuf};

pub struct SkillMeta {
    pub name: String,
    pub description: String,
    pub path: PathBuf,
}

pub struct SkillManager {
    skills: Vec<SkillMeta>,
}

impl SkillManager {
    pub fn load(dir: &Path) -> Self {
        let skills = if dir.is_dir() {
            Self::scan_dir(dir)
        } else {
            Vec::new()
        };
        SkillManager { skills }
    }

    fn scan_dir(dir: &Path) -> Vec<SkillMeta> {
        let mut skills = Vec::new();
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return skills,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let skill_md = path.join("SKILL.md");
            if !skill_md.exists() {
                continue;
            }
            match Self::parse_frontmatter(&skill_md) {
                Some((name, description)) => {
                    skills.push(SkillMeta { name, description, path });
                }
                None => {
                    eprintln!("[skills] skipping {:?}: missing name or description", skill_md);
                }
            }
        }
        skills
    }

    fn parse_frontmatter(skill_md: &Path) -> Option<(String, String)> {
        let content = fs::read_to_string(skill_md).ok()?;
        let inner = content.strip_prefix("---\n")?;
        let end = inner.find("\n---")?;
        let frontmatter = &inner[..end];

        let mut name = None;
        let mut description = None;

        for line in frontmatter.lines() {
            if let Some(val) = line.strip_prefix("name:") {
                name = Some(val.trim().to_string());
            } else if let Some(val) = line.strip_prefix("description:") {
                description = Some(val.trim().to_string());
            }
        }

        Some((name?, description?))
    }

    pub fn skill_list_prompt(&self) -> String {
        if self.skills.is_empty() {
            return String::new();
        }
        let mut lines = vec!["Available skills (use load-skill tool to load full instructions when needed):".to_string()];
        for s in &self.skills {
            lines.push(format!("- {}: {}", s.name, s.description));
        }
        lines.join("\n")
    }

    pub fn load_skill_body(&self, name: &str) -> Result<String, String> {
        let meta = self.skills.iter().find(|s| s.name == name)
            .ok_or_else(|| format!("Skill '{}' not found", name))?;

        let content = fs::read_to_string(meta.path.join("SKILL.md"))
            .map_err(|e| format!("Failed to read SKILL.md for '{}': {}", name, e))?;

        // Strip frontmatter: everything after the closing ---
        let after_open = content.strip_prefix("---\n").unwrap_or(&content);
        let body = if let Some(pos) = after_open.find("\n---") {
            after_open[pos + 4..].trim_start_matches('\n').to_string()
        } else {
            content
        };

        Ok(body)
    }
}
