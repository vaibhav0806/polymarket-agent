import { z } from "zod";

// --- Market schemas ---

export const MarketOutcomeSchema = z.object({
  title: z.string(),
  tokenId: z.string(),
  price: z.number().optional(),
});

export const MarketSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  outcomes: z.array(MarketOutcomeSchema),
  active: z.boolean().optional(),
  closed: z.boolean().optional(),
  volume: z.number().optional(),
  liquidity: z.number().optional(),
  endDate: z.string().optional(),
});

export const MarketSearchResultSchema = z.array(MarketSchema);

// --- Midpoint ---

export const MidpointSchema = z.object({
  mid: z.number(),
});

// --- Order schemas ---

export const OrderSchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  side: z.enum(["BUY", "SELL"]),
  size: z.number(),
  price: z.number(),
  status: z.string(),
  createdAt: z.string().optional(),
});

export const OrderResultSchema = z.object({
  orderId: z.string().optional(),
  transactionHash: z.string().optional(),
  status: z.string(),
  message: z.string().optional(),
});

export const OrderListSchema = z.array(OrderSchema);

// --- Position schemas ---

export const PositionSchema = z.object({
  tokenId: z.string(),
  marketId: z.string().optional(),
  title: z.string().optional(),
  side: z.string(),
  size: z.number(),
  avgPrice: z.number().optional(),
  currentPrice: z.number().optional(),
});

export const PositionListSchema = z.array(PositionSchema);

// --- Wallet ---

export const WalletAddressSchema = z.object({
  address: z.string(),
});

// --- Approval ---

export const ApprovalCheckSchema = z.object({
  approved: z.boolean(),
});

export const ApprovalSetSchema = z.object({
  success: z.boolean(),
  transactionHash: z.string().optional(),
});

// --- Enriched market (internal use) ---

export const MarketTypeSchema = z.enum([
  "game_winner",
  "spread",
  "player_prop",
  "futures",
  "unknown",
]);

export const EnrichedMarketSchema = MarketSchema.extend({
  type: MarketTypeSchema,
  midpoints: z.record(z.string(), z.number()).optional(),
});

export const EnrichedMarketListSchema = z.array(EnrichedMarketSchema);

// --- Inferred types ---

export type MarketOutcome = z.infer<typeof MarketOutcomeSchema>;
export type Market = z.infer<typeof MarketSchema>;
export type MarketSearchResult = z.infer<typeof MarketSearchResultSchema>;
export type Midpoint = z.infer<typeof MidpointSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderResult = z.infer<typeof OrderResultSchema>;
export type OrderList = z.infer<typeof OrderListSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type PositionList = z.infer<typeof PositionListSchema>;
export type WalletAddress = z.infer<typeof WalletAddressSchema>;
export type ApprovalCheck = z.infer<typeof ApprovalCheckSchema>;
export type ApprovalSet = z.infer<typeof ApprovalSetSchema>;
export type MarketType = z.infer<typeof MarketTypeSchema>;
export type EnrichedMarket = z.infer<typeof EnrichedMarketSchema>;
