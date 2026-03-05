"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  History,
  Menu,
  X,
  Activity,
  Zap,
  Clock,
} from "lucide-react";
import { useAgentStatus } from "@/components/agent-status-context";
import { timeAgo } from "@/components/ui";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & controls" },
  { href: "/strategy", label: "Strategy", icon: Settings, desc: "Configure trading" },
  { href: "/history", label: "History", icon: History, desc: "Trades & cycles" },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status } = useAgentStatus();
  const agentRunning = status?.running ?? false;
  const cycleCount = status?.cycleCount ?? 0;
  const lastCycle = status?.lastCycleAt
    ?? (status?.recentCycles?.length ? status.recentCycles[0].createdAt : null);

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[#040810]/95 backdrop-blur-md border-b border-white/[0.06] px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Activity size={15} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block leading-none">
              NBA Agent
            </span>
            <span className="text-[10px] text-gray-500 leading-none">Polymarket</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
            agentRunning
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-white/[0.04] text-gray-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${agentRunning ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
            {agentRunning ? "Live" : "Off"}
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Sidebar background with subtle gradient */}
        <div className="absolute inset-0 bg-[#040810]" />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] via-transparent to-blue-500/[0.02]" />
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/20 via-[#1e293b]/40 to-blue-500/20" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-5 h-[72px] border-b border-white/[0.04]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">
              NBA Agent
            </span>
            <span className="text-[11px] text-gray-500">Polymarket Trading</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="relative flex-1 px-3 py-6 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            Navigation
          </p>
          {links.map(({ href, label, icon: Icon, desc }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-white/[0.07] text-white font-medium"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-emerald shadow-sm shadow-emerald-500/30" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  active
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-white/[0.03] text-gray-500 group-hover:bg-white/[0.06] group-hover:text-gray-300"
                }`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block leading-tight">{label}</span>
                  <span className={`text-[10px] leading-tight ${active ? "text-gray-400" : "text-gray-600"}`}>
                    {desc}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Agent status section */}
        <div className="relative px-3 pb-3 space-y-2">
          {/* Quick stats */}
          <div className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Agent</span>
              <Zap size={10} className={agentRunning ? "text-emerald-400" : "text-gray-600"} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ring-[3px] ${
                  agentRunning
                    ? "bg-emerald-400 ring-emerald-400/20 animate-pulse"
                    : "bg-gray-600 ring-gray-600/10"
                }`}
              />
              <span className={`text-xs font-semibold ${agentRunning ? "text-emerald-400" : "text-gray-500"}`}>
                {agentRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.02] rounded-lg px-2 py-1.5">
                <p className="text-[10px] text-gray-600">Cycles</p>
                <p className="text-xs font-bold font-mono text-gray-300">{cycleCount}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg px-2 py-1.5">
                <p className="text-[10px] text-gray-600">Last run</p>
                <p className="text-xs font-bold font-mono text-gray-300 truncate">
                  {lastCycle ? timeAgo(lastCycle) : "--"}
                </p>
              </div>
            </div>
          </div>

          {/* Version tag */}
          <div className="text-center py-1">
            <span className="text-[10px] text-gray-700">v1.0 &middot; Polymarket</span>
          </div>
        </div>
      </aside>
    </>
  );
}
