import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";
import { AgentStatusProvider } from "@/components/agent-status-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBA Trading Agent",
  description: "Autonomous NBA prediction market trading agent for Polymarket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#030712] text-gray-100`}
      >
        {/* Ambient gradient overlays */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[400px] bg-emerald-500/[0.025] rounded-full blur-[100px]" />
          <div className="absolute -top-20 right-1/4 w-[500px] h-[350px] bg-blue-500/[0.025] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-purple-500/[0.015] rounded-full blur-[120px]" />
        </div>
        <AgentStatusProvider>
          <Nav />
          <main className="relative z-10 md:ml-64 pt-14 md:pt-0 min-h-screen">
            {children}
          </main>
        </AgentStatusProvider>
      </body>
    </html>
  );
}
