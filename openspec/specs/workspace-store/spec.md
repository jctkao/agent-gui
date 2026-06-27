# Spec: Workspace Store

## Purpose

Defines how the workspace store is exposed to external JavaScript contexts (e.g., MCP `webview_execute_js` calls) so that agent skills can read workspace state and invoke store actions from outside the React component tree.

## Requirements

### Requirement: Expose workspace store to window
The app SHALL expose `useWorkspaceStore` on `window.__workspaceStore` after the React app mounts so that external JavaScript (e.g., MCP `webview_execute_js` calls) can read store state and invoke store actions.

#### Scenario: Store accessible from webview JS
- **WHEN** `webview_execute_js` runs `window.__workspaceStore.getState()`
- **THEN** it returns the current workspace state including `tabs` and `activeTabId`

#### Scenario: addTab callable from webview JS
- **WHEN** `webview_execute_js` calls `window.__workspaceStore.getState().addTab({ id, type, label, shell })`
- **THEN** a new tab is added to the workspace and the UI renders the new terminal pane
