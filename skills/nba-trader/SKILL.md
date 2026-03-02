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

This skill digests real-time NBA sports data from multiple sources (balldontlie API, Twitter/X, official NBA feeds), analyzes it using an LLM (OpenAI), and executes trades on Polymarket prediction markets. The agent continuously polls for new data, evaluates market conditions against its strategy configuration, and places or adjusts positions on NBA-related Polymarket markets.

The agent operates as a background loop:
1. **Ingest** -- Pull latest NBA scores, player stats, injury reports, and social sentiment.
2. **Analyze** -- Feed structured data into the LLM to produce trade signals with confidence scores.
3. **Execute** -- Submit buy/sell orders to Polymarket via the Polymarket CLI when signals exceed the configured confidence threshold.
4. **Record** -- Log every decision and trade to the local database for auditability and performance tracking.

## Orchestrator Key

The orchestrator key is a signed JSON blob that authorizes this skill to act on behalf of a user's Polymarket account. It encodes the user's wallet address, allowed market scopes, risk limits, and an expiration timestamp.

### Key Format

```json
{
  "version": 1,
  "wallet": "0xYOUR_WALLET_ADDRESS",
  "scope": ["nba"],
  "maxPositionUsd": 100,
  "maxDailyVolumeUsd": 500,
  "expiresAt": "2026-12-31T23:59:59Z",
  "signature": "0xSIGNATURE_HEX"
}
```

### Generating an Orchestrator Key

```bash
polymarket auth generate-key \
  --scope nba \
  --max-position 100 \
  --max-daily-volume 500 \
  --expires 2026-12-31
```

The CLI will prompt you to sign with the private key corresponding to `POLYMARKET_PRIVATE_KEY`. Store the resulting key securely; it is required at agent startup.

## CLI Commands

The agent invokes the following Polymarket CLI commands during operation:

| Command | Purpose |
|---|---|
| `polymarket auth generate-key` | Generate an orchestrator key for the agent |
| `polymarket auth verify-key` | Verify an orchestrator key is valid and not expired |
| `polymarket markets list --tag nba` | List all active NBA prediction markets |
| `polymarket markets get <market-id>` | Fetch details and current prices for a specific market |
| `polymarket order buy` | Place a buy order on a market outcome |
| `polymarket order sell` | Place a sell order on a market outcome |
| `polymarket order cancel <order-id>` | Cancel a pending order |
| `polymarket positions list` | List all current open positions |
| `polymarket positions get <position-id>` | Get details on a specific position |
| `polymarket balance` | Check the wallet's USDC balance |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM analysis calls |
| `POLYMARKET_PRIVATE_KEY` | Yes | Ethereum private key for signing Polymarket transactions |
| `TWITTER_BEARER_TOKEN` | No | Twitter/X API bearer token for social sentiment ingestion |
| `BALLDONTLIE_API_KEY` | No | API key for balldontlie.io NBA data (higher rate limits) |
| `DATABASE_URL` | No | Prisma database connection string (defaults to `file:./prisma/dev.db`) |
| `POLL_INTERVAL_MS` | No | Milliseconds between data polling cycles (default: `300000` / 5 min) |
| `LLM_MODEL` | No | OpenAI model to use for analysis (default: `gpt-4o-mini`) |

## Strategy Customization

Strategy is configured via the dashboard UI or by passing a JSON config object to the agent's API. Available options:

### `focusTeams`
Array of NBA team abbreviations to restrict analysis to. When set, the agent only trades on markets involving these teams.
```json
{ "focusTeams": ["LAL", "BOS", "GSW"] }
```

### `riskTolerance`
Controls position sizing and confidence thresholds. One of `"conservative"`, `"moderate"`, or `"aggressive"`.
- **conservative** -- Minimum 85% LLM confidence to trade, max 5% of balance per position.
- **moderate** -- Minimum 70% confidence, max 15% of balance per position.
- **aggressive** -- Minimum 55% confidence, max 30% of balance per position.

```json
{ "riskTolerance": "moderate" }
```

### `customRules`
Array of natural-language rules injected into the LLM system prompt to bias or constrain its analysis.
```json
{
  "customRules": [
    "Never bet against teams on a 5+ game win streak",
    "Weight injury reports higher than season averages",
    "Avoid player prop markets"
  ]
}
```

### `maxPositionUsd`
Hard cap on the USD value of any single position. Overrides the orchestrator key limit if lower.
```json
{ "maxPositionUsd": 50 }
```

### `maxDailyVolumeUsd`
Hard cap on total USD volume traded per 24-hour rolling window.
```json
{ "maxDailyVolumeUsd": 200 }
```

### `enabledMarketTypes`
Array of market types the agent is allowed to trade. Options: `"game-winner"`, `"spread"`, `"total-points"`, `"player-props"`, `"futures"`.
```json
{ "enabledMarketTypes": ["game-winner", "spread"] }
```

## API Endpoints

The Next.js app exposes the following API routes for interacting with the agent:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agent/status` | Returns the agent's current state (running, paused, stopped) and last poll timestamp |
| `POST` | `/api/agent/start` | Start the polling loop with an optional strategy config body |
| `POST` | `/api/agent/stop` | Stop the polling loop gracefully |
| `GET` | `/api/agent/trades` | List all executed trades with pagination |
| `GET` | `/api/agent/trades/:id` | Get details for a specific trade |
| `GET` | `/api/agent/positions` | List current open Polymarket positions |
| `GET` | `/api/agent/markets` | List NBA markets the agent is tracking |
| `POST` | `/api/agent/strategy` | Update the agent's strategy configuration |
| `GET` | `/api/agent/strategy` | Get the current strategy configuration |
| `GET` | `/api/agent/performance` | Aggregate P&L and win-rate statistics |

## Starting and Stopping the Agent

### Start

```bash
# 1. Install dependencies and set up the database
npm run setup

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your keys

# 3. Start the development server (includes the agent)
npm run dev
```

Then call the start endpoint:
```bash
curl -X POST http://localhost:3000/api/agent/start \
  -H "Content-Type: application/json" \
  -d '{"riskTolerance": "moderate", "focusTeams": ["LAL", "BOS"]}'
```

### Stop

```bash
curl -X POST http://localhost:3000/api/agent/stop
```

Or simply kill the dev server process. The agent persists its state to the database, so it will resume cleanly on next startup.

## Example Orchestrator Key

```json
{
  "version": 1,
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "scope": ["nba"],
  "maxPositionUsd": 100,
  "maxDailyVolumeUsd": 500,
  "expiresAt": "2026-12-31T23:59:59Z",
  "signature": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00"
}
```
