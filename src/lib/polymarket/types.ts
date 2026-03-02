import { z } from "zod";

// --- Market schema (matches real `polymarket markets search` -o json output) ---

// Only validate the fields we actually use; passthrough everything else.
// The Polymarket API frequently adds new fields or returns nulls unpredictably.
export const MarketSchema = z
  .object({
    id: z.string(),
    question: z.string(),
    outcomes: z.string(), // JSON-encoded string array, e.g. '["Yes","No"]'
    closed: z.boolean().optional(),
    // All optional fields we read — nullable to handle API inconsistencies
    conditionId: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    outcomePrices: z.string().nullable().optional(),
    volume: z.string().nullable().optional(),
    volumeNum: z.string().nullable().optional(),
    active: z.boolean().nullable().optional(),
    clobTokenIds: z.string().nullable().optional(),
    acceptingOrders: z.boolean().nullable().optional(),
    sportsMarketType: z.string().nullable().optional(),
  })
  .passthrough();

export const MarketSearchResultSchema = z.array(MarketSchema);

// --- Midpoint (matches `polymarket clob midpoint <tokenId> -o json`) ---

export const MidpointSchema = z.object({
  midpoint: z.string(), // string like "0.55"
});

// --- Order book (matches `polymarket clob book <tokenId> -o json`) ---

export const OrderBookEntrySchema = z.object({
  price: z.string(),
  size: z.string(),
});

export const OrderBookSchema = z.object({
  asks: z.array(OrderBookEntrySchema).optional(),
  bids: z.array(OrderBookEntrySchema).optional(),
});

// --- Order result (matches `polymarket clob market-order/create-order -o json`) ---
// Exact shape may vary — use passthrough to be lenient

export const OrderResultSchema = z
  .object({
    success: z.boolean().optional(),
    order_id: z.string().optional(),
    status: z.string().optional(),
    making_amount: z.string().optional(),
    taking_amount: z.string().optional(),
    transaction_hashes: z.array(z.string()).optional(),
    trade_ids: z.array(z.string()).optional(),
    error_msg: z.string().optional(),
  })
  .passthrough();

// --- Order list (matches `polymarket clob orders -o json`) ---

export const OrderSchema = z
  .object({
    id: z.string().optional(),
    asset_id: z.string().optional(),
    side: z.string().optional(),
    original_size: z.string().optional(),
    size_matched: z.string().optional(),
    price: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

export const OrderListSchema = z.array(OrderSchema);

// --- Positions (matches `polymarket data positions <address> -o json`) ---

export const PositionSchema = z
  .object({
    asset: z.string().optional(),
    conditionId: z.string().optional(),
    market: z.string().optional(),
    outcome: z.string().optional(),
    size: z.string().optional(),
    avgPrice: z.string().optional(),
    currentPrice: z.string().optional(),
    initialValue: z.string().optional(),
    currentValue: z.string().optional(),
    percentChange: z.string().optional(),
    cashPnl: z.string().optional(),
  })
  .passthrough();

export const PositionListSchema = z.array(PositionSchema);

// --- Wallet address (matches `polymarket wallet address -o json`) ---

export const WalletAddressSchema = z.object({
  address: z.string(),
});

// --- Approval check (matches `polymarket approve check -o json`) ---
// Returns an array of contract approval statuses

export const ApprovalEntrySchema = z.object({
  address: z.string(),
  contract: z.string(),
  ctf_approved: z.boolean(),
  usdc_allowance: z.string(),
  usdc_approved: z.boolean(),
});

export const ApprovalCheckSchema = z.array(ApprovalEntrySchema);

// --- Approval set (matches `polymarket approve set -o json`) ---
// Exact shape unknown — use passthrough

export const ApprovalSetSchema = z.object({}).passthrough();

// --- Enriched market (internal, used by our agent) ---

export const MarketTypeSchema = z.enum([
  "moneyline",
  "spreads",
  "totals",
  "player_prop",
  "futures",
  "unknown",
]);

export interface ParsedMarketOutcome {
  title: string;
  tokenId: string;
  price: number | null;
}

export interface EnrichedMarket {
  id: string;
  question: string;
  slug?: string;
  description?: string;
  outcomes: ParsedMarketOutcome[];
  type: MarketType;
  midpoints: Record<string, number>;
  closed: boolean;
  volume: number;
  sportsMarketType: string | null;
}

// --- Inferred types ---

export type Market = z.infer<typeof MarketSchema>;
export type MarketSearchResult = z.infer<typeof MarketSearchResultSchema>;
export type Midpoint = z.infer<typeof MidpointSchema>;
export type OrderBook = z.infer<typeof OrderBookSchema>;
export type OrderResult = z.infer<typeof OrderResultSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderList = z.infer<typeof OrderListSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type PositionList = z.infer<typeof PositionListSchema>;
export type WalletAddress = z.infer<typeof WalletAddressSchema>;
export type ApprovalEntry = z.infer<typeof ApprovalEntrySchema>;
export type ApprovalCheck = z.infer<typeof ApprovalCheckSchema>;
export type ApprovalSet = z.infer<typeof ApprovalSetSchema>;
export type MarketType = z.infer<typeof MarketTypeSchema>;
