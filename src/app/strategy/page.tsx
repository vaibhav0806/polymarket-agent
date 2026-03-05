"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
  X,
  Shield,
  Flame,
  Scale,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Target,
  BarChart3,
  Gauge,
} from "lucide-react";

import { NBA_TEAMS, MARKET_TYPES } from "@/lib/constants";
import {
  Card,
  StatCard,
  PageHeader,
  SectionHeader,
  NumberInput,
  SkeletonCard,
  EmptyState,
} from "@/components/ui";

interface Strategy {
  focusTeams: string[];
  marketTypes: string[];
  riskTolerance: string;
  maxPositionSize: number;
  maxTotalExposure: number;
  minConfidence: number;
  maxDailyTrades: number;
  maxDailyLoss: number;
  orderType: string;
  pollIntervalMs: number;
  llmModel: string;
  customRules: string;
}

const defaultStrategy: Strategy = {
  focusTeams: [],
  marketTypes: ["moneyline", "spreads", "totals", "player_prop", "futures"],
  riskTolerance: "moderate",
  maxPositionSize: 10,
  maxTotalExposure: 100,
  minConfidence: 0.6,
  maxDailyTrades: 10,
  maxDailyLoss: 50,
  orderType: "market",
  pollIntervalMs: 300000,
  llmModel: "gpt-4o-mini",
  customRules: "",
};

const riskConfig = {
  conservative: { icon: Shield, color: "blue", label: "Conservative" },
  moderate: { icon: Scale, color: "amber", label: "Moderate" },
  aggressive: { icon: Flame, color: "red", label: "Aggressive" },
} as const;

export default function StrategyPage() {
  const [strategy, setStrategy] = useState<Strategy>(defaultStrategy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadError, setLoadError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    fetch("/api/strategy")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load strategy");
        return r.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setStrategy({
            ...defaultStrategy,
            ...data,
            focusTeams: typeof data.focusTeams === "string"
              ? JSON.parse(data.focusTeams)
              : data.focusTeams || [],
            marketTypes: typeof data.marketTypes === "string"
              ? JSON.parse(data.marketTypes)
              : data.marketTypes || defaultStrategy.marketTypes,
          });
        }
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load strategy");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/strategy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(strategy),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 5000);
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof Strategy>(key: K, value: Strategy[K]) => {
    setStrategy((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTeam = (team: string) => {
    update(
      "focusTeams",
      strategy.focusTeams.includes(team)
        ? strategy.focusTeams.filter((t) => t !== team)
        : [...strategy.focusTeams, team],
    );
  };

  const toggleMarketType = (type: string) => {
    update(
      "marketTypes",
      strategy.marketTypes.includes(type)
        ? strategy.marketTypes.filter((t) => t !== type)
        : [...strategy.marketTypes, type],
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-56" />
          <div className="skeleton h-10 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  const riskLabel = (riskConfig[strategy.riskTolerance as keyof typeof riskConfig] ?? riskConfig.moderate).label;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Strategy"
        action={
          <button
            onClick={save}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all btn-press ${
              saveStatus === "success"
                ? "bg-gradient-emerald text-white shadow-lg shadow-emerald-500/20"
                : saveStatus === "error"
                  ? "bg-gradient-red text-white shadow-lg shadow-red-500/20"
                  : "bg-gradient-blue text-white shadow-lg shadow-blue-500/20"
            } disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saveStatus === "success" ? (
              <CheckCircle2 size={14} />
            ) : saveStatus === "error" ? (
              <AlertCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : saveStatus === "success" ? "Saved!" : "Save"}
          </button>
        }
      />

      {loadError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-400">
            Could not load saved strategy: {loadError}. Showing defaults.
          </p>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Stats row - mirrors dashboard pattern */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Risk Level"
          value={riskLabel}
          icon={<Gauge size={18} />}
          accent={
            strategy.riskTolerance === "conservative"
              ? "text-blue-400"
              : strategy.riskTolerance === "aggressive"
                ? "text-red-400"
                : "text-amber-400"
          }
          gradient={
            strategy.riskTolerance === "conservative"
              ? "blue"
              : strategy.riskTolerance === "aggressive"
                ? "red"
                : "amber"
          }
          sub={`${strategy.focusTeams.length || "All"} team${strategy.focusTeams.length !== 1 ? "s" : ""} tracked`}
        />
        <StatCard
          label="Max Position"
          value={`$${strategy.maxPositionSize}`}
          icon={<DollarSign size={18} />}
          accent="text-blue-400"
          gradient="blue"
          sub={`${strategy.orderType} orders`}
        />
        <StatCard
          label="Max Exposure"
          value={`$${strategy.maxTotalExposure}`}
          icon={<Target size={18} />}
          accent="text-purple-400"
          gradient="purple"
          sub={`$${strategy.maxDailyLoss} daily loss limit`}
        />
        <StatCard
          label="Min Confidence"
          value={`${(strategy.minConfidence * 100).toFixed(0)}%`}
          icon={<BarChart3 size={18} />}
          accent="text-emerald-400"
          gradient="emerald"
          sub={`${strategy.maxDailyTrades} trades/day max`}
        />
      </div>

      {/* Main config grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Custom Rules */}
        <Card className="lg:col-span-2">
          <SectionHeader>Custom Trading Rules</SectionHeader>
          <p className="text-xs text-gray-500 mb-3 -mt-2">
            Define rules in plain English. The AI agent will follow these when
            making trading decisions.
          </p>
          <textarea
            value={strategy.customRules}
            onChange={(e) => update("customRules", e.target.value)}
            placeholder="e.g., Only trade when a star player is injured. Avoid games with less than 2 hours until tip-off. Never bet against the Celtics at home."
            rows={4}
            className="w-full bg-[#060b16] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition-all"
          />
        </Card>

        {/* Focus Teams */}
        <Card className="lg:col-span-2">
          <SectionHeader>Focus Teams</SectionHeader>
          <p className="text-xs text-gray-500 mb-3 -mt-2">
            Select teams to focus on. Leave empty to trade all NBA markets.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {NBA_TEAMS.map((team) => (
              <button
                key={team}
                onClick={() => toggleTeam(team)}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all btn-press ${
                  strategy.focusTeams.includes(team)
                    ? "bg-gradient-blue border-blue-500/30 text-white shadow-sm shadow-blue-500/10"
                    : "bg-[#060b16] border-[#1e293b] text-gray-500 hover:text-gray-300 hover:border-gray-500"
                }`}
              >
                {team}
              </button>
            ))}
          </div>
          {strategy.focusTeams.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              <span className="text-xs text-gray-500">
                Selected: {strategy.focusTeams.join(", ")}
              </span>
              <button
                onClick={() => update("focusTeams", [])}
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Risk & Sizing + Market Types row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader>Risk & Position Sizing</SectionHeader>

          {/* Risk Tolerance */}
          <div className="mb-5">
            <label className="block text-xs text-gray-400 mb-2">
              Risk Tolerance
            </label>
            <div className="flex gap-2">
              {(["conservative", "moderate", "aggressive"] as const).map(
                (level) => {
                  const cfg = riskConfig[level];
                  const Icon = cfg.icon;
                  const active = strategy.riskTolerance === level;
                  const colorMap = {
                    blue: active ? "bg-gradient-blue border-blue-500/30 text-white shadow-sm shadow-blue-500/10" : "",
                    amber: active ? "bg-gradient-amber border-amber-500/30 text-white shadow-sm shadow-amber-500/10" : "",
                    red: active ? "bg-gradient-red border-red-500/30 text-white shadow-sm shadow-red-500/10" : "",
                  };
                  return (
                    <button
                      key={level}
                      onClick={() => update("riskTolerance", level)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs rounded-xl border font-medium capitalize transition-all btn-press ${
                        active
                          ? colorMap[cfg.color]
                          : "bg-[#060b16] border-[#1e293b] text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <Icon size={14} />
                      {cfg.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <NumberInput
              label="Max Position Size ($)"
              value={strategy.maxPositionSize}
              onChange={(v) => update("maxPositionSize", v)}
              min={1}
              max={1000}
            />
            <NumberInput
              label="Max Total Exposure ($)"
              value={strategy.maxTotalExposure}
              onChange={(v) => update("maxTotalExposure", v)}
              min={1}
              max={10000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <NumberInput
              label="Min Confidence"
              value={strategy.minConfidence}
              onChange={(v) => update("minConfidence", v)}
              min={0.1}
              max={1}
              step={0.05}
            />
            <NumberInput
              label="Max Daily Trades"
              value={strategy.maxDailyTrades}
              onChange={(v) => update("maxDailyTrades", Math.round(v))}
              min={1}
              max={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Max Daily Loss ($)"
              value={strategy.maxDailyLoss}
              onChange={(v) => update("maxDailyLoss", v)}
              min={1}
              max={1000}
            />
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Order Type
              </label>
              <select
                value={strategy.orderType}
                onChange={(e) => update("orderType", e.target.value)}
                className="w-full bg-[#060b16] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Market Types */}
        <Card className="lg:col-span-1">
          <SectionHeader>Market Types</SectionHeader>
          <div className="space-y-2">
            {MARKET_TYPES.map(({ value, label }) => {
              const checked = strategy.marketTypes.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleMarketType(value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl border font-medium transition-all btn-press text-left ${
                    checked
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "bg-[#060b16] border-[#1e293b] text-gray-500 hover:text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked ? "border-blue-400 bg-blue-500" : "border-gray-600"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                  {label}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Advanced (collapsible) */}
      <Card>
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <SectionHeader>Advanced</SectionHeader>
          {advancedOpen ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </button>
        {advancedOpen && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1e293b]">
            <NumberInput
              label="Poll Interval (ms)"
              value={strategy.pollIntervalMs}
              onChange={(v) => update("pollIntervalMs", v)}
              min={60000}
              max={3600000}
              step={60000}
            />
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                LLM Model
              </label>
              <select
                value={strategy.llmModel}
                onChange={(e) => update("llmModel", e.target.value)}
                className="w-full bg-[#060b16] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
