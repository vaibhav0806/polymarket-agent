"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
  RefreshCw,
} from "lucide-react";

interface Trade {
  id: number;
  marketId: string;
  marketTitle: string;
  side: string;
  action: string;
  amount: number;
  price: number;
  confidence: number;
  reasoning: string;
  status: string;
  txHash: string | null;
  errorMsg: string | null;
  cycleId: number | null;
  createdAt: string;
}

interface AgentCycle {
  id: number;
  status: string;
  marketsFound: number;
  signalsFetched: number;
  tradesExecuted: number;
  errorMsg: string | null;
  durationMs: number | null;
  createdAt: string;
}

const STATUS_OPTIONS = ["all", "filled", "pending", "failed", "cancelled"];

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [cycles, setCycles] = useState<AgentCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);

  const LIMIT = 20;

  const fetchTrades = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(
          `/api/trades?limit=${LIMIT}&offset=${currentOffset}`,
        );
        const data = await res.json();
        if (data.trades) {
          if (reset) {
            setTrades(data.trades);
            setOffset(LIMIT);
          } else {
            setTrades((prev) => [...prev, ...data.trades]);
            setOffset((prev) => prev + LIMIT);
          }
          setTotal(data.total);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [offset],
  );

  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/status");
      const data = await res.json();
      if (data.recentCycles) {
        setCycles(data.recentCycles);
      }
    } catch {
      // ignore
    } finally {
      setCyclesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades(true);
    fetchCycles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTrades =
    statusFilter === "all"
      ? trades
      : trades.filter((t) => t.status === statusFilter);

  const hasMore = trades.length < total;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Trade History</h1>
        <button
          onClick={() => fetchTrades(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-gray-500" />
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-md border capitalize transition-colors ${
                statusFilter === s
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-transparent border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-600">
            {trades.length === 0
              ? "No trades recorded yet"
              : "No trades match the selected filter"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800 bg-gray-900/80">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Market</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    expanded={expandedId === t.id}
                    onToggle={() =>
                      setExpandedId(expandedId === t.id ? null : t.id)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="p-4 border-t border-gray-800 text-center">
            <button
              onClick={() => fetchTrades(false)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 size={12} className="animate-spin" />
              ) : null}
              {loadingMore ? "Loading..." : `Load More (${total - trades.length} remaining)`}
            </button>
          </div>
        )}
      </div>

      {/* Agent Cycles */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-400 mb-4">
          Agent Cycle Log
        </h2>
        {cyclesLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-gray-600" />
          </div>
        ) : cycles.length === 0 ? (
          <p className="text-sm text-gray-600">No cycles recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Cycle</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Markets</th>
                  <th className="pb-2 pr-4 font-medium">Signals</th>
                  <th className="pb-2 pr-4 font-medium">Trades</th>
                  <th className="pb-2 pr-4 font-medium">Duration</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-800/50 last:border-0"
                  >
                    <td className="py-2 pr-4 text-gray-400 font-mono">
                      #{c.id}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          c.status === "completed"
                            ? "bg-emerald-900/30 text-emerald-400"
                            : c.status === "error"
                              ? "bg-red-900/30 text-red-400"
                              : "bg-yellow-900/30 text-yellow-400"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400">
                      {c.marketsFound}
                    </td>
                    <td className="py-2 pr-4 text-gray-400">
                      {c.signalsFetched}
                    </td>
                    <td className="py-2 pr-4 text-gray-400">
                      {c.tradesExecuted}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 font-mono text-xs">
                      {c.durationMs
                        ? `${(c.durationMs / 1000).toFixed(1)}s`
                        : "--"}
                    </td>
                    <td className="py-2 text-gray-500 text-xs">
                      {timeAgo(c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({
  trade,
  expanded,
  onToggle,
}: {
  trade: Trade;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
          <Clock size={10} className="inline mr-1" />
          {timeAgo(trade.createdAt)}
        </td>
        <td
          className="px-4 py-3 text-gray-300 max-w-[220px] truncate"
          title={trade.marketTitle}
        >
          {trade.marketTitle}
        </td>
        <td className="px-4 py-3">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              trade.side === "YES"
                ? "bg-emerald-900/30 text-emerald-400"
                : "bg-red-900/30 text-red-400"
            }`}
          >
            {trade.side}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`text-xs ${trade.action === "BUY" ? "text-emerald-400" : "text-red-400"}`}
          >
            {trade.action}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-gray-300">
          ${trade.amount.toFixed(2)}
        </td>
        <td className="px-4 py-3 font-mono text-gray-300">
          {(trade.price * 100).toFixed(0)}c
        </td>
        <td className="px-4 py-3">
          <span
            className={`font-mono text-xs ${
              trade.confidence >= 0.7
                ? "text-emerald-400"
                : trade.confidence >= 0.5
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {(trade.confidence * 100).toFixed(0)}%
          </span>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={trade.status} />
        </td>
        <td className="px-4 py-3 text-gray-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-800/20">
          <td colSpan={9} className="px-4 py-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">Reasoning:</span>
                <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                  {trade.reasoning}
                </p>
              </div>
              <div className="flex gap-6 text-xs text-gray-500">
                {trade.txHash && (
                  <span>
                    TX: <span className="font-mono text-gray-400">{trade.txHash}</span>
                  </span>
                )}
                {trade.errorMsg && (
                  <span className="text-red-400">Error: {trade.errorMsg}</span>
                )}
                {trade.cycleId && (
                  <span>Cycle: #{trade.cycleId}</span>
                )}
                <span>
                  {new Date(trade.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    filled: "bg-emerald-900/30 text-emerald-400",
    pending: "bg-yellow-900/30 text-yellow-400",
    failed: "bg-red-900/30 text-red-400",
    cancelled: "bg-gray-800 text-gray-500",
  };
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
