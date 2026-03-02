# NBA Polymarket Trading Agent

An autonomous agent that digests NBA sports data, analyzes it via LLM, and executes trades on [Polymarket](https://polymarket.com) using their CLI. Built as a single Next.js application with a web dashboard for monitoring and configuration.

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                   WEB UI (Next.js App Router)             │
│   Dashboard  |  Strategy Config  |  History  |  Onboard   │
└──────────────────────┬────────────────────────────────────┘
                       │ API Routes
┌──────────────────────┴────────────────────────────────────┐
│                 AGENT LOOP (setInterval, in-process)       │
│                                                           │
│  ┌──────────┐    ┌───────────┐    ┌────────────────┐     │
│  │ DIGESTER │──▶│ ANALYZER  │──▶│   EXECUTOR      │     │
│  │          │    │  (LLM)    │    │ (CLI wrapper)   │     │
│  └────┬─────┘    └───────────┘    └───────┬────────┘     │
│       │                                    │              │
│  Twitter/X API                     polymarket CLI binary   │
│  BallDontLie API                   (child_process.execFile)│
│  Polymarket markets                                       │
└──────────────────────┬────────────────────────────────────┘
                       │
                  ┌────┴────┐
                  │ SQLite  │  (Prisma ORM)
                  └─────────┘
```

## Features

- **Data Digestion** — Aggregates NBA signals from BallDontLie (injuries, scores, standings) and Twitter/X (sentiment, breaking news)
- **LLM Analysis** — Feeds market data + signals into GPT-4o-mini (configurable) with structured JSON output for trading recommendations
- **Automated Execution** — Executes trades on Polymarket via CLI wrapper using `execFile` (no shell injection)
- **Risk Management** — Hard limits enforced after LLM decisions: position caps, exposure limits, daily trade limits, and a circuit breaker on max daily loss
- **Customizable Strategy** — Plain English rules injected into the LLM prompt (e.g., "Only trade when a star player is injured", "Never short the Celtics")
- **Orchestrator Key** — Single base64url-encoded key bundles all API credentials for one-step onboarding
- **Web Dashboard** — Real-time monitoring of agent status, positions, P&L, trade history, and strategy configuration

## Quick Start

### Prerequisites

- Node.js 18+
- [Polymarket CLI](https://github.com/polymarket/cli) installed and in your PATH
- OpenAI API key
- Polymarket wallet private key

### Setup

```bash
# Clone and install
git clone https://github.com/vaibhav0806/polymarket-agent.git
cd polymarket-agent
npm install

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# Start the dev server
npm run dev
```

Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding) to configure the agent.

### Orchestrator Key (Recommended)

For one-step setup, create an orchestrator key — a base64url-encoded JSON object containing all credentials:

```json
{
  "polymarketPrivateKey": "0x...",
  "openaiApiKey": "sk-...",
  "twitterBearerToken": "AAA...",
  "balldontlieApiKey": "...",
  "defaultStrategy": {
    "focusTeams": ["LAL", "BOS"],
    "riskTolerance": "moderate",
    "customRules": "Only trade game_winner markets when a star player is listed as OUT"
  }
}
```

Encode it with: `echo '<json>' | base64 | tr '+/' '-_' | tr -d '='`

Paste the resulting string into the onboarding page and all keys, wallet approvals, and strategy settings are applied automatically.

### Manual Setup

Alternatively, configure each field individually on the onboarding page or set environment variables:

```bash
cp .env.example .env
# Edit .env with your keys
```

## Strategy Configuration

The strategy is fully customizable via the web UI at `/strategy`:

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Custom Rules** | Plain English rules injected into the LLM system prompt | (empty) |
| **Focus Teams** | NBA team codes to filter markets (empty = all) | All |
| **Risk Tolerance** | `conservative` / `moderate` / `aggressive` | `moderate` |
| **Max Position Size** | Max USDC per trade | $10 |
| **Max Total Exposure** | Total open USDC across all positions | $100 |
| **Min Confidence** | LLM confidence threshold (0–1) | 0.6 |
| **Max Daily Trades** | Hard cap on trades per day | 10 |
| **Max Daily Loss** | Circuit breaker — stops trading if exceeded | $50 |
| **Market Types** | `game_winner`, `spread`, `player_prop`, `futures` | All |
| **Order Type** | `market` or `limit` | `market` |
| **LLM Model** | OpenAI model to use | `gpt-4o-mini` |
| **Poll Interval** | How often the agent runs a cycle | 5 min |

The **Custom Rules** field is the primary way to fine-tune trading behavior. Examples:

- "Only trade when a star player is injured"
- "Never short the Celtics"
- "Focus on player props when multiple injuries are reported"
- "Be aggressive on futures markets for teams above .600 win rate"
- "Avoid trading on back-to-back game days"

## Agent Loop

Each cycle follows this pipeline:

1. **Discover** — Search Polymarket for active NBA markets, classify by type, fetch midpoint prices
2. **Collect Signals** — Fetch today's games, standings, injuries (BallDontLie) and recent NBA tweets (Twitter/X)
3. **Analyze** — Bundle markets + signals + strategy into an LLM prompt, get structured trading recommendations
4. **Risk Filter** — Apply hard limits (confidence, position size, exposure, daily trades, circuit breaker)
5. **Execute** — Place orders via Polymarket CLI, log trades to database, update positions
6. **Record** — Update cycle metrics (markets found, signals fetched, trades executed, duration)

Start/stop the agent from the dashboard or via API:

```bash
# Start
curl -X POST http://localhost:3000/api/agent/start

# Stop
curl -X POST http://localhost:3000/api/agent/stop

# Status
curl http://localhost:3000/api/agent/status
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/start` | Start the agent loop |
| POST | `/api/agent/stop` | Stop the agent loop |
| GET | `/api/agent/status` | Agent status + recent cycles |
| GET | `/api/markets` | Discover NBA markets |
| GET | `/api/trades` | Trade history (paginated) |
| GET | `/api/positions` | Current positions |
| GET | `/api/strategy` | Current strategy config |
| PUT | `/api/strategy` | Update strategy config |
| POST | `/api/onboarding/validate` | Validate orchestrator key or API keys |
| POST | `/api/onboarding/configure` | Apply configuration |

## Tech Stack

- **Next.js 15** + React 19 + Tailwind CSS 4
- **Prisma** + SQLite
- **OpenAI SDK** (gpt-4o-mini default)
- **twitter-api-v2**
- **BallDontLie API**
- **Polymarket CLI** (Rust binary, wrapped via `child_process.execFile`)
- **Zod** (runtime validation for CLI output + LLM responses)
- **Recharts** + **Lucide React**

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── onboarding/page.tsx         # Setup wizard
│   ├── strategy/page.tsx           # Strategy configuration
│   ├── history/page.tsx            # Trade history + cycle log
│   └── api/                        # 9 API route handlers
├── lib/
│   ├── polymarket/
│   │   ├── cli.ts                  # CLI wrapper (execFile, zod validation)
│   │   ├── markets.ts              # NBA market discovery + classification
│   │   └── types.ts                # Zod schemas for CLI output
│   ├── data/
│   │   ├── sports.ts               # BallDontLie API client
│   │   ├── twitter.ts              # Twitter/X client
│   │   └── types.ts                # Signal types
│   ├── agent/
│   │   ├── loop.ts                 # Main agent loop (singleton)
│   │   ├── analyzer.ts             # LLM structured output + custom rules
│   │   ├── executor.ts             # Trade execution + DB logging
│   │   └── risk.ts                 # Hard limits + circuit breaker
│   ├── db.ts                       # Prisma singleton
│   ├── config.ts                   # DB-first config with env fallback
│   └── orchestrator.ts             # Orchestrator key encode/decode/apply
├── components/
│   └── nav.tsx                     # Sidebar navigation
└── generated/prisma/               # Generated Prisma client
skills/nba-trader/SKILL.md          # OpenClaw skill definition
prisma/schema.prisma                # Database schema (6 tables)
```

## OpenClaw Skill

The `skills/nba-trader/SKILL.md` file defines this agent as an OpenClaw skill with:

- Auto-install of the Polymarket CLI via Homebrew
- Orchestrator key support for seamless agent onboarding
- Full documentation of CLI commands, env vars, and strategy options

## Author

**Vaibhav Pandey** — [@vaibhav0806](https://github.com/vaibhav0806)

## License

MIT
