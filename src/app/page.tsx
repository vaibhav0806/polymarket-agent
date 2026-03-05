"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Square,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  BarChart2,
  Briefcase,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAgentStatus } from "@/components/agent-status-context";
import {
  Card,
  StatCard,
  StatusBadge,
  SkeletonCard,
  SkeletonRow,
  EmptyState,
  PageHeader,
  SectionHeader,
  timeAgo,
} from "@/components/ui";

interface Market {
  id: string;
  question: string;
  outcomes: { title: string; tokenId: string; price: number | null }[];
  type: string;
  volume: number;
  closed: boolean;
}

interface Position {
  marketId: string;
  marketTitle: string;
  side: string;
  size: number;
  avgPrice: number;
  currentPrice: number | null;
  pnl: number | null;
}

interface Trade {
  id: number;
  marketTitle: string;
  side: string;
  action: string;
  amount: number;
  price: number;
  confidence: number;
  reasoning: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const { status, refresh: refreshStatus } = useAgentStatus();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [marketsRes, positionsRes, tradesRes] =
        await Promise.allSettled([
          fetch("/api/markets").then((r) => r.json()),
          fetch("/api/positions").then((r) => r.json()),
          fetch("/api/trades?limit=10").then((r) => r.json()),
        ]);

      if (marketsRes.status === "fulfilled" && marketsRes.value.markets)
        setMarkets(marketsRes.value.markets);
      if (positionsRes.status === "fulfilled" && positionsRes.value.positions)
        setPositions(positionsRes.value.positions);
      if (tradesRes.status === "fulfilled" && tradesRes.value.trades)
        setTrades(tradesRes.value.trades);
    } catch {
      // silent fail on dashboard
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleAgent = async () => {
    setToggling(true);
    try {
      const endpoint = status?.running
        ? "/api/agent/stop"
        : "/api/agent/start";
      await fetch(endpoint, { method: "POST" });
      await new Promise((r) => setTimeout(r, 500));
      await refreshStatus();
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);

  const pnlChartData = positions
    .filter((p) => p.pnl !== null && p.pnl !== undefined)
    .map((p) => ({
      name: p.marketTitle.length > 30
        ? p.marketTitle.slice(0, 28) + "\u2026"
        : p.marketTitle,
      pnl: Math.round((p.pnl ?? 0) * 10000) / 10000,
    }));
  const totalExposure = positions.reduce((sum, p) => sum + p.size * p.avgPrice, 0);

  if (loading || !status) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonCard className="lg:col-span-1 h-64" />
          <SkeletonCard className="lg:col-span-2 h-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        action={
          <button
            onClick={() => { fetchData(); refreshStatus(); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors btn-press"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Agent Status"
          value={status?.running ? "Running" : "Stopped"}
          icon={<Zap size={18} />}
          accent={status?.running ? "text-emerald-400" : "text-gray-500"}
          gradient={status?.running ? "emerald" : "blue"}
          sub={
            status?.lastCycleAt
              ? `Last cycle: ${timeAgo(status.lastCycleAt)}`
              : status?.recentCycles?.length
                ? `Last cycle: ${timeAgo(status.recentCycles[0].createdAt)}`
                : "No cycles yet"
          }
        />
        <StatCard
          label="Total P&L"
          value={`$${totalPnl.toFixed(2)}`}
          icon={
            totalPnl >= 0 ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={18} />
            )
          }
          accent={totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
          gradient={totalPnl >= 0 ? "emerald" : "red"}
          sub={`${positions.length} open position${positions.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Exposure"
          value={`$${totalExposure.toFixed(2)}`}
          icon={<DollarSign size={18} />}
          accent="text-blue-400"
          gradient="blue"
          sub={`Across ${positions.length} market${positions.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Cycles Run"
          value={String(status?.cycleCount ?? 0)}
          icon={<BarChart3 size={18} />}
          accent="text-purple-400"
          gradient="purple"
          sub={`${trades.length} recent trades`}
        />
      </div>

      {/* Agent control + P&L chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <SectionHeader>Agent Control</SectionHeader>
          <div className="flex items-center gap-3 mb-5">
            <span
              className={`w-3.5 h-3.5 rounded-full ring-4 ${
                status?.running
                  ? "bg-emerald-400 ring-emerald-400/20 animate-pulse"
                  : "bg-gray-600 ring-gray-600/20"
              }`}
            />
            <span className="text-white font-semibold text-lg">
              {status?.running ? "Running" : "Stopped"}
            </span>
          </div>
          <button
            onClick={toggleAgent}
            disabled={toggling}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all btn-press ${
              status?.running
                ? "bg-gradient-red text-white shadow-lg shadow-red-500/20"
                : "bg-gradient-emerald text-white shadow-lg shadow-emerald-500/20"
            } disabled:opacity-50`}
          >
            {toggling ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : status?.running ? (
              <Square size={14} />
            ) : (
              <Play size={14} />
            )}
            {toggling
              ? "Processing..."
              : status?.running
                ? "Stop Agent"
                : "Start Agent"}
          </button>

          {status?.recentCycles && status.recentCycles.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Recent Cycles
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {status.recentCycles.slice(0, 5).map((cycle) => (
                  <div
                    key={cycle.id}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cycle.status === "completed"
                            ? "bg-emerald-400"
                            : cycle.status === "error"
                              ? "bg-red-400"
                              : "bg-yellow-400"
                        }`}
                      />
                      <span className="text-gray-400">
                        {cycle.tradesExecuted} trades
                      </span>
                    </div>
                    <span className="text-gray-600 font-mono">
                      {cycle.durationMs
                        ? `${(cycle.durationMs / 1000).toFixed(1)}s`
                        : "--"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionHeader>P&L by Position</SectionHeader>
          {pnlChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pnlChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0a0f1a",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: "#0a0f1a" }}
                  activeDot={{ r: 6, fill: "#34d399", stroke: "#0a0f1a", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={BarChart2}
              title="No P&L data yet"
              description="Chart will appear when positions have P&L data"
            />
          )}
        </Card>
      </div>

      {/* Markets + Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader>Active Markets</SectionHeader>
          {markets.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No markets loaded"
              description="Markets will appear when the agent discovers NBA prediction markets"
            />
          ) : (
            <div className="space-y-0.5 max-h-80 overflow-y-auto">
              {markets.slice(0, 15).map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between py-3 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <p className="text-sm text-gray-300 pr-4 flex-1 leading-snug">
                    {m.question}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    {m.outcomes?.map((outcome, i) => (
                      <span
                        key={outcome.tokenId || i}
                        className={`text-xs px-2 py-0.5 rounded-lg font-mono font-medium ${
                          i === 0
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {outcome.title}{" "}
                        {outcome.price !== null
                          ? `${(outcome.price * 100).toFixed(0)}c`
                          : "--"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader>Open Positions</SectionHeader>
          {positions.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No open positions"
              description="Positions will appear when the agent executes trades"
            />
          ) : (
            <div className="space-y-0.5 max-h-80 overflow-y-auto">
              {positions.map((p) => (
                <div
                  key={p.marketId}
                  className={`flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/[0.04] transition-colors border-l-2 ${
                    (p.pnl ?? 0) >= 0 ? "border-emerald-500/30" : "border-red-500/30"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm text-gray-300 truncate">
                      {p.marketTitle}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.side} &middot; {parseFloat(p.size.toFixed(2))} shares @ {p.avgPrice.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono font-bold ${
                      (p.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {(p.pnl ?? 0) >= 0 ? "+" : ""}
                    {(p.pnl ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <SectionHeader>Recent Trades</SectionHeader>
        {trades.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No trades yet"
            description="Trades will appear here after the agent executes its first cycle"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-[#1e293b]">
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Market</th>
                  <th className="pb-3 pr-4 font-medium">Side</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Price</th>
                  <th className="pb-3 pr-4 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 10).map((t, idx) => (
                  <tr
                    key={t.id}
                    className={`border-b border-[#1e293b]/50 last:border-0 hover:bg-white/[0.04] transition-colors ${
                      idx % 2 === 1 ? "bg-white/[0.01]" : ""
                    }`}
                  >
                    <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                      <Clock size={10} className="inline mr-1" />
                      {timeAgo(t.createdAt)}
                    </td>
                    <td
                      className="py-3 pr-4 text-gray-300 max-w-[200px] truncate"
                      title={t.marketTitle}
                    >
                      {t.marketTitle}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                          t.action === "BUY"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {t.action} {t.side}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-300 font-medium">
                      ${t.amount.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-300">
                      {t.price > 0 ? `${(t.price * 100).toFixed(0)}c` : "--"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`font-mono font-medium ${
                          t.confidence >= 0.7
                            ? "text-emerald-400"
                            : t.confidence >= 0.5
                              ? "text-yellow-400"
                              : "text-red-400"
                        }`}
                      >
                        {(t.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={t.status} />
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
