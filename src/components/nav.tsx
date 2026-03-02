"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Settings,
  History,
  Key,
  Menu,
  X,
  Activity,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategy", label: "Strategy", icon: Settings },
  { href: "/history", label: "History", icon: History },
  { href: "/onboarding", label: "Onboarding", icon: Key },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);

  useEffect(() => {
    const check = () => {
      fetch("/api/agent/status")
        .then((r) => r.json())
        .then((d) => setAgentRunning(!!d.running))
        .catch(() => setAgentRunning(false));
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-gray-950 border-b border-gray-800 px-4 h-14">
        <span className="text-sm font-semibold tracking-tight text-white">
          NBA Trading Agent
        </span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-56 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center gap-2 px-5 h-14 border-b border-gray-800">
          <Activity size={18} className="text-emerald-500" />
          <span className="text-sm font-semibold tracking-tight text-white">
            NBA Trading Agent
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-900"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                agentRunning ? "bg-emerald-500" : "bg-gray-600"
              }`}
            />
            Agent {agentRunning ? "Running" : "Stopped"}
          </div>
        </div>
      </aside>
    </>
  );
}
