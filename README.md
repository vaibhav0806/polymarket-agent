# NBA Polymarket Trading Agent

An autonomous agent that digests NBA sports data, analyzes it via LLM, and executes trades on [Polymarket](https://polymarket.com) using their CLI. Built as a Next.js app with a web dashboard and an [OpenClaw](https://openclaw.ai) skill for agent-to-agent use.

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                   WEB UI (Next.js App Router)             │
│       Dashboard  |  Strategy Config  |  Trade History     │
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

┌───────────────────────────────────────────────────────────┐
│              OPENCLAW SKILL (CLI Scripts)                  │
│  discover | signals | analyze | run-cycle | positions     │
│  Standalone commands that wrap the same src/lib/ logic     │
└───────────────────────────────────────────────────────────┘
```

## Features

- **Data Digestion** — Aggregates NBA signals from BallDontLie (games, standings, injuries) and Twitter/X (sentiment, breaking news)
- **LLM Analysis** — Feeds market data + signals into GPT-4o-mini (configurable) with structured JSON output for trading recommendations
- **Automated Execution** — Executes trades on Polymarket via CLI wrapper using `execFile` (no shell injection)
- **Risk Management** — Hard limits enforced after LLM decisions: position caps, exposure limits, daily trade limits, and a circuit breaker on max daily loss
- **Customizable Strategy** — Plain English rules injected into the LLM prompt (e.g., "Only trade when a star player is injured")
- **Web Dashboard** — Real-time monitoring of agent status, positions, P&L, trade history, and strategy configuration
- **OpenClaw Skill** — CLI scripts that any OpenClaw agent can install and use to autonomously trade NBA prediction markets

## Quick Start

### Prerequisites

- Node.js 18+
- [Polymarket CLI](https://github.com/polymarket/cli) installed and in your PATH
- OpenAI API key
- Polymarket wallet private key (configured via `polymarket setup`)

### Setup

```bash
git clone https://github.com/vaibhav0806/polymarket-agent.git
cd polymarket-agent
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys: OPENAI_API_KEY, POLYMARKET_PRIVATE_KEY, etc.

# Initialize database
npx prisma generate
npx prisma db push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the dashboard.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM analysis |
| `POLYMARKET_PRIVATE_KEY` | Yes | Ethereum private key (via `polymarket setup`) |
| `TWITTER_BEARER_TOKEN` | No | X/Twitter API bearer token for sentiment (v2 search, Basic tier+) |
| `BALLDONTLIE_API_KEY` | No | BallDontLie API key for NBA game data |
| `DATABASE_URL` | No | Prisma database URL (default: `file:./dev.db`) |

## OpenClaw Skill

This project is also available as an OpenClaw skill. Any OpenClaw agent can use the CLI scripts in `skills/nba-trader/scripts/` to autonomously trade NBA markets.

### Skill Commands

```bash
# Check wallet and approvals
npx tsx skills/nba-trader/scripts/wallet.ts

# First-time setup (DB + wallet + approvals)
npx tsx skills/nba-trader/scripts/setup.ts

# Discover NBA markets
npx tsx skills/nba-trader/scripts/discover.ts --teams "LAL,BOS"

# Fetch NBA signals (games, injuries, tweets)
npx tsx skills/nba-trader/scripts/signals.ts --teams "LAL"

# Analyze markets (dry run — no trades)
npx tsx skills/nba-trader/scripts/analyze.ts --risk conservative --min-confidence 0.7

# Run full trading cycle
npx tsx skills/nba-trader/scripts/run-cycle.ts --teams "LAL" --max-position 5

# Check open positions
npx tsx skills/nba-trader/scripts/positions.ts
```

All scripts output structured JSON to stdout. See `skills/nba-trader/SKILL.md` for full documentation.

### Strategy Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--teams` | Comma-separated NBA team codes (e.g., `LAL,BOS,GSW`) | All teams |
| `--types` | Market types (`moneyline,spreads,totals,player_prop,futures`) | All types |
| `--risk` | `conservative` / `moderate` / `aggressive` | `moderate` |
| `--min-confidence` | LLM confidence threshold (0–1) | `0.6` |
| `--max-position` | Max USDC per trade | `10` |
| `--max-exposure` | Max total USDC across all positions | `100` |
| `--custom-rules` | Plain English rules for the LLM | Empty |
| `--model` | OpenAI model | `gpt-4o-mini` |

## Web Dashboard

### Strategy Configuration

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
| **Market Types** | `moneyline`, `spreads`, `totals`, `player_prop`, `futures` | All |
| **Order Type** | `market` or `limit` | `market` |
| **LLM Model** | OpenAI model to use | `gpt-4o-mini` |
| **Poll Interval** | How often the agent runs a cycle | 5 min |

### Agent Loop

Each cycle follows this pipeline:

1. **Discover** — Search Polymarket for active NBA markets, classify by type
2. **Collect Signals** — Fetch today's games, standings, injuries (BallDontLie) and recent NBA tweets (Twitter/X)
3. **Analyze** — Bundle markets + signals + strategy into an LLM prompt, get structured trading recommendations
4. **Risk Filter** — Apply hard limits (confidence, position size, exposure, daily trades, circuit breaker)
5. **Execute** — Place orders via Polymarket CLI, log trades to database, update positions
6. **Record** — Update cycle metrics (markets found, signals fetched, trades executed, duration)

Start/stop the agent from the dashboard or via API:

```bash
curl -X POST http://localhost:3000/api/agent/start
curl -X POST http://localhost:3000/api/agent/stop
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

## Tech Stack

- **Next.js 16** + React 19 + Tailwind CSS 4
- **Prisma** + SQLite (via better-sqlite3 adapter)
- **OpenAI SDK** (gpt-4o-mini default)
- **twitter-api-v2**
- **BallDontLie API**
- **Polymarket CLI** (wrapped via `child_process.execFile`)
- **tsx** (TypeScript script runner for CLI scripts)
- **Zod** (runtime validation for CLI output + LLM responses)
- **Recharts** + **Lucide React**

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── strategy/page.tsx           # Strategy configuration
│   ├── history/page.tsx            # Trade history + cycle log
│   └── api/                        # 8 API route handlers
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
│   └── constants.ts                # NBA teams, market types
├── components/
│   ├── nav.tsx                     # Sidebar navigation
│   ├── ui.tsx                      # Shared UI components
│   └── agent-status-context.tsx    # Agent status React context
└── generated/prisma/               # Generated Prisma client
skills/nba-trader/
├── SKILL.md                        # OpenClaw skill definition
└── scripts/                        # CLI scripts for OpenClaw agents
    ├── _utils.ts                   # Shared helpers (flags, strategy builder)
    ├── wallet.ts                   # Wallet + approval status
    ├── setup.ts                    # First-time setup
    ├── discover.ts                 # Search NBA markets
    ├── signals.ts                  # Fetch NBA data signals
    ├── analyze.ts                  # Full analysis pipeline (dry run)
    ├── run-cycle.ts                # Full cycle with trade execution
    └── positions.ts                # Show open positions
prisma/schema.prisma                # Database schema (6 tables)
.clawhubignore                      # ClawHub publish exclusions
```

## Important Notes

- **USDC.e on Polygon PoS** — Polymarket uses bridged USDC (USDC.e). You need USDC.e for trading and POL for gas.
- **Contract approvals** — Run `polymarket approve set` before your first trade (6 approval transactions).
- **Free tier limitations** — BallDontLie free tier supports `/games`, `/teams`, `/players` only. The agent degrades gracefully.
- **Twitter/X** — Bearer token needs v2 search access (Basic tier+). Agent works without tweets.
- **Long-running process** — The agent loop uses `setInterval`. It needs a persistent Node.js process (not serverless).

## Author

**Vaibhav Pandey** — [@vaibhav0806](https://github.com/vaibhav0806)

## License

MIT
