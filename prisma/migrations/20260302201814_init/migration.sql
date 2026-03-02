-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "focusTeams" TEXT NOT NULL DEFAULT '[]',
    "marketTypes" TEXT NOT NULL DEFAULT '["game_winner","spread","player_prop","futures"]',
    "riskTolerance" TEXT NOT NULL DEFAULT 'moderate',
    "maxPositionSize" REAL NOT NULL DEFAULT 10,
    "maxTotalExposure" REAL NOT NULL DEFAULT 100,
    "minConfidence" REAL NOT NULL DEFAULT 0.6,
    "maxDailyTrades" INTEGER NOT NULL DEFAULT 10,
    "maxDailyLoss" REAL NOT NULL DEFAULT 50,
    "orderType" TEXT NOT NULL DEFAULT 'market',
    "pollIntervalMs" INTEGER NOT NULL DEFAULT 300000,
    "llmModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "customRules" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "price" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "errorMsg" TEXT,
    "cycleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "cycleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentCycle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "marketsFound" INTEGER NOT NULL DEFAULT 0,
    "signalsFetched" INTEGER NOT NULL DEFAULT 0,
    "tradesExecuted" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Position" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "avgPrice" REAL NOT NULL,
    "currentPrice" REAL,
    "pnl" REAL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Trade_marketId_idx" ON "Trade"("marketId");

-- CreateIndex
CREATE INDEX "Trade_createdAt_idx" ON "Trade"("createdAt");

-- CreateIndex
CREATE INDEX "Signal_source_idx" ON "Signal"("source");

-- CreateIndex
CREATE INDEX "Signal_createdAt_idx" ON "Signal"("createdAt");

-- CreateIndex
CREATE INDEX "AgentCycle_createdAt_idx" ON "AgentCycle"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Position_marketId_key" ON "Position"("marketId");
