---
name: nba-polymarket-trader
version: 1.0.0
description: "NBA sports data digester and Polymarket trading agent"
metadata:
  openclaw:
    auto_install:
      - brew: polymarket/tap/polymarket-cli
    env_vars:
      - OPENAI_API_KEY (required)
      - POLYMARKET_PRIVATE_KEY (required)
      - TWITTER_BEARER_TOKEN (optional)
      - BALLDONTLIE_API_KEY (optional)
    orchestrator_key: true
    category: trading
    sport: nba
---

# NBA Polymarket Trading Agent

## Overview

This skill digests real-time NBA sports data from multiple sources (BallDontLie API, Twitter/X sentiment), analyzes it using an LLM (OpenAI), and executes trades on Polymarket prediction markets via the Polymarket CLI. The agent runs as an in-process polling loop using `setInterval` inside a long-running Node.js process -- it is not serverless compatible.

Each cycle follows four steps:

1. **Ingest** -- Pull latest NBA games, player data, and optionally social sentiment from Twitter/X.
2. **Analyze** -- Feed structured data into the LLM to produce trade signals with confidence scores.
3. **Execute** -- Submit buy/sell orders to Polymarket via CLI subprocess calls when signals exceed the configured confidence threshold.
4. **Record** -- Log every decision and trade to the local SQLite database (via Prisma) for auditability and performance tracking.

## Orchestrator Key

The orchestrator key is a base64url-encoded JSON blob containing API credentials. The user pastes it into the onboarding wizard UI, which decodes it and stores the individual keys in the database.

### Key Format

The decoded JSON payload:

```json
{
  "polymarketPrivateKey": "0x...",
  "openaiApiKey": "sk-...",
  "twitterBearerToken": "AAAA...",
  "balldontlieApiKey": "uuid-here",
  "defaultStrategy": { }
}
```

Only `polymarketPrivateKey` and `openaiApiKey` are required. `twitterBearerToken`, `balldontlieApiKey`, and `defaultStrategy` are optional -- the agent degrades gracefully without them.

### Encoding

The key is produced by base64url-encoding the JSON:

```javascript
btoa(JSON.stringify(payload))
```

The resulting string is what the user pastes into the onboarding UI. The UI decodes it, validates the credentials via `POST /api/onboarding/validate`, and then applies the configuration via `POST /api/onboarding/configure`.

## CLI Commands

All commands are invoked with `polymarket -o json` and executed via `child_process.execFile`. The agent parses the JSON stdout to drive its logic.

| Command | Purpose |
|---|---|
| `polymarket markets search "<query>"` | Search for markets by keyword |
| `polymarket clob midpoint <tokenId>` | Get midpoint price for a token (positional arg) |
| `polymarket clob market-order --token <id> --side buy/sell --amount <usd>` | Place a market order |
| `polymarket clob create-order --token <id> --side buy/sell --price <p> --size <n>` | Place a limit order |
| `polymarket clob balance --asset-type collateral` | Check USDC.e balance in CLOB |
| `polymarket clob update-balance --asset-type collateral` | Refresh CLOB balance from on-chain state |
| `polymarket data positions <walletAddress>` | List open positions (positional arg) |
| `polymarket wallet address` | Get configured wallet address |
| `polymarket wallet show` | Show wallet info including proxy address and signature type |
| `polymarket approve check` | Check contract approval status (returns array) |
| `polymarket approve set` | Set contract approvals for trading (6 approval transactions) |
| `polymarket sports market-types` | List valid sports market types |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM analysis |
| `POLYMARKET_PRIVATE_KEY` | Yes | Ethereum private key (configured via `polymarket wallet import` or `polymarket setup`) |
| `TWITTER_BEARER_TOKEN` | No | X/Twitter API bearer token for NBA tweet sentiment (requires v2 search access) |
| `BALLDONTLIE_API_KEY` | No | BallDontLie API key for NBA game data (free tier: /games, /teams, /players only) |
| `DATABASE_URL` | No | Prisma database connection string (default: `file:./dev.db`) |
| `POLL_INTERVAL_MS` | No | Milliseconds between polling cycles (default: `300000` / 5 min) |
| `LLM_MODEL` | No | OpenAI model to use for analysis (default: `gpt-4o-mini`) |

## Strategy Configuration

Strategy is configured via the dashboard UI or by calling `PUT /api/strategy` with a JSON body. The full `StrategyConfig` interface:

```typescript
interface StrategyConfig {
  focusTeams: string[];              // NBA team names, empty = all teams
  marketTypes: string[];             // "moneyline" | "spreads" | "totals" | "player_prop" | "futures"
  riskTolerance: "conservative" | "moderate" | "aggressive";
  maxPositionSize: number;           // Max USDC per trade
  maxTotalExposure: number;          // Max total open USDC across all positions
  minConfidence: number;             // 0-1, LLM confidence threshold to trigger a trade
  maxDailyTrades: number;            // Max trades per day
  maxDailyLoss: number;              // Circuit breaker -- stops trading if daily loss exceeds this
  orderType: "market" | "limit";
  pollIntervalMs: number;            // ms between cycles (default 300000)
  llmModel: string;                  // OpenAI model (default "gpt-4o-mini")
  customRules: string;               // Plain English rules injected into the LLM system prompt
}
```

### Key Fields

**focusTeams** -- Array of NBA team names to restrict analysis to. When empty, the agent considers all teams.
```json
{ "focusTeams": ["Lakers", "Celtics", "Warriors"] }
```

**marketTypes** -- Array of market types the agent is allowed to trade.
```json
{ "marketTypes": ["moneyline", "spreads", "totals"] }
```

**riskTolerance** -- Controls position sizing behavior. One of `"conservative"`, `"moderate"`, or `"aggressive"`.

**minConfidence** -- Float between 0 and 1. The LLM must produce a confidence score above this threshold for the agent to place a trade.

**maxDailyLoss** -- Circuit breaker. If the agent's realized losses for the current day exceed this USDC amount, it stops placing new trades until the next day.

**orderType** -- Whether to use `"market"` orders (immediate fill at midpoint) or `"limit"` orders (placed at a specific price and size).

**customRules** -- A plain English string injected directly into the LLM system prompt to bias or constrain its analysis.
```json
{ "customRules": "Never bet against teams on a 5+ game win streak. Weight injury reports higher than season averages." }
```

## API Endpoints

The Next.js app exposes the following API routes:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agent/start` | Start the agent polling loop |
| `POST` | `/api/agent/stop` | Stop the agent polling loop |
| `GET` | `/api/agent/status` | Agent state, cycle count, recent cycle logs |
| `GET` | `/api/markets` | Discover active NBA markets with prices |
| `GET` | `/api/trades` | Paginated trade history with reasoning |
| `GET` | `/api/positions` | Current open positions (DB records merged with live CLI data) |
| `GET` | `/api/strategy` | Get current strategy config |
| `PUT` | `/api/strategy` | Update strategy config |
| `POST` | `/api/onboarding/validate` | Validate API keys from orchestrator key |
| `POST` | `/api/onboarding/configure` | Apply orchestrator key or manual configuration |

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
cp .env.example .env
# Edit .env with your keys
npm run dev
```

After the dev server is running, use the onboarding UI or call the API directly to configure the agent and start trading.

## Important Notes

**Polymarket runs on Polygon PoS.** The configured wallet needs USDC.e (bridged USDC, contract `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`) for trading collateral and POL for gas fees.

**Use EOA signature mode.** Proxy mode requires additional contract deployment. The agent expects direct EOA signing.

**Approve exchange contracts before trading.** Run `polymarket approve set` to submit the 6 required approval transactions. Check status with `polymarket approve check`.

**Sync CLOB balance after funding.** After bridging USDC.e to the wallet, run `polymarket clob update-balance --asset-type collateral` to make the balance visible to the CLOB.

**BallDontLie free tier limitations.** The free tier only supports `/games`, `/teams`, and `/players` endpoints. Standings, advanced stats, and injury data require a paid tier. The agent degrades gracefully when these are unavailable.

**Twitter/X API requirements.** The bearer token must have v2 search access. The agent degrades gracefully if no token is configured or if the API is unreachable.

**Long-running process required.** The agent loop runs in-process with `setInterval`. It requires a persistent Node.js process and is not compatible with serverless deployments.
