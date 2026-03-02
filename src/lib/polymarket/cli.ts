import { execFile } from "child_process";
import { z } from "zod";
import {
  MarketSearchResultSchema,
  MidpointSchema,
  OrderResultSchema,
  OrderListSchema,
  PositionListSchema,
  WalletAddressSchema,
  ApprovalCheckSchema,
  ApprovalSetSchema,
} from "@/lib/polymarket/types";
import type {
  MarketSearchResult,
  Midpoint,
  OrderResult,
  OrderList,
  PositionList,
  WalletAddress,
  ApprovalCheck,
  ApprovalSet,
} from "@/lib/polymarket/types";

const CLI_TIMEOUT = 30_000;
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB
const CLI_BINARY = "polymarket";

export interface CliResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function runCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      CLI_BINARY,
      [...args, "--output", "json"],
      {
        timeout: CLI_TIMEOUT,
        maxBuffer: MAX_BUFFER,
        env: {
          ...process.env,
          POLYMARKET_NON_INTERACTIVE: "1",
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          // Some CLI errors still output valid JSON to stderr or stdout
          const output = stdout?.trim() || stderr?.trim() || "";
          if (output.startsWith("{") || output.startsWith("[")) {
            resolve(output);
            return;
          }
          reject(
            new Error(
              `CLI error (${args.join(" ")}): ${error.message}${stderr ? ` | stderr: ${stderr}` : ""}`
            )
          );
          return;
        }
        resolve(stdout);
      }
    );
  });
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("CLI returned empty output");
  // Handle CLI that prints errors as JSON with an "error" field
  const parsed = JSON.parse(trimmed);
  if (parsed && typeof parsed === "object" && "error" in parsed && !Array.isArray(parsed)) {
    throw new Error(parsed.error);
  }
  return parsed;
}

function wrapResult<T>(schema: z.ZodType<T>) {
  return async (args: string[]): Promise<CliResult<T>> => {
    try {
      const raw = await runCli(args);
      const json = parseJson(raw);
      const parsed = schema.parse(json);
      return { ok: true, data: parsed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[polymarket-cli] ${message}`);
      return { ok: false, error: message };
    }
  };
}

export async function searchMarkets(
  query: string
): Promise<CliResult<MarketSearchResult>> {
  return wrapResult(MarketSearchResultSchema)(["markets", "search", query]);
}

export async function getMidpoint(
  tokenId: string
): Promise<CliResult<Midpoint>> {
  return wrapResult(MidpointSchema)(["clob", "midpoint", tokenId]);
}

// market-order flags: --token, --side (buy|sell), --amount
export async function createMarketOrder(
  tokenId: string,
  side: "BUY" | "SELL",
  amount: number
): Promise<CliResult<OrderResult>> {
  return wrapResult(OrderResultSchema)([
    "clob",
    "market-order",
    "--token",
    tokenId,
    "--side",
    side.toLowerCase(),
    "--amount",
    String(amount),
  ]);
}

// create-order flags: --token, --side (buy|sell), --price, --size
export async function createLimitOrder(
  tokenId: string,
  side: "BUY" | "SELL",
  size: number,
  price: number
): Promise<CliResult<OrderResult>> {
  return wrapResult(OrderResultSchema)([
    "clob",
    "create-order",
    "--token",
    tokenId,
    "--side",
    side.toLowerCase(),
    "--price",
    String(price),
    "--size",
    String(size),
  ]);
}

export async function getOrders(): Promise<CliResult<OrderList>> {
  return wrapResult(OrderListSchema)(["clob", "orders"]);
}

// data positions requires a wallet address as positional arg
export async function getPositions(
  address: string
): Promise<CliResult<PositionList>> {
  return wrapResult(PositionListSchema)(["data", "positions", address]);
}

export async function getWalletAddress(): Promise<CliResult<WalletAddress>> {
  return wrapResult(WalletAddressSchema)(["wallet", "address"]);
}

export async function checkApproval(): Promise<CliResult<ApprovalCheck>> {
  return wrapResult(ApprovalCheckSchema)(["approve", "check"]);
}

export async function setApproval(): Promise<CliResult<ApprovalSet>> {
  return wrapResult(ApprovalSetSchema)(["approve", "set"]);
}
