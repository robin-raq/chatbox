# ChatBridge App Developer API

Build interactive apps that live inside the ChatBridge AI chat experience.

---

## Quick Start

Build a working app in 5 minutes.

### 1. Create your app HTML

```html
<!DOCTYPE html>
<html>
<head><title>My App</title></head>
<body>
  <h1 id="output">Waiting for input...</h1>

  <script src="/apps/sdk/chatbridge-app-sdk.js"></script>
  <script>
    // Register a tool the AI can call
    ChatBridge.onToolCall('greet', function(params) {
      document.getElementById('output').textContent = 'Hello, ' + params.name + '!';
      return 'Greeted ' + params.name;
    });
  </script>
</body>
</html>
```

### 2. Define your app manifest

```json
{
  "id": "greeter",
  "name": "Greeter",
  "description": "A simple greeting app",
  "uiUrl": "/apps/greeter/index.html",
  "authTier": "internal",
  "tools": [
    {
      "name": "greet",
      "description": "Greet someone by name",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "description": "The person's name" }
        },
        "required": ["name"]
      }
    }
  ]
}
```

### 3. Register your app

Add your manifest to `src/renderer/packages/app-registry/bootstrap.ts`:

```typescript
appRegistry.registerApp(GREETER_MANIFEST)
```

That's it. When a user says "greet Alice," the AI calls your `greet` tool, your app renders in the side panel, and the AI sees the result.

---

## App Manifest Schema

The manifest tells ChatBridge what your app does, where to load it, and what tools it provides.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (lowercase, no spaces). Used in tool names: `app__{id}__{toolName}` |
| `name` | string | Display name shown in the app panel header |
| `description` | string | Tells the AI when to use your app. Be specific about trigger words. |
| `uiUrl` | string | URL to your app's HTML page (relative or absolute) |
| `authTier` | string | One of: `"internal"`, `"external_public"`, `"external_authenticated"` |
| `tools` | array | List of tool definitions (see below) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `icon` | string | Emoji or icon URL for the app |

### Auth Tiers

| Tier | When to use | Credentials |
|------|------------|-------------|
| `internal` | App has no external dependencies. All logic runs in the iframe. | None |
| `external_public` | App calls an external API with a platform-managed key. | API key stored server-side, never exposed to iframe |
| `external_authenticated` | App needs the user's personal account (OAuth2). | User authorizes via popup, tokens managed by platform |

### Tool Definition

Each tool in the `tools` array has:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tool name (used in `ChatBridge.onToolCall`). Alphanumeric + underscores. |
| `description` | string | Tells the AI what this tool does and when to call it. Be specific. |
| `inputSchema` | object | JSON Schema describing the tool's parameters. Must have `type: "object"`. |

### Input Schema Rules

- Must always have `"type": "object"` at the top level (required by OpenAI)
- Properties use standard JSON Schema types: `string`, `number`, `boolean`
- Use `required` array to mark mandatory parameters
- Use `description` on each property to help the AI fill in values
- For tools with no parameters, use `{ "type": "object", "properties": {} }`

### Example Manifests

**Internal app (no auth):**
```json
{
  "id": "calculator",
  "name": "Calculator",
  "description": "Perform math calculations",
  "uiUrl": "/apps/calculator/index.html",
  "authTier": "internal",
  "tools": [
    {
      "name": "calculate",
      "description": "Evaluate a math expression",
      "inputSchema": {
        "type": "object",
        "properties": {
          "expression": { "type": "string", "description": "Math expression like '2 + 3 * 4'" }
        },
        "required": ["expression"]
      }
    }
  ]
}
```

**External public (API key):**
```json
{
  "id": "weather",
  "name": "Weather",
  "description": "Get current weather for any city",
  "uiUrl": "/apps/weather/index.html",
  "authTier": "external_public",
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather conditions",
      "inputSchema": {
        "type": "object",
        "properties": {
          "city": { "type": "string", "description": "City name" }
        },
        "required": ["city"]
      }
    }
  ]
}
```

**External authenticated (OAuth2):**
```json
{
  "id": "github",
  "name": "GitHub",
  "description": "Manage GitHub repositories and issues",
  "uiUrl": "/apps/github/index.html",
  "authTier": "external_authenticated",
  "tools": [
    {
      "name": "list_repos",
      "description": "List the user's GitHub repositories",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sort": { "type": "string", "description": "Sort by: created, updated, pushed" }
        }
      }
    }
  ]
}
```

---

## postMessage Protocol

Apps communicate with the platform through `window.postMessage`. The SDK handles this for you, but here's the raw protocol.

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `tool_call` | Platform -> App | AI wants to invoke a tool |
| `tool_result` | App -> Platform | Tool execution result (success or error) |
| `context_update` | App -> Platform | App shares state without ending the interaction |
| `completion` | App -> Platform | App signals it's done |
| `error` | Platform -> App | Platform notifies app of an error |

### tool_call (Platform -> App)

Sent when the AI decides to invoke one of your tools.

```json
{
  "type": "tool_call",
  "id": "call_1234567890_abc123",
  "name": "greet",
  "params": { "name": "Alice" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique call ID. Use this in your `tool_result` response. |
| `name` | string | The tool name from your manifest |
| `params` | object | Parameters the AI provided, matching your inputSchema |

### tool_result (App -> Platform)

Your response after executing a tool. Must include the same `id` from the `tool_call`.

**Success:**
```json
{
  "type": "tool_result",
  "id": "call_1234567890_abc123",
  "result": "Greeted Alice successfully"
}
```

**Error:**
```json
{
  "type": "tool_result",
  "id": "call_1234567890_abc123",
  "error": { "code": "invalid_input", "message": "Name cannot be empty" }
}
```

The `result` can be any JSON value (string, object, array, number). The AI sees it as the tool's output. **Tip:** Return plain strings for best results — the AI tends to render JSON objects as code blocks.

### context_update (App -> Platform)

Share state with the platform without ending the interaction. Useful for ongoing apps like games.

```json
{
  "type": "context_update",
  "data": {
    "board_state": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR",
    "last_move": "e4",
    "turn": "black"
  }
}
```

The `data` object can contain anything. The platform logs it and may use it to inform the AI about the app's current state.

### completion (App -> Platform)

Signal that the app's task is done. The platform may remove the iframe.

```json
{
  "type": "completion",
  "result": { "winner": "white", "moves": 42 }
}
```

The `result` is optional. Use it to summarize what happened.

### error (Platform -> App)

The platform notifies your app of an error (e.g., timeout).

```json
{
  "type": "error",
  "code": "timeout",
  "message": "App did not respond within 30 seconds"
}
```

### Validation Rules

- Messages without a `type` field are silently dropped
- Messages with unknown `type` values are silently dropped
- Messages that aren't objects are silently dropped
- Rate limit: 20 messages per second per app. Excess messages are dropped.

---

## ChatBridge App SDK

Include the SDK in your HTML to handle postMessage communication automatically.

```html
<script src="/apps/sdk/chatbridge-app-sdk.js"></script>
```

### ChatBridge.onToolCall(toolName, handler)

Register a handler for a specific tool.

```javascript
ChatBridge.onToolCall('greet', function(params) {
  // params = { name: "Alice" } (from the AI)
  // Return the result (string, object, or any JSON value)
  return 'Hello, ' + params.name + '!';
});
```

**Async handlers** are supported — return a Promise:

```javascript
ChatBridge.onToolCall('fetch_data', function(params) {
  return fetch('/api/data?q=' + params.query)
    .then(function(res) { return res.json(); })
    .then(function(data) { return data.results; });
});
```

**Error handling:** If your handler throws or the Promise rejects, the SDK automatically sends a `tool_result` with an error.

### ChatBridge.sendResult(id, result)

Manually send a tool result. Usually not needed — the SDK does this automatically when your `onToolCall` handler returns.

```javascript
ChatBridge.sendResult('call_123', { status: 'ok' });
```

### ChatBridge.sendError(id, code, message)

Manually send a tool error.

```javascript
ChatBridge.sendError('call_123', 'not_found', 'Item does not exist');
```

### ChatBridge.sendContextUpdate(data)

Share the app's current state. Call this whenever significant state changes (e.g., after a chess move).

```javascript
ChatBridge.sendContextUpdate({
  score: 42,
  level: 3,
  status: 'playing'
});
```

### ChatBridge.sendCompletion(result)

Signal that the app is done. The platform may close the panel.

```javascript
ChatBridge.sendCompletion({ final_score: 100 });
```

---

## Security & Sandboxing

Apps run in a sandboxed iframe with restricted permissions.

### Sandbox Attributes

All apps run with:
```
allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox
```

### What Apps CAN Do

- Run JavaScript
- Load external scripts from CDNs
- Make fetch/XHR requests
- Open popup windows (for OAuth flows)
- Use Web Workers (for compute-heavy tasks)
- Access localStorage (scoped to the iframe's origin)
- Render any HTML/CSS content

### What Apps CANNOT Do

- Access the parent page's DOM
- Read the parent page's cookies
- Navigate the parent page
- Access other apps' data or state
- Read chat history or user profile data
- Communicate with other iframes

### Rate Limits

- **postMessage:** 20 messages per second per app. Excess messages are silently dropped.
- **Tool call timeout:** 30 seconds. If your tool doesn't respond within 30 seconds, the platform returns a timeout error to the AI.

### Best Practices

1. **Return strings from tool handlers** — the AI renders JSON objects as code blocks, but strings as natural text.
2. **Be specific in tool descriptions** — the AI decides which tool to call based on the description. Vague descriptions lead to wrong tool selection.
3. **Send context_update for ongoing state** — the AI can reference your app's state when the user asks questions.
4. **Signal completion when done** — helps the platform manage iframe lifecycle.
5. **Handle errors gracefully** — show user-friendly error messages in your UI, don't just log to console.

---

## Example Apps

ChatBridge ships with 4 built-in apps that demonstrate different integration patterns.

### Chess (`/apps/chess/index.html`)
- **Auth tier:** Internal
- **Pattern:** Complex stateful interaction, bidirectional communication
- **Tools:** `start_game`, `make_move`, `get_board_state`, `get_legal_moves`
- **Notable:** Uses Stockfish.js Web Worker as built-in chess engine. AI acts as coach.

### Grokipedia (`/apps/grokipedia/index.html`)
- **Auth tier:** External Public
- **Pattern:** API proxy for platform-managed credentials
- **Tools:** `search_articles`, `get_article`, `explain_topic`
- **Notable:** Search uses Wikipedia API. Explain uses xAI Grok for AI-generated articles. Falls back to mock data on failure.

### Drawing Canvas (`/apps/drawing/index.html`)
- **Auth tier:** Internal
- **Pattern:** Rich interactive UI with no natural endpoint
- **Tools:** `get_canvas_state`, `clear_canvas`, `add_text`, `export_image`
- **Notable:** HTML5 Canvas with pen, eraser, shapes, colors. User-triggered completion.

### Spotify (`/apps/spotify/index.html`)
- **Auth tier:** External Authenticated
- **Pattern:** OAuth2 flow, multi-step workflow, real-time playback
- **Tools:** `search_tracks`, `create_playlist`, `add_to_playlist`
- **Notable:** Full OAuth2 popup flow. Spotify Web Playback SDK for in-browser audio. Token persistence via localStorage.

---

## Architecture Overview

```
User types message
      |
      v
  LLM (OpenAI/Anthropic via Vercel AI SDK)
      |
      | Function calling: "app__chess__start_game"
      v
  Tool Execute (toolset.ts)
      |
      | Opens app panel if needed
      | Sends tool_call via postMessage
      v
  App Iframe (sandboxed)
      |
      | chatbridge-app-sdk.js handles message
      | Calls your onToolCall handler
      | Sends tool_result back
      v
  Tool Execute receives result
      |
      | Returns to LLM
      v
  LLM generates natural language response
      |
      v
  User sees response + app UI in side panel
```

---

## TypeScript Types

For TypeScript users, the full type definitions are in `src/renderer/packages/app-registry/types.ts`:

```typescript
type BridgeMessageType = 'tool_call' | 'tool_result' | 'context_update' | 'completion' | 'error'

interface AppManifest {
  id: string
  name: string
  description: string
  icon?: string
  uiUrl: string
  authTier: 'internal' | 'external_public' | 'external_authenticated'
  tools: AppToolDefinition[]
}

interface AppToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
```
