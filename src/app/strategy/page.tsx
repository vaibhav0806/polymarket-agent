"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
  X,
} from "lucide-react";

const NBA_TEAMS = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
];

const MARKET_TYPES = [
  { value: "game_winner", label: "Game Winner" },
  { value: "spread", label: "Spread" },
  { value: "player_prop", label: "Player Props" },
  { value: "futures", label: "Futures" },
];

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
  marketTypes: ["game_winner", "spread", "player_prop", "futures"],
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

export default function StrategyPage() {
  const [strategy, setStrategy] = useState<Strategy>(defaultStrategy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/strategy")
      .then((r) => r.json())
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
      .catch(() => {})
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-purple-400" />
          <h1 className="text-xl font-semibold text-white">
            Strategy Configuration
          </h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saveStatus === "success" ? (
            <CheckCircle2 size={14} className="text-emerald-400" />
          ) : saveStatus === "error" ? (
            <AlertCircle size={14} className="text-red-400" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Saving..." : saveStatus === "success" ? "Saved" : "Save"}
        </button>
      </div>

      {saveStatus === "error" && (
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-400">{errorMsg}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Custom Rules - prominent placement */}
        <Card>
          <h2 className="text-sm font-medium text-white mb-1">
            Custom Trading Rules
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Define rules in plain English. The AI agent will follow these when
            making trading decisions.
          </p>
          <textarea
            value={strategy.customRules}
            onChange={(e) => update("customRules", e.target.value)}
            placeholder="e.g., Only trade when a star player is injured. Avoid games with less than 2 hours until tip-off. Never bet against the Celtics at home."
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
          />
        </Card>

        {/* Focus Teams */}
        <Card>
          <h2 className="text-sm font-medium text-white mb-1">Focus Teams</h2>
          <p className="text-xs text-gray-500 mb-3">
            Select teams to focus on. Leave empty to trade all NBA markets.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {NBA_TEAMS.map((team) => (
              <button
                key={team}
                onClick={() => toggleTeam(team)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  strategy.focusTeams.includes(team)
                    ? "bg-blue-600/20 border-blue-600 text-blue-400"
                    : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
                }`}
              >
                {team}
              </button>
            ))}
          </div>
          {strategy.focusTeams.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500">
                Selected: {strategy.focusTeams.join(", ")}
              </span>
              <button
                onClick={() => update("focusTeams", [])}
                className="text-gray-600 hover:text-gray-400"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </Card>

        {/* Risk & Sizing */}
        <Card>
          <h2 className="text-sm font-medium text-white mb-4">
            Risk & Position Sizing
          </h2>

          {/* Risk Tolerance */}
          <div className="mb-5">
            <label className="block text-xs text-gray-400 mb-2">
              Risk Tolerance
            </label>
            <div className="flex gap-2">
              {(["conservative", "moderate", "aggressive"] as const).map(
                (level) => (
                  <button
                    key={level}
                    onClick={() => update("riskTolerance", level)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border capitalize transition-colors ${
                      strategy.riskTolerance === level
                        ? level === "conservative"
                          ? "bg-blue-600/20 border-blue-600 text-blue-400"
                          : level === "moderate"
                            ? "bg-yellow-600/20 border-yellow-600 text-yellow-400"
                            : "bg-red-600/20 border-red-600 text-red-400"
                        : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {level}
                  </button>
                ),
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
              onChange={(v) => update("maxDailyTrades", v)}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Market Types */}
        <Card>
          <h2 className="text-sm font-medium text-white mb-3">Market Types</h2>
          <div className="flex flex-wrap gap-3">
            {MARKET_TYPES.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={strategy.marketTypes.includes(value)}
                  onChange={() => toggleMarketType(value)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Advanced */}
        <Card>
          <h2 className="text-sm font-medium text-white mb-4">Advanced</h2>
          <div className="grid grid-cols-2 gap-4">
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
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

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
