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
              │  (API key vault +     │
              │   OAuth2 proxy)       │
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
| Database | PostgreSQL on Railway |
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
| [Pre-Search Document](./PRESEARCH.md) | Case study analysis, planning checklist, architecture diagrams, cost analysis |
| [Pre-Search PDF](./PRESEARCH.pdf) | PDF version of the pre-search document |
| [API Documentation](./chatbox/docs/API.md) | Developer guide for building third-party apps |
| [Study Guide](./STUDY_GUIDE.md) | Interview-prep reference for all key decisions |
| [Architecture Talk](./ARCHITECTURE_TALK.md) | 5-minute architecture presentation script |
| [Talk Cheatsheet](./TALK_CHEATSHEET.md) | One-page reference for the presentation |
| [Demo Video Script](./DEMO_VIDEO_SCRIPT.md) | Script for the 3-5 minute demo recording |
| [Build Log](./BUILDOUT.md) | Session-by-session development log |
| [Architecture Slides](./ChatBridge_Architecture.pptx) | 8-slide PowerPoint deck |

## Deployed Application

**URL:** https://chatbridge-production.up.railway.app

**Note for Spotify:** The Spotify integration requires users to be added to the app's Developer Mode allowlist (Spotify policy). Contact the developer to be added.

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
