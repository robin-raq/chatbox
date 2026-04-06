# ChatBridge

An AI chat platform with third-party app integration for K-12 education.

**Live Demo:** https://chatbridge-production.up.railway.app

**GitLab:** https://labs.gauntletai.com/raqrobinson/chat-bridge

---

## What It Does

ChatBridge lets third-party apps live inside an AI conversation. A student says "let's play chess" and a chess board appears. They ask "look up photosynthesis" and an encyclopedia article renders. They say "find me study music" and Spotify opens with real tracks. The AI stays aware of each app's state throughout.

Built on a fork of [Chatbox](https://github.com/chatboxai/chatbox), an open-source AI chat client.

## Demo Apps

| App | Auth Tier | What It Demonstrates |
|-----|-----------|---------------------|
| **Chess** | Internal (none) | Stockfish engine, bidirectional comms, beginner help |
| **Grokipedia** | External Public (API key) | Wikipedia search + xAI Grok AI articles, credential vault |
| **Drawing Canvas** | Internal (none) | Rich interactive UI, user-triggered completion |
| **Spotify** | External Authenticated (OAuth2) | OAuth popup flow, Web Playback SDK, token persistence |

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                           │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │          React Frontend (Chatbox Fork)           │ │
│  │                                                  │ │
│  │  ┌──────────────┐  ┌─────────────────────────┐  │ │
│  │  │  Chat Panel   │  │      App Panel          │  │ │
│  │  │              │  │  ┌───────────────────┐  │  │ │
│  │  │  Messages    │  │  │ SANDBOXED IFRAME  │  │  │ │
│  │  │  + AI Tools  │  │  │                   │  │  │ │
│  │  │  + Streaming │  │  │  Chess / Grok /   │  │  │ │
│  │  │              │  │  │  Drawing / Spotify│  │  │ │
│  │  │              │  │  │                   │  │  │ │
│  │  └──────────────┘  │  └────────┬──────────┘  │  │ │
│  │                     │          │ postMessage  │  │ │
│  │                     └──────────┴─────────────┘  │ │
│  │                                                  │ │
│  │  State: Zustand + React Query + Jotai            │ │
│  │  AI: Vercel AI SDK (OpenAI + Anthropic)          │ │
│  └─────────────────────────────────────────────────┘ │
│                         │                            │
│                    SSE + REST                         │
│                         │                            │
└─────────────────────────┼────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │   Express Backend     │
              │   (Railway)           │
              │                       │
              │  /api/grokipedia/*    │
              │  /api/spotify/*       │
              │  /api/admin/*         │
              │                       │
              │  Sessions: JSON file  │
              │  Admin: in-memory Map │
              │  API keys: env vars   │
              └───────────────────────┘
```

### Three Key Decisions

1. **Sandboxed Iframes** — Each app runs in its own browser context. It can't read the chat, access cookies, or touch the parent page. Communication happens only through a validated postMessage bridge. Same model as Figma plugins and the MCP Apps spec.

2. **Dynamic Tool Discovery** — Apps declare their capabilities in a JSON manifest. The platform injects tool schemas into the LLM's function-calling interface at runtime. Adding a new app = adding a manifest. No changes to the chat engine.

3. **Three Auth Tiers** — Internal (no auth), External Public (platform-managed API key), External Authenticated (user OAuth2). Trust level is proportional to the app's needs.

### Plugin Protocol

Four message types over postMessage:

| Message | Direction | Purpose |
|---------|-----------|---------|
| `tool_call` | Platform → App | AI invokes a tool |
| `tool_result` | App → Platform | Tool execution result |
| `context_update` | App → Platform | App shares ongoing state |
| `completion` | App → Platform | App signals it's done |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript (Chatbox fork) |
| UI | Mantine v7 + Tailwind CSS |
| State | Zustand + React Query |
| AI/LLM | Vercel AI SDK v6 (OpenAI + Anthropic) |
| Backend | Express on Node.js |
| Session Storage | In-memory Maps + JSON file (production: PostgreSQL/Redis) |
| App Sandboxing | Sandboxed iframes + postMessage |
| Deployment | Railway |

## Setup

### Prerequisites
- Node.js 22+
- pnpm 10+

### Local Development

```bash
# Clone
git clone https://labs.gauntletai.com/raqrobinson/chat-bridge.git
cd chat-bridge

# Install dependencies
pnpm install

# Start web dev server
pnpm dev:web

# Open http://localhost:1212
# Go to Settings > Model Provider > add your OpenAI or Anthropic API key
```

### Build for Production

```bash
CHATBOX_BUILD_PLATFORM=web pnpm build
# Output: release/app/dist/renderer/
```

### Run Tests

```bash
pnpm test
# 24 tests: 13 (AppBridge) + 11 (AppRegistry)
```

## Submission Documents

| Document | Description |
|----------|-------------|
| [Pre-Search Document](./PRESEARCH.md) | Case study analysis, planning checklist, architecture diagrams |
| [Pre-Search PDF](./PRESEARCH.pdf) | PDF version of the pre-search document |
| [API Documentation](./docs/API.md) | Developer guide for building third-party apps |
| [AI Cost Analysis](./docs/COST_ANALYSIS.md) | Dev spend, token breakdown, projections for 100-100K users |

## Deployed Application

**URL:** https://chatbridge-production.up.railway.app

**Note for Spotify:** The Spotify integration requires users to be added to the app's Developer Mode allowlist (Spotify policy). Contact the developer to be added.

## Known Limitations & Future Work

### Scalability

The current architecture handles 1-10 concurrent users (demo scope). Here's what happens as load increases:

**At 100 concurrent users:**
- The Express backend on Railway handles ~100 concurrent connections comfortably (single instance)
- LLM API calls are the bottleneck — each chat turn takes 2-5 seconds for GPT-4o-mini to respond
- Tool schemas (5 apps, 17 tools = ~3,500 tokens) are sent on every request, costing ~$13/month in LLM fees
- Spotify OAuth sessions stored in a JSON file work fine — 100 entries is negligible
- No infrastructure changes needed at this scale

**At 1,000 concurrent users:**
- Express single-instance hits connection limits during peak usage (school bell rings → 1,000 students open chat simultaneously)
- The in-memory `pendingCalls` Map in toolset.ts grows to ~1,000 entries during peak — manageable but needs timeout cleanup
- LLM costs jump to ~$130/month (GPT-4o-mini) — still viable
- The JSON file for Spotify sessions becomes a bottleneck (1,000 writes with file I/O contention)
- **What breaks first:** SSE connection limits on the single Express instance

**At 10,000 concurrent users:**
- Single Express instance cannot handle the load — need horizontal scaling
- Tool schema injection is the #1 cost driver: 3,500 tokens × 10K users × 20 msgs = significant waste
- Spotify session file must be replaced with Redis or PostgreSQL
- Admin review state must move from in-memory Map to a database

**Planned mitigations:**
- **Queue-based tool execution** — Decouple LLM streaming from tool execution using Redis/BullMQ. Tool calls go into a queue, the SSE stream sends a "processing" event, and the result is pushed via WebSocket when ready. This removes the connection-blocking bottleneck.
- **Tool result caching** — If 50 students look up "photosynthesis," cache the first xAI Grok response (TTL 5 min). Eliminates redundant API calls.
- **Horizontal scaling** — Railway supports multi-instance deployments behind a load balancer. Currently the backend uses in-memory Maps and a JSON file for sessions — production would move these to Redis/PostgreSQL for shared state across instances.
- **Selective tool injection** — Only inject schemas for contextually relevant apps per conversation. A keyword/embedding match routes "let's play chess" to inject only chess tools (~800 tokens instead of 3,500). Reduces ~60% of token costs.
- **Connection pooling** — Use a WebSocket connection per user instead of SSE for bidirectional communication, reducing connection overhead.

See [AI Cost Analysis](./docs/COST_ANALYSIS.md) for detailed cost projections at each scale.

### Security

- Spotify tokens are stored server-side in httpOnly cookies (not localStorage)
- Sandboxed iframes isolate app code from the parent page
- App registration is currently code-side only — a production system would add a review UI with pending/approved/rejected states and child-safety criteria
- Rate limiting exists at the postMessage level (20 msg/sec) but should be extended to API proxy routes

### Educational Value

Each app was chosen to demonstrate a different integration pattern, but educational relevance varies:
- **Chess** (high) — Strategic thinking, problem solving, beginner-friendly notation guide
- **Grokipedia** (high) — Research skills, AI-generated articles at the student's reading level
- **Excalidraw** (high) — Visual learning, diagramming, concept mapping
- **Spotify** (low-medium) — Study music has marginal educational value; architecturally demonstrates OAuth2 tier. A better fit would be Google Classroom or a quiz/flashcard app.

## Project Structure (Key Files)

```
chatbox/
├── src/renderer/
│   ├── packages/
│   │   ├── app-registry/          # Plugin system core
│   │   │   ├── types.ts           # API contract types
│   │   │   ├── registry.ts        # App manifest registry
│   │   │   ├── toolset.ts         # LLM tool injection
│   │   │   └── bootstrap.ts       # Built-in app registration
│   │   ├── app-bridge/
│   │   │   └── AppBridge.ts       # postMessage bridge
│   │   └── model-calls/
│   │       └── stream-text.ts     # Modified: injects app tools
│   ├── components/app/
│   │   └── AppPanel.tsx           # Iframe container with error handling
│   ├── public/apps/               # Built-in app HTML files
│   │   ├── chess/
│   │   ├── grokipedia/
│   │   ├── drawing/
│   │   ├── spotify/
│   │   └── sdk/chatbridge-app-sdk.js
│   └── routes/session/
│       └── $sessionId.tsx         # Modified: horizontal split layout
├── docs/
│   └── API.md                     # Third-party developer docs
└── deploy/                        # Railway deployment
    ├── server.js                  # Express static + API proxy
    └── routes/
        ├── grokipedia.js          # Wikipedia + xAI Grok proxy
        └── spotify.js             # OAuth2 + Spotify API proxy
```
