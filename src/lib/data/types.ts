import { z } from "zod";

// --- BallDontLie types ---

export const TeamSchema = z.object({
  id: z.number(),
  conference: z.string(),
  division: z.string(),
  city: z.string(),
  name: z.string(),
  full_name: z.string(),
  abbreviation: z.string(),
});

export const PlayerSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  position: z.string().optional(),
  team: TeamSchema.optional(),
});

export const GameSchema = z.object({
  id: z.number(),
  date: z.string(),
  season: z.number(),
  status: z.string(),
  home_team: TeamSchema,
  visitor_team: TeamSchema,
  home_team_score: z.number(),
  visitor_team_score: z.number(),
});

export const StandingSchema = z.object({
  team: TeamSchema,
  conference: z.string(),
  division: z.string().optional(),
  wins: z.number(),
  losses: z.number(),
  win_pct: z.number().optional(),
  conference_rank: z.number().optional(),
});

export const InjurySchema = z.object({
  player: PlayerSchema.optional(),
  player_name: z.string().optional(),
  team: TeamSchema.optional(),
  team_name: z.string().optional(),
  status: z.string(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const PlayerStatsSchema = z.object({
  id: z.number(),
  player: PlayerSchema.optional(),
  game: GameSchema.optional(),
  pts: z.number().optional(),
  reb: z.number().optional(),
  ast: z.number().optional(),
  stl: z.number().optional(),
  blk: z.number().optional(),
  min: z.string().optional(),
  fgm: z.number().optional(),
  fga: z.number().optional(),
  fg3m: z.number().optional(),
  fg3a: z.number().optional(),
  ftm: z.number().optional(),
  fta: z.number().optional(),
  turnover: z.number().optional(),
});

// --- Tweet types ---

export const TweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorId: z.string().optional(),
  authorUsername: z.string().optional(),
  createdAt: z.string().optional(),
});

// --- Signal type ---

export const SignalSourceSchema = z.enum([
  "twitter",
  "balldontlie",
  "polymarket",
]);

export const SignalTypeSchema = z.enum([
  "injury",
  "score",
  "standing",
  "tweet",
  "market",
]);

export const SignalSchema = z.object({
  source: SignalSourceSchema,
  type: SignalTypeSchema,
  data: z.unknown(),
  timestamp: z.string(),
});

// --- Inferred types ---

export type Team = z.infer<typeof TeamSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Game = z.infer<typeof GameSchema>;
export type Standing = z.infer<typeof StandingSchema>;
export type Injury = z.infer<typeof InjurySchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type Tweet = z.infer<typeof TweetSchema>;
export type SignalSource = z.infer<typeof SignalSourceSchema>;
export type SignalType = z.infer<typeof SignalTypeSchema>;
export type Signal = z.infer<typeof SignalSchema>;
