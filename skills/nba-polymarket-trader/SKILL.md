---
name: nba-polymarket-trader
description: "Autonomous NBA prediction market trading agent for Polymarket. Use when: (1) user wants to discover and trade NBA prediction markets, (2) user wants automated NBA sports betting analysis, (3) user wants to run an NBA trading strategy. NOT for: non-NBA markets, manual crypto trading, general Polymarket browsing."
version: "1.0.0"
metadata: {"openclaw": {"emoji": "🏀", "homepage": "https://github.com/vaibhav0806/polymarket-agent", "primaryEnv": "OPENAI_API_KEY", "requires": {"bins": ["polymarket", "node"], "env": ["OPENAI_API_KEY", "NBA_AGENT_DIR"]}, "install": [{"kind": "node", "package": "tsx", "bins": ["tsx"]}]}}
---

# NBA Polymarket Trader

Trade NBA prediction markets on Polymarket using real-time sports data,
LLM analysis, and automated risk management.

## Agent Execution Instructions

**CRITICAL -- read before doing anything else:**

- **DO NOT use `sessions_spawn`** for this skill. Do not spawn subagents or ACP sessions.
- **DO NOT use `runtime: "acp"`** or any ACP harness.
- **USE the `exec` (bash) tool directly** to run the shell commands listed in this file.
- Every task in this skill is a shell command. Run it with exec/bash and return the output.
- **All commands use `$NBA_AGENT_DIR`** -- this env var points to the cloned project directory and is expanded by the shell.

## Prerequisites

Before using this skill, ensure the following:

1. **Clone the repository** and run `npm install`:

```bash
git clone https://github.com/vaibhav0806/polymarket-agent.git
cd polymarket-agent && npm install
```

2. **Set environment variables** (see Environment Variables section below). At minimum: `OPENAI_API_KEY`, `POLYMARKET_PRIVATE_KEY`, and `NBA_AGENT_DIR`.

3. **Polymarket CLI** must be installed and wallet configured:

```bash
brew install polymarket/tap/polymarket-cli
polymarket setup   # imports your private key
```

4. **Sync skill to OpenClaw workspace**:

```bash
npm run skill:sync
```

5. **OpenClaw config** -- your `~/.openclaw/openclaw.json` must have:
   - `tools.profile: "full"` (enables the exec tool)
   - `NBA_AGENT_DIR` set in your agent's environment variables

6. **For Telegram bot (unattended use)** -- your `~/.openclaw/exec-approvals.json` should have:
   - `security: "full"`, `ask: "off"`, `autoAllowSkills: true`

## Rules

- Always use `cd "$NBA_AGENT_DIR"` before running any script.
- All scripts output JSON to stdout. Parse stdout for data. Diagnostic messages go to stderr.
- Never run `run-cycle.ts` without `--dry-run` unless the user explicitly asks to execute real trades.
- If a script fails, check the Troubleshooting section before retrying.

## Quick Start

```bash
cd "$NBA_AGENT_DIR" && npm install
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/setup.ts
```

This installs dependencies, initializes the database, checks your wallet,
and sets contract approvals if needed.

## Discover Markets

Search for active NBA prediction markets on Polymarket.

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/discover.ts
```

Filter by team or market type:

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/discover.ts --teams "LAL,BOS"
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/discover.ts --types "moneyline,spreads"
```

Returns JSON:

```json
{
  "count": 12,
  "markets": [
    {
      "id": "0x...",
      "question": "Will the Lakers beat the Celtics?",
      "type": "moneyline",
      "outcomes": [
        { "title": "Yes", "tokenId": "abc123", "price": 0.55 },
        { "title": "No", "tokenId": "def456", "price": 0.45 }
      ],
      "volume": 15230
    }
  ]
}
```

## Get NBA Signals

Fetch real-time NBA data from BallDontLie API and Twitter/X.

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/signals.ts
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/signals.ts --teams "LAL,BOS"
```

Returns JSON with sections: `games`, `standings`, `injuries`, `tweets`.

## Analyze Markets (Dry Run)

Run the full pipeline -- discover markets, collect signals, LLM analysis,
risk filtering -- without executing any trades.

**This is a slow command (~15s). Always use `--limit 20`.** See "Long-Running Commands" below.

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/analyze.ts --limit 20
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/analyze.ts --teams "LAL" --risk conservative --min-confidence 0.7 --limit 20
```

Returns JSON:

```json
{
  "marketsFound": 8,
  "signalsCollected": 23,
  "recommendations": {
    "total": 5,
    "approved": [
      {
        "market": "Will the Lakers beat the Celtics?",
        "action": "BUY",
        "side": "YES",
        "confidence": 0.78,
        "amount": 8,
        "reasoning": "Lakers 5-game win streak, Celtics missing key player..."
      }
    ],
    "rejected": [
      { "market": "...", "reason": "Confidence 0.45 below minimum 0.7" }
    ],
    "circuitBreakerTripped": false
  }
}
```

## Run Trading Cycle

**WARNING: This executes real trades with real money (USDC.e on Polygon).**

**This is a slow command (~15s). Always use `--limit 20`.** See "Long-Running Commands" below.

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/run-cycle.ts --limit 20
```

Dry-run mode (same as analyze but through the cycle pipeline):

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/run-cycle.ts --dry-run --limit 20
```

With strategy overrides:

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/run-cycle.ts --teams "LAL" --max-position 5 --risk conservative --limit 20
```

## Check Positions

View open positions from the database merged with live on-chain data.
Requires database to be initialized (run setup first).

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/positions.ts
```

## Check Wallet

View wallet address and contract approval status.

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/wallet.ts
```

## Long-Running Commands

`analyze.ts` and `run-cycle.ts` take ~15 seconds due to the LLM API call. The exec tool may auto-background these after 10 seconds.

**When exec auto-backgrounds a command:**

1. exec returns a message like: `"Command still running (session grand-wharf-2, pid 73758)"`
2. **Poll using the session NAME** (e.g., `grand-wharf-2`), **NOT the PID number**
3. Use `process action:poll <session-name>` to check progress
4. Repeat polling until the output contains `exitCode`
5. Parse the final stdout for JSON results

**Always use `--limit 20`** on analyze.ts and run-cycle.ts to cap the number of markets sent to the LLM. Without this, large result sets can hit token limits and cause timeouts.

## Strategy Customization

All strategy flags can be passed to `analyze.ts`, `run-cycle.ts`, and `discover.ts` (where applicable):

| Flag | Description | Default |
|------|-------------|---------|
| `--teams` | Comma-separated NBA team codes (e.g., `LAL,BOS,GSW`) | All teams |
| `--types` | Comma-separated market types (`moneyline,spreads,totals,player_prop,futures`) | All types |
| `--risk` | Risk tolerance: `conservative`, `moderate`, `aggressive` | `moderate` |
| `--min-confidence` | Minimum LLM confidence to trade (0-1) | `0.6` |
| `--max-position` | Max USDC per individual trade | `10` |
| `--max-exposure` | Max total USDC across all open positions | `100` |
| `--custom-rules` | Plain English rules injected into LLM prompt | Empty |
| `--model` | OpenAI model for analysis | `gpt-4o-mini` |
| `--limit` | Max number of markets to analyze (prevents token limits) | All |

Example with multiple overrides:

```bash
cd "$NBA_AGENT_DIR" && npx tsx skills/nba-polymarket-trader/scripts/analyze.ts --teams "LAL,BOS" --risk aggressive --min-confidence 0.8 --max-position 25 --model "gpt-4o" --limit 20
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NBA_AGENT_DIR` | Yes | Absolute path to the cloned project directory |
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM analysis |
| `POLYMARKET_PRIVATE_KEY` | Yes | Ethereum private key (via `polymarket setup`) |
| `TWITTER_BEARER_TOKEN` | No | X/Twitter API bearer token for sentiment (v2 search access required) |
| `BALLDONTLIE_API_KEY` | No | BallDontLie API key for NBA game data |
| `DATABASE_URL` | No | Prisma database URL (default: `file:./dev.db`) |

Set these in a `.env` file in the project root or export them in your shell.
For OpenClaw, set them in your agent's environment config in `~/.openclaw/openclaw.json`.

## How a Trading Cycle Works

1. **Discover** -- Search Polymarket for active NBA markets matching your team/type filters
2. **Signals** -- Fetch today's games, standings, injuries from BallDontLie + NBA tweets from Twitter/X
3. **Analyze** -- Send markets + signals to the LLM, which returns trade recommendations with confidence scores
4. **Risk Filter** -- Apply position limits, exposure caps, confidence thresholds, and circuit breaker checks
5. **Execute** -- Place orders via the Polymarket CLI for approved recommendations
6. **Record** -- Log cycle results, trades, and positions to the local SQLite database

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `polymarket: command not found` | Install: `brew install polymarket/tap/polymarket-cli` |
| `Wallet not configured` | Run `polymarket setup` to import your private key |
| `OpenAI API key not configured` | Set `OPENAI_API_KEY` in `.env` or OpenClaw env config |
| `prisma generate` fails | Run `npm install` first to ensure dependencies are installed |
| Empty market results | Check that the Polymarket CLI works: `polymarket markets search "NBA"` |
| `client-not-enrolled` Twitter error | Your bearer token needs v2 search access (Basic tier+). Agent works without it. |
| `401` from BallDontLie | Some endpoints (standings, injuries) need a paid API key. Free tier still works for games. |
| Approvals failing | Ensure wallet has POL for gas on Polygon PoS |
| No balance showing | After funding, run `polymarket clob update-balance --asset-type collateral` |
| `ACP runtime backend is not configured` | The agent is using `sessions_spawn` instead of `exec`. Tell it to read this SKILL.md and use exec directly. |
| exec command auto-backgrounds | Normal for slow commands. Poll with session NAME (not PID) until exitCode appears. |
| Token/TPM rate limit errors | Use `--limit 20` to cap market count sent to the LLM. |

## Important Notes

- **USDC.e on Polygon PoS** -- Polymarket uses bridged USDC (USDC.e, contract `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`). You need USDC.e for trading collateral and POL for gas.
- **Contract approvals** -- Run `setup.ts` or `polymarket approve set` before your first trade. This submits 6 approval transactions.
- **Balance sync** -- After bridging USDC.e, run `polymarket clob update-balance --asset-type collateral` to make it visible to the CLOB.
- **Free tier limitations** -- BallDontLie free tier supports `/games`, `/teams`, `/players` only. Standings and injuries require paid tier. The agent degrades gracefully.
- **Twitter/X limitations** -- Bearer token must be attached to a Project with Basic tier or higher for v2 search. Agent works without tweets.
- **All output is JSON** -- Every script outputs structured JSON to stdout. Diagnostic messages go to stderr. Parse stdout for programmatic use.
