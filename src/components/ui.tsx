import React from "react";
import { LucideIcon } from "lucide-react";

/* ─── Card ─── */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-[#0a0f1a] border border-[#1e293b] rounded-2xl p-5 card-glow transition-shadow hover:card-glow-hover ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── StatCard ─── */
const gradientMap: Record<string, { bar: string; tint: string }> = {
  emerald: { bar: "bg-gradient-emerald", tint: "bg-emerald-500/[0.04]" },
  blue:    { bar: "bg-gradient-blue",    tint: "bg-blue-500/[0.04]" },
  purple:  { bar: "bg-gradient-purple",  tint: "bg-purple-500/[0.04]" },
  red:     { bar: "bg-gradient-red",     tint: "bg-red-500/[0.04]" },
  amber:   { bar: "bg-gradient-amber",   tint: "bg-amber-500/[0.04]" },
};

export function StatCard({
  label,
  value,
  icon,
  accent,
  sub,
  gradient = "blue",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub: string;
  gradient?: string;
}) {
  const g = gradientMap[gradient] ?? gradientMap.blue;
  return (
    <div
      className={`relative overflow-hidden bg-[#0a0f1a] border border-[#1e293b] rounded-2xl p-5 card-glow transition-shadow hover:card-glow-hover ${g.tint}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${g.bar}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span className={accent}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold font-mono ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
  );
}

/* ─── StatusBadge ─── */
const badgeStyles: Record<string, { bg: string; text: string; dot: string }> = {
  filled:    { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  pending:   { bg: "bg-yellow-500/10",  text: "text-yellow-400",  dot: "bg-yellow-400" },
  running:   { bg: "bg-blue-500/10",    text: "text-blue-400",    dot: "bg-blue-400" },
  failed:    { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400" },
  error:     { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400" },
  cancelled: { bg: "bg-gray-500/10",    text: "text-gray-400",    dot: "bg-gray-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = badgeStyles[status] ?? badgeStyles.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

/* ─── Skeleton ─── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-[#0a0f1a] border border-[#1e293b] rounded-2xl p-5 ${className}`}>
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-40 flex-1" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

/* ─── EmptyState ─── */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-600" />
      </div>
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-xs text-gray-600 max-w-xs">{description}</p>
    </div>
  );
}

/* ─── PageHeader ─── */
export function PageHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-gradient-blue flex items-center justify-center">
            <Icon size={18} className="text-white" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}

/* ─── SectionHeader ─── */
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
      {children}
    </h2>
  );
}

/* ─── NumberInput ─── */
export function NumberInput({
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
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(isNaN(parsed) ? min : Math.min(Math.max(parsed, min), max));
        }}
        min={min}
        max={max}
        step={step}
        className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
      />
    </div>
  );
}

/* ─── InputField ─── */
export function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
            {icon}
          </div>
        )}
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono transition-all ${icon ? "pl-10 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}

/* ─── timeAgo ─── */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
