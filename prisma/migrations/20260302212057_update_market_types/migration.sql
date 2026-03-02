-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Strategy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "focusTeams" TEXT NOT NULL DEFAULT '[]',
    "marketTypes" TEXT NOT NULL DEFAULT '["moneyline","spreads","totals","player_prop","futures"]',
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
INSERT INTO "new_Strategy" ("active", "createdAt", "customRules", "focusTeams", "id", "llmModel", "marketTypes", "maxDailyLoss", "maxDailyTrades", "maxPositionSize", "maxTotalExposure", "minConfidence", "orderType", "pollIntervalMs", "riskTolerance", "updatedAt") SELECT "active", "createdAt", "customRules", "focusTeams", "id", "llmModel", "marketTypes", "maxDailyLoss", "maxDailyTrades", "maxPositionSize", "maxTotalExposure", "minConfidence", "orderType", "pollIntervalMs", "riskTolerance", "updatedAt" FROM "Strategy";
DROP TABLE "Strategy";
ALTER TABLE "new_Strategy" RENAME TO "Strategy";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
