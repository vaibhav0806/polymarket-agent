"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  Card,
  StatCard,
  StatusBadge,
  PageHeader,
  SectionHeader,
  EmptyState,
  SkeletonCard,
  SkeletonRow,
  timeAgo,
} from "@/components/ui";

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
    async (reset = false, filter?: string) => {
      const currentOffset = reset ? 0 : offset;
      const currentFilter = filter ?? statusFilter;
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const statusParam = currentFilter !== "all" ? `&status=${currentFilter}` : "";
        const res = await fetch(
          `/api/trades?limit=${LIMIT}&offset=${currentOffset}${statusParam}`,
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
    [offset, statusFilter],
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

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    fetchTrades(true, filter);
  };

  const hasMore = trades.length < total;

  // Compute stats
  const filledCount = trades.filter((t) => t.status === "filled").length;
  const failedCount = trades.filter((t) => t.status === "failed").length;
  const totalVolume = trades.reduce((s, t) => s + t.amount, 0);
  const avgConfidence = trades.length > 0
    ? trades.reduce((s, t) => s + t.confidence, 0) / trades.length
    : 0;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-8 w-20 rounded-full" />)}
        </div>
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-48" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Trade History"
        action={
          <button
            onClick={() => { fetchTrades(true); fetchCycles(); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors btn-press"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      {/* Stats row - mirrors dashboard pattern */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Trades"
          value={String(total)}
          icon={<BarChart3 size={18} />}
          accent="text-blue-400"
          gradient="blue"
          sub={`${trades.length} loaded`}
        />
        <StatCard
          label="Filled"
          value={String(filledCount)}
          icon={<CheckCircle size={18} />}
          accent="text-emerald-400"
          gradient="emerald"
          sub={total > 0 ? `${((filledCount / trades.length) * 100).toFixed(0)}% success rate` : "No data"}
        />
        <StatCard
          label="Volume"
          value={`$${totalVolume.toFixed(2)}`}
          icon={<Activity size={18} />}
          accent="text-purple-400"
          gradient="purple"
          sub={`${failedCount} failed`}
        />
        <StatCard
          label="Avg Confidence"
          value={`${(avgConfidence * 100).toFixed(0)}%`}
          icon={<XCircle size={18} />}
          accent="text-amber-400"
          gradient="amber"
          sub={`${cycles.length} agent cycles`}
        />
      </div>

      {/* Filter - segmented control */}
      <div className="inline-flex items-center bg-[#0a0f1a] border border-[#1e293b] rounded-xl p-1">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium capitalize transition-all ${
              statusFilter === s
                ? "bg-white/10 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Trades Table */}
      <Card className="!p-0 overflow-hidden">
        {trades.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FileText}
              title="No trades recorded"
              description="Trades will appear here after the agent executes its first cycle"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-[#1e293b] bg-white/[0.02]">
                  <th className="px-5 py-3.5 font-medium">Time</th>
                  <th className="px-5 py-3.5 font-medium">Market</th>
                  <th className="px-5 py-3.5 font-medium">Side</th>
                  <th className="px-5 py-3.5 font-medium">Action</th>
                  <th className="px-5 py-3.5 font-medium">Amount</th>
                  <th className="px-5 py-3.5 font-medium">Price</th>
                  <th className="px-5 py-3.5 font-medium">Confidence</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, idx) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    expanded={expandedId === t.id}
                    onToggle={() =>
                      setExpandedId(expandedId === t.id ? null : t.id)
                    }
                    isOdd={idx % 2 === 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="p-4 border-t border-[#1e293b] text-center">
            <button
              onClick={() => fetchTrades(false)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-gray-400 hover:text-white border border-[#1e293b] rounded-xl hover:border-gray-500 transition-all btn-press disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 size={12} className="animate-spin" />
              ) : null}
              {loadingMore ? "Loading..." : `Load More (${total - trades.length} remaining)`}
            </button>
          </div>
        )}
      </Card>

      {/* Agent Cycles */}
      <Card>
        <SectionHeader>Agent Cycle Log</SectionHeader>

        {cyclesLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : cycles.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No cycles recorded"
            description="Agent cycles will appear here after the agent runs"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-[#1e293b]">
                  <th className="pb-3 pr-4 font-medium">Cycle</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Markets</th>
                  <th className="pb-3 pr-4 font-medium">Signals</th>
                  <th className="pb-3 pr-4 font-medium">Trades</th>
                  <th className="pb-3 pr-4 font-medium">Duration</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`border-b border-[#1e293b]/50 last:border-0 hover:bg-white/[0.04] transition-colors ${
                      idx % 2 === 1 ? "bg-white/[0.01]" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-4 text-gray-400 font-mono font-medium">
                      #{c.id}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 font-mono">
                      {c.marketsFound}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 font-mono">
                      {c.signalsFetched}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 font-mono">
                      {c.tradesExecuted}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">
                      {c.durationMs
                        ? `${(c.durationMs / 1000).toFixed(1)}s`
                        : "--"}
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">
                      {timeAgo(c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function TradeRow({
  trade,
  expanded,
  onToggle,
  isOdd,
}: {
  trade: Trade;
  expanded: boolean;
  onToggle: () => void;
  isOdd: boolean;
}) {
  return (
    <>
      <tr
        className={`border-b border-[#1e293b]/50 hover:bg-white/[0.04] cursor-pointer transition-colors ${
          isOdd ? "bg-white/[0.01]" : ""
        }`}
        onClick={onToggle}
      >
        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
          <Clock size={10} className="inline mr-1" />
          {timeAgo(trade.createdAt)}
        </td>
        <td
          className="px-5 py-3.5 text-gray-300 max-w-[220px] truncate"
          title={trade.marketTitle}
        >
          {trade.marketTitle}
        </td>
        <td className="px-5 py-3.5">
          <span
            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
              trade.side === "YES"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {trade.side}
          </span>
        </td>
        <td className="px-5 py-3.5">
          <span
            className={`text-xs font-medium ${trade.action === "BUY" ? "text-emerald-400" : "text-red-400"}`}
          >
            {trade.action}
          </span>
        </td>
        <td className="px-5 py-3.5 font-mono text-gray-300 font-medium">
          ${trade.amount.toFixed(2)}
        </td>
        <td className="px-5 py-3.5 font-mono text-gray-300">
          {trade.price > 0 ? `${(trade.price * 100).toFixed(0)}c` : "--"}
        </td>
        <td className="px-5 py-3.5">
          <span
            className={`font-mono font-medium text-xs ${
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
        <td className="px-5 py-3.5">
          <StatusBadge status={trade.status} />
        </td>
        <td className="px-5 py-3.5 text-gray-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white/[0.02]">
          <td colSpan={9} className="px-5 py-5">
            <div className="space-y-3 pl-2 border-l-2 border-blue-500/30">
              <div className="ml-4">
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Reasoning
                </span>
                <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">
                  {trade.reasoning}
                </p>
              </div>
              <div className="flex gap-6 text-xs text-gray-500 ml-4 pt-2">
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
