"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface AgentStatusData {
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

interface AgentStatusContextType {
  status: AgentStatusData | null;
  refresh: () => Promise<void>;
}

const AgentStatusContext = createContext<AgentStatusContextType>({
  status: null,
  refresh: async () => {},
});

export function AgentStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AgentStatusData | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/status");
      const data = await res.json();
      if (!data.error) setStatus(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <AgentStatusContext.Provider value={{ status, refresh }}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatus() {
  return useContext(AgentStatusContext);
}
