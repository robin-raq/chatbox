# AI Cost Analysis

## Development Costs

### LLM API Spend During Development

| Provider | Model | Usage | Est. Cost |
|----------|-------|-------|-----------|
| OpenAI | GPT-4o-mini | ~300 chat turns for testing tool calling, chess, Grokipedia, Spotify, Language Tutor, multi-app routing | ~$0.75 |
| OpenAI | GPT-5 | ~30 chat turns testing chess gameplay and multi-step tool orchestration | ~$3.00 |
| Anthropic | Claude Sonnet 4.5 | ~100 chat turns testing tool reliability, Spotify OAuth, Language Tutor vocabulary generation, multi-app tabs | ~$6.00 |
| xAI | Grok-3-mini | ~50 article generation calls via Grokipedia backend (explain_topic endpoint) | ~$0.50 |
| **Total LLM** | | | **~$10.25** |

### Other AI-Related Costs

| Service | Usage | Cost |
|---------|-------|------|
| Railway hosting | Web service + ~40 deploys over development | ~$5.00 |
| Spotify API | Free tier (Development Mode, 5-user allowlist) | $0.00 |
| Wikipedia API | Free, no key required | $0.00 |
| xAI Grok API | Free tier credits (used for Grokipedia article generation) | $0.00 |
| **Total Other** | | **~$5.00** |

### Total Development Cost: **~$15.25**

---

## Token Breakdown

### Average Tokens Per Chat Turn

| Component | Input Tokens | Output Tokens |
|-----------|-------------|---------------|
| System prompt | ~200 | — |
| Conversation history (5 turns) | ~1,000 | — |
| Tool schemas (5 apps, 17 tools) | ~3,500 | — |
| User message | ~50 | — |
| AI response | — | ~300 |
| Tool call + result (if triggered) | ~200 | ~200 |
| **Total per turn** | **~4,950** | **~500** |

### Tool Schema Token Cost by App

| App | Tools | Est. Schema Tokens |
|-----|-------|--------------------|
| Chess | 4 (start_game, make_move, get_board_state, get_legal_moves) | ~800 |
| Grokipedia | 3 (search_articles, get_article, explain_topic) | ~600 |
| Excalidraw | 3 (open_whiteboard, get_canvas_state, clear_canvas) | ~400 |
| Language Tutor | 4 (start_lesson, generate_vocab, quiz_student, translate) | ~900 |
| Spotify | 3 (search_tracks, create_playlist, add_to_playlist) | ~800 |
| **Total** | **17** | **~3,500** |

### Token Cost Per Turn (by model)

| Model | Input Cost | Output Cost | Total/Turn |
|-------|-----------|-------------|------------|
| GPT-4o-mini | $0.00074 | $0.00060 | **$0.0013** |
| GPT-4o | $0.0124 | $0.0050 | **$0.017** |
| Claude Sonnet 4.5 | $0.015 | $0.005 | **$0.020** |
| Claude Haiku 4.5 | $0.0005 | $0.002 | **$0.0025** |

---

## Production Cost Projections

### Assumptions

- Average **5 sessions per user per month**
- Average **20 messages per session** (10 user + 10 AI)
- Average **3 tool invocations per session** (adds ~400 tokens each)
- Tool schemas add ~3,500 tokens to every request (5 apps, 17 tools)
- Default model: **GPT-4o-mini** (cheapest viable option for tool calling)

### Monthly Costs by Scale

| | 100 Users | 1,000 Users | 10,000 Users | 100,000 Users |
|---|-----------|-------------|--------------|---------------|
| Sessions/month | 500 | 5,000 | 50,000 | 500,000 |
| Messages/month | 10,000 | 100,000 | 1,000,000 | 10,000,000 |
| Tool calls/month | 1,500 | 15,000 | 150,000 | 1,500,000 |
| Input tokens/month | 50M | 500M | 5B | 50B |
| Output tokens/month | 5M | 50M | 500M | 5B |
| **GPT-4o-mini** | **$13/mo** | **$130/mo** | **$1,300/mo** | **$13,000/mo** |
| **GPT-4o** | **$175/mo** | **$1,750/mo** | **$17,500/mo** | **$175,000/mo** |
| **Claude Sonnet** | **$200/mo** | **$2,000/mo** | **$20,000/mo** | **$200,000/mo** |
| **Claude Haiku** | **$25/mo** | **$250/mo** | **$2,500/mo** | **$25,000/mo** |

### Additional Infrastructure Costs

| Service | 100 Users | 1K Users | 10K Users | 100K Users |
|---------|-----------|----------|-----------|------------|
| Railway (web + Express backend) | $5/mo | $20/mo | $50/mo | $200/mo |
| xAI Grok API (article generation) | $0 (free tier) | $9/mo (Pro) | $50/mo | Custom |
| Spotify API | $0 | $0 | $0 | $0 |
| Wikipedia API | $0 | $0 | $0 | $0 |
| **Infrastructure total** | **$5/mo** | **$29/mo** | **$100/mo** | **$200+/mo** |

### Total Monthly Cost (GPT-4o-mini)

| Scale | LLM | Infrastructure | Total |
|-------|-----|---------------|-------|
| 100 users | $13 | $5 | **$18/mo** |
| 1,000 users | $130 | $29 | **$159/mo** |
| 10,000 users | $1,300 | $100 | **$1,400/mo** |
| 100,000 users | $13,000 | $200 | **$13,200/mo** |

---

## Cost Optimization Strategies

| Strategy | Savings | Complexity |
|----------|---------|------------|
| **Use GPT-4o-mini as default** | 10-15x cheaper than GPT-4o/Sonnet | Already implemented |
| **Selective tool injection** | ~60% token reduction — only inject relevant app schemas per conversation | Medium |
| **Cache tool schemas** | Reduces ~3,500 tokens/request when schemas unchanged | Low |
| **Compress conversation history** | Summarize older turns, keep last 5 full | Medium |
| **Use Haiku for routing** | Route to cheaper model for simple questions, expensive model for tool calls | Medium |
| **Cache Grokipedia articles** | Avoid re-generating articles for common topics (TTL 5 min) | Low |
| **Rate limit tool invocations** | Cap at 10 tool calls/user/minute | Low |

### Projected Savings at 10K Users

| Without optimization | With optimization | Savings |
|---------------------|-------------------|---------|
| $1,400/mo | ~$450/mo | **~68%** |

Key optimization: **selective tool injection** alone saves ~60% of token costs by not sending all 17 tool schemas on every request. A simple keyword match ("chess" → inject only chess tools) would cut the 3,500-token schema overhead to ~800 for most requests.

---

## Key Takeaways

1. **LLM costs dominate** — infrastructure is <5% of total cost at all scales
2. **Tool schemas are the biggest cost driver** — 3,500 tokens per request across 5 apps (17 tools). This is the #1 optimization target.
3. **GPT-4o-mini is the sweet spot** — reliable tool calling at 1/13th the cost of GPT-4o
4. **The platform is viable** — $18/mo for 100 users, $159/mo for 1K users with GPT-4o-mini
5. **Scaling to 100K users** requires optimization — unoptimized costs $13K/mo, optimized ~$4K/mo
6. **Development cost was low** — ~$15 total across all providers over the full build
