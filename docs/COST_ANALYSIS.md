# AI Cost Analysis

## Development Costs

### LLM API Spend During Development

| Provider | Model | Usage | Est. Cost |
|----------|-------|-------|-----------|
| OpenAI | GPT-4o-mini | ~200 chat turns for testing tool calling, chess, Grokipedia, Spotify | ~$0.50 |
| OpenAI | GPT-5 | ~20 chat turns testing chess gameplay | ~$2.00 |
| Anthropic | Claude Sonnet 4.5 | ~50 chat turns testing tool reliability, Spotify, multi-app routing | ~$3.00 |
| xAI | Grok-3-mini | ~30 article generation calls via Grokipedia backend | ~$0.30 |
| **Total LLM** | | | **~$5.80** |

### Other AI-Related Costs

| Service | Usage | Cost |
|---------|-------|------|
| Railway hosting | Web service + build minutes | ~$2.00 |
| Spotify API | Free tier (Development Mode) | $0.00 |
| Wikipedia API | Free, no key required | $0.00 |
| Grokipedia/xAI API | Free tier credits | $0.00 |
| **Total Other** | | **~$2.00** |

### Total Development Cost: **~$7.80**

---

## Token Breakdown

### Average Tokens Per Chat Turn

| Component | Input Tokens | Output Tokens |
|-----------|-------------|---------------|
| System prompt | ~200 | — |
| Conversation history (5 turns) | ~1,000 | — |
| Tool schemas (4 apps, ~15 tools) | ~2,500 | — |
| User message | ~50 | — |
| AI response | — | ~300 |
| Tool call + result (if triggered) | ~200 | ~200 |
| **Total per turn** | **~3,950** | **~500** |

### Token Cost Per Turn (by model)

| Model | Input Cost | Output Cost | Total/Turn |
|-------|-----------|-------------|------------|
| GPT-4o-mini | $0.00059 | $0.00060 | **$0.0012** |
| GPT-4o | $0.0099 | $0.0050 | **$0.015** |
| Claude Sonnet 4.5 | $0.012 | $0.005 | **$0.017** |
| Claude Haiku 4.5 | $0.0004 | $0.002 | **$0.0024** |

---

## Production Cost Projections

### Assumptions

- Average **5 sessions per user per month**
- Average **20 messages per session** (10 user + 10 AI)
- Average **2 tool invocations per session** (adds ~400 tokens each)
- Tool schemas add ~2,500 tokens to every request
- Default model: **GPT-4o-mini** (cheapest viable option)

### Monthly Costs by Scale

| | 100 Users | 1,000 Users | 10,000 Users | 100,000 Users |
|---|-----------|-------------|--------------|---------------|
| Sessions/month | 500 | 5,000 | 50,000 | 500,000 |
| Messages/month | 10,000 | 100,000 | 1,000,000 | 10,000,000 |
| Tool calls/month | 1,000 | 10,000 | 100,000 | 1,000,000 |
| Input tokens/month | 40M | 400M | 4B | 40B |
| Output tokens/month | 5M | 50M | 500M | 5B |
| **GPT-4o-mini** | **$12/mo** | **$120/mo** | **$1,200/mo** | **$12,000/mo** |
| **GPT-4o** | **$150/mo** | **$1,500/mo** | **$15,000/mo** | **$150,000/mo** |
| **Claude Sonnet** | **$170/mo** | **$1,700/mo** | **$17,000/mo** | **$170,000/mo** |
| **Claude Haiku** | **$24/mo** | **$240/mo** | **$2,400/mo** | **$24,000/mo** |

### Additional Infrastructure Costs

| Service | 100 Users | 1K Users | 10K Users | 100K Users |
|---------|-----------|----------|-----------|------------|
| Railway (web + DB) | $5/mo | $20/mo | $50/mo | $200/mo |
| xAI Grok API | $0 (free tier) | $9/mo (Pro) | $50/mo | Custom |
| Spotify API | $0 | $0 | $0 | $0 |
| **Infrastructure total** | **$5/mo** | **$29/mo** | **$100/mo** | **$200+/mo** |

### Total Monthly Cost (GPT-4o-mini)

| Scale | LLM | Infrastructure | Total |
|-------|-----|---------------|-------|
| 100 users | $12 | $5 | **$17/mo** |
| 1,000 users | $120 | $29 | **$149/mo** |
| 10,000 users | $1,200 | $100 | **$1,300/mo** |
| 100,000 users | $12,000 | $200 | **$12,200/mo** |

---

## Cost Optimization Strategies

| Strategy | Savings | Complexity |
|----------|---------|------------|
| **Use GPT-4o-mini as default** | 10x cheaper than GPT-4o | Already implemented |
| **Cache tool schemas** | Reduces ~2,500 tokens/request when schemas unchanged | Low |
| **Compress conversation history** | Summarize older turns, keep last 5 full | Medium |
| **Selective tool injection** | Only inject schemas for relevant apps per conversation | Medium |
| **Use Haiku for routing** | Route to cheaper model for simple questions, expensive model for tool calls | Medium |
| **Rate limit tool invocations** | Cap at 10 tool calls/user/minute | Low |
| **Batch similar requests** | Group Grokipedia lookups | High |

### Projected Savings at 10K Users

| Without optimization | With optimization | Savings |
|---------------------|-------------------|---------|
| $1,300/mo | ~$400/mo | **~70%** |

Key optimization: selective tool injection alone saves ~60% of token costs by not sending all 15 tool schemas on every request.

---

## Key Takeaways

1. **LLM costs dominate** — infrastructure is <10% of total cost at all scales
2. **Tool schemas are expensive** — 2,500 tokens per request across 4 apps. Selective injection is the biggest optimization lever.
3. **GPT-4o-mini is the sweet spot** — reliable tool calling at 1/10th the cost of GPT-4o
4. **The platform is viable** — $17/mo for 100 users, $149/mo for 1K users with GPT-4o-mini
5. **Scaling to 100K users** requires optimization — unoptimized would cost $12K/mo, optimized ~$4K/mo
