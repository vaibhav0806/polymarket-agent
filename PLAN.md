# NBA Polymarket Trading Agent — Status & Next Steps

## Completed

### Backend Core
- [x] Polymarket CLI wrapper (`execFile`, zod validation, 30s timeout)
- [x] BallDontLie API client (games, standings, injuries)
- [x] Twitter/X client with graceful degradation
- [x] Agent loop (singleton, setInterval, per-cycle error isolation)
- [x] LLM analyzer (structured JSON output, custom rules injection, temp 0.3)
- [x] Risk layer (position caps, exposure limits, daily trade limit, circuit breaker)
- [x] Trade executor with DB logging and position tracking
- [x] Orchestrator key encode/decode/apply
- [x] DB-first config with env var fallback
- [x] Prisma + SQLite schema (6 tables: Config, Strategy, Trade, Signal, AgentCycle, Position)

### API Routes (9 endpoints)
- [x] `POST /api/agent/start` — start agent loop
- [x] `POST /api/agent/stop` — stop agent loop
- [x] `GET /api/agent/status` — running state + recent cycles
- [x] `GET /api/markets` — NBA market discovery
- [x] `GET /api/trades` — paginated trade history
- [x] `GET /api/positions` — current positions (DB + live CLI merge)
- [x] `GET/PUT /api/strategy` — read/update strategy config
- [x] `POST /api/onboarding/validate` — validate keys
- [x] `POST /api/onboarding/configure` — apply configuration

### Frontend (4 pages)
- [x] Dashboard — agent controls, markets, positions, P&L chart, recent trades
- [x] Onboarding wizard — orchestrator key OR manual setup → strategy config → validation
- [x] Strategy config — full editor with prominent custom rules textarea
- [x] Trade history — table with expandable reasoning + agent cycle log
- [x] Sidebar navigation with agent status indicator

### Config & Docs
- [x] OpenClaw `SKILL.md` with auto-install and orchestrator key docs
- [x] README with architecture, setup, API reference
- [x] `.env.example`
- [x] Prisma migrations
- [x] Pushed to https://github.com/vaibhav0806/polymarket-agent

## Needs Real-World Testing

### Polymarket CLI Integration
- [x] Verify `polymarket markets search "NBA"` JSON output matches zod schemas in `types.ts`
- [x] Verify `polymarket clob midpoint <tokenId>` response shape — returns `{ midpoint: "0.55" }` (string)
- [x] Verify `polymarket clob market-order` flags — uses `--token`, `--side` (lowercase buy/sell), `--amount`
- [x] Verify `polymarket clob create-order` flags — uses `--token`, `--side`, `--price`, `--size`
- [x] Verify `polymarket data positions <ADDRESS>` — requires wallet address as positional arg
- [x] Verify `polymarket wallet address` — returns `{ address: "0x..." }`
- [x] Verify `polymarket approve check` — returns array of `{ address, contract, ctf_approved, usdc_allowance, usdc_approved }`
- [x] Adjust all zod schemas to match real CLI output (passthrough for flexibility)
- [x] Fix market types to use real Polymarket types: moneyline, spreads, totals, player_prop, futures
- [x] Fix market discovery to parse JSON-encoded string fields (outcomes, clobTokenIds, outcomePrices)
- [x] Test `polymarket clob market-order` and `create-order` JSON response shapes — confirmed with live trades, snake_case fields
- [x] Test `polymarket data positions` JSON response shape — confirmed with 4 open positions via CLI

### BallDontLie API
- [x] Test with real API key — v1 endpoints are active
- [x] `/games` works on free tier — returns full game data with teams, scores, quarters, datetime
- [x] `/teams` and `/players` work on free tier
- [x] `/standings`, `/stats`, `/season_averages`, `/box_scores` require paid tier (401 Unauthorized)
- [x] `/injuries` does not exist (404)
- [x] Updated sports client: graceful degradation for paid-only endpoints, added `getTeams()` and `searchPlayers()`
- [x] Updated Game schema to match real response (period, time, postseason, postponed, datetime)
- [x] Updated Player schema (height, weight, jersey_number, college, country, draft info)

### Twitter/X
- [x] Test bearer token auth — token authenticates but all v2 endpoints return `client-not-enrolled`
- [x] New `console.x.com` pay-per-use apps also get `client-not-enrolled` — known platform issue, no code fix
- [x] v1.1 search also blocked (code 453)
- [x] Code degrades gracefully (returns empty array), clear warning logged
- [x] New bearer token works — v2 search returns real NBA tweets
- [x] `twitter-api-v2` library confirmed working with the token
- [x] Fixed `getConfig()` env var fallback (camelCase→UPPER_SNAKE_CASE conversion was broken)

### End-to-End Flow
- [ ] Onboard with real keys (orchestrator key path) — not yet tested via UI
- [x] Onboard with real keys (manual entry path) — fixed field name mismatch between UI and API routes
- [x] Start agent → verify market discovery works — 131 open NBA markets found
- [x] Verify signals are fetched and logged to DB — agent cycle logs to AgentCycle table
- [x] Fixed MarketSchema: made fields nullable/passthrough to handle real API inconsistencies
- [x] Fixed search queries: year-aware (`NBA 2026`) instead of generic (`NBA`) which returned stale 2024 data
- [x] Fixed market discovery performance: parallel searches, skip midpoint calls when prices available
- [x] Verify LLM receives correct prompt and returns valid structured output — GPT-4o-mini returns actionable recommendations with reasoning
- [x] Fixed `RecommendationSchema.marketId` to use `z.coerce.string()` (LLM returns numeric IDs)
- [x] Verify risk filters apply correctly — confidence threshold and position size caps enforced
- [x] Verify trades attempt execution and appear in history — 5 trades logged with reasoning (fail at order book stage without funded wallet)
- [x] Verify signals logged to DB — 30 game scores + 60 tweets across cycles
- [x] **Live trades executed** — 3 trades filled on Polymarket (Rockets Finals, Heat SE Division, SGA MVP)
- [x] Fixed token ID resolution: executor now maps marketId+side → CLOB token ID via enriched markets
- [x] Fixed OrderResultSchema to match real CLI output (snake_case fields: `order_id`, `transaction_hashes`, `error_msg`)
- [x] Fixed wallet setup: EOA mode with USDC.e funding (proxy mode requires proxy contract deployment)
- [x] Positions tracked in DB and served via API — 3 open positions after live trades
- [x] Fixed onboarding field name mismatch: UI sends `openaiKey`/`polymarketKey`, backend now accepts both short and long names
- [x] Fixed dashboard market rendering: updated Market interface to match `EnrichedMarket` (id, outcomes as objects with prices)
- [x] Fixed operator precedence bug in `findTokenId()` fallback clause
- [x] Fixed position avgPrice: was using `rec.confidence` (0-1) as price proxy, now uses actual outcome price from enriched market
- [x] Fixed README: corrected market type names (`game_winner`→`moneyline`, `spread`→`spreads`, added `totals`)
- [x] Fixed configure route: now stores optional Twitter/BallDontLie keys during manual entry
- [x] Rewrote `SKILL.md` to match real system (correct CLI commands, API routes, strategy config, setup instructions)
- [ ] Test circuit breaker (set low maxDailyLoss, confirm agent stops trading)
- [ ] Test custom rules (add a rule, confirm LLM respects it)

## Optional Polish

### UI/UX
- [ ] Toast notifications for errors and success states
- [ ] WebSocket or SSE for real-time dashboard updates (replace 30s polling)
- [ ] Mobile responsive improvements
- [ ] Dark/light theme toggle

### Testing
- [ ] Unit tests for risk layer (`applyRiskFilters`)
- [ ] Unit tests for orchestrator key encode/decode
- [ ] Integration tests for CLI wrapper (mock execFile)
- [ ] Integration tests for API routes

### Deployment
- [ ] Dockerfile for containerized deployment
- [ ] Docker Compose with volume for SQLite persistence
- [ ] Vercel deployment config (note: agent loop won't work on serverless — needs a long-running process)

### Features
- [ ] Historical P&L tracking and charting (currently scaffolded, needs real data)
- [ ] Email/Telegram alerts on trades or circuit breaker trips
- [ ] Multi-sport support (extend beyond NBA)
- [ ] Backtest mode (replay historical data through the analyzer)
