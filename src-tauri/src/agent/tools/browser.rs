use std::time::Duration;

use rig::completion::ToolDefinition;
use rig::tool::Tool;
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Listener, Manager};
use tokio::sync::oneshot;

use super::ToolError;

// ── shared helper ─────────────────────────────────────────────────────────────

async fn eval_and_wait(app: &AppHandle, js: &str) -> Result<Value, ToolError> {
    let (tx, rx) = oneshot::channel::<Value>();
    let tx = std::sync::Mutex::new(Some(tx));

    app.once("browser-tool-result", move |ev| {
        let value: Value = serde_json::from_str(ev.payload()).unwrap_or(Value::Null);
        if let Some(sender) = tx.lock().unwrap().take() {
            sender.send(value).ok();
        }
    });

    if let Some(wv) = app.get_webview("browser-overlay") {
        wv.eval(js).map_err(|e| ToolError(format!("eval error: {e}")))?;
    } else {
        return Err(ToolError("Browser overlay not available".into()));
    }

    tokio::time::timeout(Duration::from_secs(10), rx)
        .await
        .map_err(|_| ToolError("Browser tool timed out".into()))?
        .map_err(|_| ToolError("Browser tool channel closed".into()))
}

fn emit_browser_action(app: &AppHandle, summary: &str) {
    app.emit("agent-browser-action", json!({ "summary": summary })).ok();
}

// ── 1. browser_get_page_info ──────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct EmptyArgs {}

pub struct BrowserGetPageInfoTool {
    pub app: AppHandle,
}

impl Tool for BrowserGetPageInfoTool {
    const NAME: &'static str = "browser_get_page_info";
    type Error = ToolError;
    type Args = EmptyArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Return the current URL and page title of the browser pane. \
                          Call this first to confirm which page is loaded."
                .to_string(),
            parameters: json!({ "type": "object", "properties": {}, "required": [] }),
        }
    }

    async fn call(&self, _args: EmptyArgs) -> Result<String, ToolError> {
        let js = r#"
(function() {
  window.__TAURI__.event.emit('browser-tool-result', {
    url: window.location.href,
    title: document.title
  });
})();
"#;
        let v = eval_and_wait(&self.app, js).await?;
        let url = v["url"].as_str().unwrap_or("unknown");
        let title = v["title"].as_str().unwrap_or("unknown");
        Ok(format!("url: {url}\ntitle: {title}"))
    }
}

// ── 2. browser_get_page_text ──────────────────────────────────────────────────

pub struct BrowserGetPageTextTool {
    pub app: AppHandle,
}

impl Tool for BrowserGetPageTextTool {
    const NAME: &'static str = "browser_get_page_text";
    type Error = ToolError;
    type Args = EmptyArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Return the main textual content of the current page (up to 4000 chars). \
                          Uses Mozilla Readability for articles and docs; falls back to \
                          document.body.innerText for web apps. Includes URL and title."
                .to_string(),
            parameters: json!({ "type": "object", "properties": {}, "required": [] }),
        }
    }

    async fn call(&self, _args: EmptyArgs) -> Result<String, ToolError> {
        let js = r#"
(function() {
  var text;
  try {
    var doc = document.cloneNode(true);
    var reader = new Readability(doc);
    var article = reader.parse();
    text = article ? article.textContent : null;
  } catch(e) { text = null; }
  if (!text) text = document.body.innerText || '';
  text = text.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > 4000) text = text.slice(0, 4000) + '...';
  window.__TAURI__.event.emit('browser-tool-result', {
    url: window.location.href,
    title: document.title,
    text: text
  });
})();
"#;
        let v = eval_and_wait(&self.app, js).await?;
        let url = v["url"].as_str().unwrap_or("unknown");
        let title = v["title"].as_str().unwrap_or("unknown");
        let text = v["text"].as_str().unwrap_or("");
        Ok(format!("url: {url}\ntitle: {title}\n\n{text}"))
    }
}

// ── 3. browser_get_sections ───────────────────────────────────────────────────

pub struct BrowserGetSectionsTool {
    pub app: AppHandle,
}

impl Tool for BrowserGetSectionsTool {
    const NAME: &'static str = "browser_get_sections";
    type Error = ToolError;
    type Args = EmptyArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Discover content sections on the page: headings, paragraphs, tables, \
                          lists, article/section elements, and error/alert messages. \
                          Returns up to 30 visible sections with index and a 120-char preview. \
                          Follow up with browser_get_section_text(index) to read a section in full."
                .to_string(),
            parameters: json!({ "type": "object", "properties": {}, "required": [] }),
        }
    }

    async fn call(&self, _args: EmptyArgs) -> Result<String, ToolError> {
        let js = r#"
(function() {
  var sel = 'h1,h2,h3,h4,h5,h6,p,table,ul,ol,article,section,main,[role="main"],[class*="error"],[class*="alert"],[class*="message"]';
  var all = Array.from(document.querySelectorAll(sel));
  var visible = all.filter(function(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (el.textContent || '').trim().length > 0;
  });
  window.__agentSections = visible;
  var result = visible.slice(0, 30).map(function(el, i) {
    return { index: i, tag: el.tagName.toLowerCase(), preview: (el.textContent || '').trim().slice(0, 120) };
  });
  window.__TAURI__.event.emit('browser-tool-result', result);
})();
"#;
        let v = eval_and_wait(&self.app, js).await?;
        let arr = v.as_array().ok_or_else(|| ToolError("Expected array".into()))?;
        if arr.is_empty() {
            return Ok("No content sections found on this page.".into());
        }
        let lines: Vec<String> = arr
            .iter()
            .map(|s| {
                let i = s["index"].as_u64().unwrap_or(0);
                let tag = s["tag"].as_str().unwrap_or("?");
                let preview = s["preview"].as_str().unwrap_or("");
                format!("[{i}] <{tag}> {preview}")
            })
            .collect();
        Ok(lines.join("\n"))
    }
}

// ── 4. browser_get_section_text ───────────────────────────────────────────────

#[derive(Deserialize)]
pub struct IndexArgs {
    pub index: u32,
}

pub struct BrowserGetSectionTextTool {
    pub app: AppHandle,
}

impl Tool for BrowserGetSectionTextTool {
    const NAME: &'static str = "browser_get_section_text";
    type Error = ToolError;
    type Args = IndexArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Return the full text of a content section discovered by browser_get_sections. \
                          The section list resets on page navigation — re-call browser_get_sections after navigating."
                .to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "index": { "type": "integer", "description": "Section index from browser_get_sections" }
                },
                "required": ["index"]
            }),
        }
    }

    async fn call(&self, args: IndexArgs) -> Result<String, ToolError> {
        let js = format!(
            r#"
(function() {{
  var el = (window.__agentSections || [])[{idx}];
  if (!el) {{
    window.__TAURI__.event.emit('browser-tool-result', {{ ok: false, error: 'Section {idx} not found. Re-call browser_get_sections.' }});
    return;
  }}
  window.__TAURI__.event.emit('browser-tool-result', {{ ok: true, text: (el.innerText || el.textContent || '').trim() }});
}})();
"#,
            idx = args.index
        );
        let v = eval_and_wait(&self.app, &js).await?;
        if v["ok"].as_bool() == Some(false) {
            return Err(ToolError(v["error"].as_str().unwrap_or("unknown error").to_string()));
        }
        Ok(v["text"].as_str().unwrap_or("").to_string())
    }
}

// ── 5. browser_get_elements ───────────────────────────────────────────────────

pub struct BrowserGetElementsTool {
    pub app: AppHandle,
}

impl Tool for BrowserGetElementsTool {
    const NAME: &'static str = "browser_get_elements";
    type Error = ToolError;
    type Args = EmptyArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Discover all visible interactive elements on the page: buttons, inputs, \
                          textareas, dropdowns (select), and links. Returns up to 50 elements with \
                          index, tag, label, and type. Call this before browser_click, browser_fill, \
                          or browser_select. Re-call after page navigation."
                .to_string(),
            parameters: json!({ "type": "object", "properties": {}, "required": [] }),
        }
    }

    async fn call(&self, _args: EmptyArgs) -> Result<String, ToolError> {
        let js = r#"
(function() {
  var sel = 'button:not([disabled]),input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]';
  var all = Array.from(document.querySelectorAll(sel));
  var visible = all.filter(function(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  window.__agentElements = visible;
  var result = visible.slice(0, 50).map(function(el, i) {
    var label = el.getAttribute('aria-label')
      || el.getAttribute('title')
      || (el.labels && el.labels[0] ? el.labels[0].textContent.trim() : '')
      || (el.textContent || '').trim().slice(0, 80)
      || el.getAttribute('placeholder')
      || el.getAttribute('name')
      || '';
    var item = { index: i, tag: el.tagName.toLowerCase(), label: label };
    if (el.type) item.type = el.type;
    if (el.tagName === 'A') item.href = el.href;
    if (el.tagName === 'SELECT') {
      item.options = Array.from(el.options).map(function(o) { return o.text; });
    }
    return item;
  });
  window.__TAURI__.event.emit('browser-tool-result', result);
})();
"#;
        let v = eval_and_wait(&self.app, js).await?;
        let arr = v.as_array().ok_or_else(|| ToolError("Expected array".into()))?;
        if arr.is_empty() {
            return Ok("No interactive elements found on this page.".into());
        }
        let lines: Vec<String> = arr
            .iter()
            .map(|el| {
                let i = el["index"].as_u64().unwrap_or(0);
                let tag = el["tag"].as_str().unwrap_or("?");
                let label = el["label"].as_str().unwrap_or("");
                let mut extra = String::new();
                if let Some(t) = el["type"].as_str() {
                    extra.push_str(&format!(" type={t}"));
                }
                if let Some(href) = el["href"].as_str() {
                    extra.push_str(&format!(" href={href}"));
                }
                if let Some(opts) = el["options"].as_array() {
                    let names: Vec<&str> = opts.iter().filter_map(|o| o.as_str()).take(5).collect();
                    extra.push_str(&format!(" options=[{}]", names.join(", ")));
                }
                format!("[{i}] <{tag}> \"{label}\"{extra}")
            })
            .collect();
        Ok(lines.join("\n"))
    }
}

// ── 6. browser_click ─────────────────────────────────────────────────────────

pub struct BrowserClickTool {
    pub app: AppHandle,
}

impl Tool for BrowserClickTool {
    const NAME: &'static str = "browser_click";
    type Error = ToolError;
    type Args = IndexArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Click an interactive element by its index from browser_get_elements. \
                          Works for buttons, links, checkboxes, and any clickable element. \
                          Clicking a link will navigate the page — re-call browser_get_elements afterwards."
                .to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "index": { "type": "integer", "description": "Element index from browser_get_elements" }
                },
                "required": ["index"]
            }),
        }
    }

    async fn call(&self, args: IndexArgs) -> Result<String, ToolError> {
        let js = format!(
            r#"
(function() {{
  var el = (window.__agentElements || [])[{idx}];
  if (!el) {{
    window.__TAURI__.event.emit('browser-tool-result', {{ ok: false, error: 'Element {idx} not found. Re-call browser_get_elements.' }});
    return;
  }}
  var label = el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 60) || String({idx});
  el.click();
  window.__TAURI__.event.emit('browser-tool-result', {{ ok: true, label: label }});
}})();
"#,
            idx = args.index
        );
        let v = eval_and_wait(&self.app, &js).await?;
        if v["ok"].as_bool() == Some(false) {
            return Err(ToolError(v["error"].as_str().unwrap_or("click failed").to_string()));
        }
        let label = v["label"].as_str().unwrap_or(&args.index.to_string()).to_string();
        emit_browser_action(&self.app, &format!("Clicked \"{label}\""));
        Ok(format!("Clicked \"{label}\""))
    }
}

// ── 7. browser_fill ───────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct FillArgs {
    pub index: u32,
    pub value: String,
}

pub struct BrowserFillTool {
    pub app: AppHandle,
}

impl Tool for BrowserFillTool {
    const NAME: &'static str = "browser_fill";
    type Error = ToolError;
    type Args = FillArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Set the value of an input or textarea by its index from browser_get_elements. \
                          Compatible with React and other frameworks (uses native setter + synthetic events)."
                .to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "index": { "type": "integer", "description": "Element index from browser_get_elements (must be input or textarea)" },
                    "value": { "type": "string", "description": "Text to enter into the field" }
                },
                "required": ["index", "value"]
            }),
        }
    }

    async fn call(&self, args: FillArgs) -> Result<String, ToolError> {
        let value_json = serde_json::to_string(&args.value)
            .map_err(|e| ToolError(format!("JSON encode error: {e}")))?;
        let js = format!(
            r#"
(function() {{
  var el = (window.__agentElements || [])[{idx}];
  if (!el) {{
    window.__TAURI__.event.emit('browser-tool-result', {{ ok: false, error: 'Element {idx} not found. Re-call browser_get_elements.' }});
    return;
  }}
  var value = {value_json};
  var label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || String({idx});
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
    ? Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    : (Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value') || {{}}).set;
  if (nativeSetter) {{ nativeSetter.call(el, value); }}
  else {{ el.value = value; }}
  el.dispatchEvent(new Event('input', {{ bubbles: true }}));
  el.dispatchEvent(new Event('change', {{ bubbles: true }}));
  window.__TAURI__.event.emit('browser-tool-result', {{ ok: true, label: label }});
}})();
"#,
            idx = args.index,
            value_json = value_json,
        );
        let v = eval_and_wait(&self.app, &js).await?;
        if v["ok"].as_bool() == Some(false) {
            return Err(ToolError(v["error"].as_str().unwrap_or("fill failed").to_string()));
        }
        let label = v["label"].as_str().unwrap_or(&args.index.to_string()).to_string();
        emit_browser_action(&self.app, &format!("Filled \"{label}\" with {}", serde_json::to_string(&args.value).unwrap_or_default()));
        Ok(format!("Filled \"{label}\""))
    }
}

// ── 8. browser_select ────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SelectArgs {
    pub index: u32,
    pub value: String,
}

pub struct BrowserSelectTool {
    pub app: AppHandle,
}

impl Tool for BrowserSelectTool {
    const NAME: &'static str = "browser_select";
    type Error = ToolError;
    type Args = SelectArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Select an option in a <select> dropdown by its index from browser_get_elements. \
                          Matches by option visible text (substring) or by option value attribute."
                .to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "index": { "type": "integer", "description": "Element index from browser_get_elements (must be a select)" },
                    "value": { "type": "string", "description": "Option label text (or value attribute) to select" }
                },
                "required": ["index", "value"]
            }),
        }
    }

    async fn call(&self, args: SelectArgs) -> Result<String, ToolError> {
        let value_json = serde_json::to_string(&args.value)
            .map_err(|e| ToolError(format!("JSON encode error: {e}")))?;
        let js = format!(
            r#"
(function() {{
  var el = (window.__agentElements || [])[{idx}];
  if (!el || el.tagName !== 'SELECT') {{
    window.__TAURI__.event.emit('browser-tool-result', {{ ok: false, error: 'Element {idx} is not a <select>. Re-call browser_get_elements.' }});
    return;
  }}
  var target = {value_json};
  var label = el.getAttribute('aria-label') || el.getAttribute('name') || String({idx});
  var opts = Array.from(el.options);
  var opt = opts.find(function(o) {{ return o.text.indexOf(target) >= 0 || o.value === target; }});
  if (!opt) {{
    window.__TAURI__.event.emit('browser-tool-result', {{ ok: false, error: 'Option "' + target + '" not found in select "{idx}". Available: ' + opts.map(function(o){{return o.text;}}).join(', ') }});
    return;
  }}
  el.value = opt.value;
  el.dispatchEvent(new Event('change', {{ bubbles: true }}));
  window.__TAURI__.event.emit('browser-tool-result', {{ ok: true, label: label, selected: opt.text }});
}})();
"#,
            idx = args.index,
            value_json = value_json,
        );
        let v = eval_and_wait(&self.app, &js).await?;
        if v["ok"].as_bool() == Some(false) {
            return Err(ToolError(v["error"].as_str().unwrap_or("select failed").to_string()));
        }
        let label = v["label"].as_str().unwrap_or(&args.index.to_string()).to_string();
        let selected = v["selected"].as_str().unwrap_or(&args.value).to_string();
        emit_browser_action(&self.app, &format!("Selected \"{selected}\" in \"{label}\""));
        Ok(format!("Selected \"{selected}\" in \"{label}\""))
    }
}
