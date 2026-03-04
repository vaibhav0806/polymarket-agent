"use client";

import { useState, useEffect, useCallback } from "react";
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

interface AgentStatus {
  running: boolean;
  lastCycleAt: string | null;
  cycleCount: number;
  recentCycles: {
    id: number;
    status: string;
    marketsFound: number;
    signalsFetched: number;
    tradesExecuted: number;
    durationMs: number | null;
    createdAt: string;
  }[];
}

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
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, marketsRes, positionsRes, tradesRes] =
        await Promise.allSettled([
          fetch("/api/agent/status").then((r) => r.json()),
          fetch("/api/markets").then((r) => r.json()),
          fetch("/api/positions").then((r) => r.json()),
          fetch("/api/trades?limit=10").then((r) => r.json()),
        ]);

      if (statusRes.status === "fulfilled" && !statusRes.value.error)
        setStatus(statusRes.value);
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
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const toggleAgent = async () => {
    setToggling(true);
    try {
      const endpoint = status?.running
        ? "/api/agent/stop"
        : "/api/agent/start";
      await fetch(endpoint, { method: "POST" });
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch("/api/agent/status");
      const data = await res.json();
      if (!data.error) setStatus(data);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  // Build P&L chart data from trades
  const pnlChartData = trades
    .slice()
    .reverse()
    .reduce(
      (acc, trade, i) => {
        const prev = i > 0 ? acc[i - 1].pnl : 0;
        const delta =
          trade.status === "filled"
            ? trade.action === "SELL"
              ? trade.amount * (trade.price - 0.5)
              : -trade.amount * trade.price
            : 0;
        acc.push({
          name: new Date(trade.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          pnl: Math.round((prev + delta) * 100) / 100,
        });
        return acc;
      },
      [] as { name: string; pnl: number }[],
    );

  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const totalExposure = positions.reduce((sum, p) => sum + p.size * p.avgPrice, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Agent Status"
          value={status?.running ? "Running" : "Stopped"}
          icon={<Zap size={16} />}
          accent={status?.running ? "text-emerald-400" : "text-gray-500"}
          sub={
            status?.lastCycleAt
              ? `Last cycle: ${timeAgo(status.lastCycleAt)}`
              : "No cycles yet"
          }
        />
        <StatCard
          label="Total P&L"
          value={`$${totalPnl.toFixed(2)}`}
          icon={
            totalPnl >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )
          }
          accent={totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
          sub={`${positions.length} open position${positions.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Exposure"
          value={`$${totalExposure.toFixed(2)}`}
          icon={<DollarSign size={16} />}
          accent="text-blue-400"
          sub={`Across ${positions.length} market${positions.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Cycles Run"
          value={String(status?.cycleCount ?? 0)}
          icon={<BarChart3 size={16} />}
          accent="text-purple-400"
          sub={`${trades.length} recent trades`}
        />
      </div>

      {/* Agent control + P&L chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-400 mb-4">
            Agent Control
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`w-3 h-3 rounded-full ${status?.running ? "bg-emerald-500 animate-pulse" : "bg-gray-600"}`}
            />
            <span className="text-white font-medium">
              {status?.running ? "Running" : "Stopped"}
            </span>
          </div>
          <button
            onClick={toggleAgent}
            disabled={toggling}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              status?.running
                ? "bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-900/50"
                : "bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-900/50"
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
              <h3 className="text-xs text-gray-500 mb-2">Recent Cycles</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {status.recentCycles.slice(0, 5).map((cycle) => (
                  <div
                    key={cycle.id}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cycle.status === "completed"
                            ? "bg-emerald-500"
                            : cycle.status === "error"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        }`}
                      />
                      <span className="text-gray-400">
                        {cycle.tradesExecuted} trades
                      </span>
                    </div>
                    <span className="text-gray-600">
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
          <h2 className="text-sm font-medium text-gray-400 mb-4">
            P&L Over Time
          </h2>
          {pnlChartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pnlChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">
              Chart will appear after trades are executed
            </div>
          )}
        </Card>
      </div>

      {/* Markets + Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-medium text-gray-400 mb-4">
            Active Markets
          </h2>
          {markets.length === 0 ? (
            <p className="text-sm text-gray-600">No markets loaded</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {markets.slice(0, 15).map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between py-2 border-b border-gray-800/50 last:border-0"
                >
                  <p className="text-sm text-gray-300 pr-4 flex-1 leading-snug">
                    {m.question}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    {m.outcomes?.map((outcome, i) => (
                      <span
                        key={outcome.tokenId || i}
                        className={`text-xs px-2 py-0.5 rounded font-mono ${
                          i === 0
                            ? "bg-emerald-900/30 text-emerald-400"
                            : "bg-red-900/30 text-red-400"
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
          <h2 className="text-sm font-medium text-gray-400 mb-4">
            Open Positions
          </h2>
          {positions.length === 0 ? (
            <p className="text-sm text-gray-600">No open positions</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {positions.map((p) => (
                <div
                  key={p.marketId}
                  className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm text-gray-300 truncate">
                      {p.marketTitle}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.side} &middot; {p.size} shares @ {p.avgPrice.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono font-medium ${
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
        <h2 className="text-sm font-medium text-gray-400 mb-4">
          Recent Trades
        </h2>
        {trades.length === 0 ? (
          <p className="text-sm text-gray-600">No trades yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">Market</th>
                  <th className="pb-2 pr-4 font-medium">Side</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Price</th>
                  <th className="pb-2 pr-4 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 10).map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-800/50 last:border-0"
                  >
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                      <Clock size={10} className="inline mr-1" />
                      {timeAgo(t.createdAt)}
                    </td>
                    <td
                      className="py-2.5 pr-4 text-gray-300 max-w-[200px] truncate"
                      title={t.marketTitle}
                    >
                      {t.marketTitle}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          t.action === "BUY"
                            ? "bg-emerald-900/30 text-emerald-400"
                            : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {t.action} {t.side}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-gray-300">
                      ${t.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-gray-300">
                      {(t.price * 100).toFixed(0)}c
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`font-mono ${
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
                    <td className="py-2.5">
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

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <p className={`text-lg font-semibold ${accent}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-1">{sub}</p>
    </Card>
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
