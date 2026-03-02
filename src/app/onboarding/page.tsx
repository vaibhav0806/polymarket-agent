"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Key,
  Settings,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

const NBA_TEAMS = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
];

const MARKET_TYPES = [
  { value: "moneyline", label: "Moneyline" },
  { value: "spreads", label: "Spreads" },
  { value: "totals", label: "Totals" },
  { value: "player_prop", label: "Player Props" },
  { value: "futures", label: "Futures" },
];

interface StepValidation {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  steps: { label: string; status: "idle" | "loading" | "success" | "error" }[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1: Quick setup
  const [orchestratorKey, setOrchestratorKey] = useState("");
  const [showManual, setShowManual] = useState(false);

  // Step 2: Manual keys
  const [openaiKey, setOpenaiKey] = useState("");
  const [polymarketKey, setPolymarketKey] = useState("");
  const [twitterToken, setTwitterToken] = useState("");
  const [ballDontLieKey, setBallDontLieKey] = useState("");

  // Step 3: Strategy
  const [focusTeams, setFocusTeams] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [maxPositionSize, setMaxPositionSize] = useState(10);
  const [maxTotalExposure, setMaxTotalExposure] = useState(100);
  const [customRules, setCustomRules] = useState("");
  const [marketTypes, setMarketTypes] = useState<string[]>([
    "moneyline",
    "spreads",
    "totals",
    "player_prop",
    "futures",
  ]);

  // Step 4: Validation
  const [validation, setValidation] = useState<StepValidation>({
    status: "idle",
    message: "",
    steps: [
      { label: "Validating API keys", status: "idle" },
      { label: "Checking wallet balance", status: "idle" },
      { label: "Setting token approvals", status: "idle" },
      { label: "Saving configuration", status: "idle" },
      { label: "Testing market access", status: "idle" },
    ],
  });

  const steps = ["API Keys", "Manual Setup", "Strategy", "Validate"];

  const hasQuickSetup = orchestratorKey.trim().length > 0;
  const hasManualSetup =
    openaiKey.trim().length > 0 && polymarketKey.trim().length > 0;
  const canProceedFromStep0 = hasQuickSetup || hasManualSetup || showManual;
  const canProceedFromStep1 = hasQuickSetup || hasManualSetup;

  const nextStep = () => {
    if (step === 0 && hasQuickSetup && !showManual) {
      // Skip manual step if orchestrator key is provided
      setStep(2);
    } else if (step === 0 && !showManual) {
      setShowManual(true);
      setStep(1);
    } else {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    if (step === 2 && hasQuickSetup && !showManual) {
      setStep(0);
    } else {
      setStep((s) => Math.max(s - 1, 0));
    }
  };

  const toggleTeam = (team: string) => {
    setFocusTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team],
    );
  };

  const toggleMarketType = (type: string) => {
    setMarketTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const runValidation = async () => {
    const newSteps = validation.steps.map((s) => ({ ...s, status: "idle" as const }));
    setValidation({ status: "loading", message: "Setting up...", steps: newSteps });

    for (let i = 0; i < newSteps.length; i++) {
      setValidation((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === i ? { ...s, status: "loading" } : s,
        ),
      }));

      try {
        if (i === 0) {
          const res = await fetch("/api/onboarding/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orchestratorKey: hasQuickSetup ? orchestratorKey : undefined,
              openaiKey: hasManualSetup ? openaiKey : undefined,
              polymarketKey: hasManualSetup ? polymarketKey : undefined,
              twitterToken: twitterToken || undefined,
              ballDontLieKey: ballDontLieKey || undefined,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Validation failed");
          }
        } else if (i === newSteps.length - 1) {
          // Final step: configure
          const res = await fetch("/api/onboarding/configure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orchestratorKey: hasQuickSetup ? orchestratorKey : undefined,
              openaiKey: hasManualSetup ? openaiKey : undefined,
              polymarketKey: hasManualSetup ? polymarketKey : undefined,
              twitterToken: twitterToken || undefined,
              ballDontLieKey: ballDontLieKey || undefined,
              strategy: {
                focusTeams,
                riskTolerance,
                maxPositionSize,
                maxTotalExposure,
                customRules,
                marketTypes,
              },
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Configuration failed");
          }
        } else {
          // Simulated steps for intermediate validation
          await new Promise((r) => setTimeout(r, 800));
        }

        setValidation((prev) => ({
          ...prev,
          steps: prev.steps.map((s, idx) =>
            idx === i ? { ...s, status: "success" } : s,
          ),
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setValidation((prev) => ({
          ...prev,
          status: "error",
          message: msg,
          steps: prev.steps.map((s, idx) =>
            idx === i ? { ...s, status: "error" } : s,
          ),
        }));
        return;
      }
    }

    setValidation((prev) => ({
      ...prev,
      status: "success",
      message: "Setup complete!",
    }));

    setTimeout(() => router.push("/"), 1500);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-8">Setup Wizard</h1>

      {/* Stepper */}
      <div className="flex items-center mb-10">
        {steps.map((label, i) => {
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                    isDone
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : isActive
                        ? "border-blue-500 text-blue-400 bg-blue-500/10"
                        : "border-gray-700 text-gray-600 bg-gray-900"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span
                  className={`text-xs hidden sm:block ${isActive ? "text-white" : "text-gray-500"}`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 ${isDone ? "bg-emerald-600" : "bg-gray-800"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 0: Quick Setup */}
      {step === 0 && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} className="text-blue-400" />
              <h2 className="text-sm font-medium text-white">Quick Setup</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Paste your orchestrator key (base64url encoded JSON) to
              automatically configure all API keys.
            </p>
            <textarea
              value={orchestratorKey}
              onChange={(e) => setOrchestratorKey(e.target.value)}
              placeholder="Paste orchestrator key here..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono resize-none h-24"
            />
          </Card>

          <div className="text-center">
            <button
              onClick={() => setShowManual(!showManual)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showManual ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              {showManual ? "Hide" : "Expand"} Manual Setup
            </button>
          </div>

          {showManual && (
            <Card>
              <h2 className="text-sm font-medium text-white mb-4">
                Manual API Keys
              </h2>
              <div className="space-y-4">
                <InputField
                  label="OpenAI API Key"
                  value={openaiKey}
                  onChange={setOpenaiKey}
                  placeholder="sk-..."
                  required
                />
                <InputField
                  label="Polymarket Private Key"
                  value={polymarketKey}
                  onChange={setPolymarketKey}
                  placeholder="0x..."
                  required
                />
                <InputField
                  label="Twitter Bearer Token"
                  value={twitterToken}
                  onChange={setTwitterToken}
                  placeholder="Optional"
                />
                <InputField
                  label="BallDontLie API Key"
                  value={ballDontLieKey}
                  onChange={setBallDontLieKey}
                  placeholder="Optional"
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Step 1: Manual Setup (expanded) */}
      {step === 1 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-blue-400" />
            <h2 className="text-sm font-medium text-white">
              Manual API Keys
            </h2>
          </div>
          <div className="space-y-4">
            <InputField
              label="OpenAI API Key"
              value={openaiKey}
              onChange={setOpenaiKey}
              placeholder="sk-..."
              required
            />
            <InputField
              label="Polymarket Private Key"
              value={polymarketKey}
              onChange={setPolymarketKey}
              placeholder="0x..."
              required
            />
            <InputField
              label="Twitter Bearer Token"
              value={twitterToken}
              onChange={setTwitterToken}
              placeholder="Optional"
            />
            <InputField
              label="BallDontLie API Key"
              value={ballDontLieKey}
              onChange={setBallDontLieKey}
              placeholder="Optional"
            />
          </div>
        </Card>
      )}

      {/* Step 2: Strategy */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Settings size={16} className="text-purple-400" />
              <h2 className="text-sm font-medium text-white">
                Strategy Customization
              </h2>
            </div>

            {/* Focus Teams */}
            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-2">
                Focus Teams (leave empty for all)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {NBA_TEAMS.map((team) => (
                  <button
                    key={team}
                    onClick={() => toggleTeam(team)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      focusTeams.includes(team)
                        ? "bg-blue-600/20 border-blue-600 text-blue-400"
                        : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
              {focusTeams.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-gray-500">
                    Selected: {focusTeams.join(", ")}
                  </span>
                  <button
                    onClick={() => setFocusTeams([])}
                    className="text-gray-600 hover:text-gray-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Risk Tolerance */}
            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-2">
                Risk Tolerance
              </label>
              <div className="flex gap-2">
                {(["conservative", "moderate", "aggressive"] as const).map(
                  (level) => (
                    <button
                      key={level}
                      onClick={() => setRiskTolerance(level)}
                      className={`flex-1 px-3 py-2 text-xs rounded-lg border capitalize transition-colors ${
                        riskTolerance === level
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

            {/* Sliders */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Max Position Size ($)
                </label>
                <input
                  type="number"
                  value={maxPositionSize}
                  onChange={(e) =>
                    setMaxPositionSize(parseFloat(e.target.value) || 0)
                  }
                  min={1}
                  max={1000}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Max Total Exposure ($)
                </label>
                <input
                  type="number"
                  value={maxTotalExposure}
                  onChange={(e) =>
                    setMaxTotalExposure(parseFloat(e.target.value) || 0)
                  }
                  min={1}
                  max={10000}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Market Types */}
            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-2">
                Market Types
              </label>
              <div className="flex flex-wrap gap-2">
                {MARKET_TYPES.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={marketTypes.includes(value)}
                      onChange={() => toggleMarketType(value)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Rules */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Custom Rules (plain English)
              </label>
              <textarea
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                placeholder="e.g., Only trade when a star player is injured. Avoid games with less than 2 hours until tip-off."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-600 mt-1">
                The AI agent will follow these rules when making trading
                decisions.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Validate */}
      {step === 3 && (
        <Card>
          <h2 className="text-sm font-medium text-white mb-6">
            Setup Validation
          </h2>

          <div className="space-y-3 mb-6">
            {validation.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {s.status === "idle" && (
                  <div className="w-5 h-5 rounded-full border border-gray-700" />
                )}
                {s.status === "loading" && (
                  <Loader2 size={20} className="text-blue-400 animate-spin" />
                )}
                {s.status === "success" && (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                )}
                {s.status === "error" && (
                  <AlertCircle size={20} className="text-red-400" />
                )}
                <span
                  className={`text-sm ${
                    s.status === "success"
                      ? "text-gray-300"
                      : s.status === "error"
                        ? "text-red-400"
                        : s.status === "loading"
                          ? "text-white"
                          : "text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {validation.status === "error" && (
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-400">{validation.message}</p>
            </div>
          )}

          {validation.status === "success" && (
            <div className="bg-emerald-900/20 border border-emerald-900/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-emerald-400">
                Setup complete! Redirecting to dashboard...
              </p>
            </div>
          )}

          {validation.status === "idle" && (
            <button
              onClick={runValidation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Run Setup
            </button>
          )}

          {validation.status === "error" && (
            <button
              onClick={runValidation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        {step < 3 && (
          <button
            onClick={nextStep}
            disabled={
              (step === 0 && !canProceedFromStep0) ||
              (step === 1 && !canProceedFromStep1)
            }
            className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-30 transition-colors"
          >
            Next
            <ChevronRight size={14} />
          </button>
        )}
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

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
      />
    </div>
  );
}
