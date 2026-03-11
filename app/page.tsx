'use client';

import { useState } from 'react';
import Image from "next/image";
import TerminalDemo from "./TerminalDemo";
import SmoothScrollLink from "./components/SmoothScrollLink";
import FAQ from "./components/FAQ";
import InstallCodeReveal from "./components/InstallCodeReveal";

export default function Home() {
  const [showInstallCode, setShowInstallCode] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex items-center justify-between w-full px-[80px] py-4 bg-[var(--bg-primary)] border-b border-[var(--border-primary)] gap-10">
        <div className="font-jetbrains text-[var(--text-primary)] text-[22px] font-bold tracking-[1px]">
          MUSASHI
        </div>
        <nav className="flex items-center gap-8">
          <a href="/ai" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">API</a>
          <a href="/pricing" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">PRICING</a>
          <a href="/privacy" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">PRIVACY</a>
        </nav>
        <button
          onClick={() => setShowInstallCode(!showInstallCode)}
          className="px-5 py-[10px] border border-[#FFFFFF40] bg-transparent hover:bg-[var(--overlay-light)] transition-colors"
        >
          <span className="font-jetbrains text-[var(--text-primary)] text-xs font-bold">Install</span>
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[860px] bg-[var(--bg-primary)] overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0F] via-[#0A0A0F] to-[#0F0F1A] opacity-80" />
        {/* Hero Content */}
        <div className="absolute left-[80px] top-[100px] w-[500px] flex flex-col gap-7 z-10">
          {/* Headline */}
          <h1 className="font-jetbrains text-[var(--text-primary)] text-[52px] font-normal leading-[1.15] tracking-[-2px]">
            Intelligence<br />for AI Agents
          </h1>

          {/* Subtitle */}
          <p className="font-jetbrains text-[var(--text-secondary)] text-[15px] font-normal leading-[1.7]">
            Automated feed collecting tweets from 71 accounts every 2 minutes. AI analyzes sentiment, matches to 1000+ markets, generates trading signals. Your bots poll the API and execute.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <a href="/ai" className="px-8 py-[14px] bg-[var(--text-primary)] hover:opacity-90 transition-opacity">
                <span className="font-jetbrains text-[var(--bg-primary)] text-xs font-bold">View API Docs</span>
              </a>
              <SmoothScrollLink targetId="see-the-difference" className="px-8 py-[14px] bg-[var(--overlay-light)] border border-[var(--border-lighter)] hover:bg-[var(--overlay-lighter)] transition-colors">
                <span className="font-jetbrains text-[var(--text-primary)] text-xs font-bold">See Demo</span>
              </SmoothScrollLink>
            </div>
            <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal">
              Free • No Rate Limits • REST API + Agent SDK
            </span>
          </div>
        </div>

        {/* Hero Figure - Musashi Image / Install Code */}
        <InstallCodeReveal showCode={showInstallCode} />
          <div className="relative w-full h-full bg-black">
            <Image
              src="/images/generated-1771830449125.png"
              alt="Miyamoto Musashi"
              fill
              className="object-cover object-right opacity-65"
              priority
              unoptimized
            />

            {/* Floating Market Data Cards - Creating the "Strategic Intelligence" feel */}

            {/* Top Left - Market Card */}
            <div className="absolute top-[120px] left-[60px] px-4 py-3 bg-[#0A0A0A]/90 border border-[#FFFFFF15] backdrop-blur-md">
              <div className="flex flex-col gap-1">
                <span className="font-jetbrains text-[#666] text-[9px] font-medium">POLYMARKET</span>
                <span className="font-jetbrains text-white text-[11px] font-semibold leading-tight">Trump wins 2024?</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="font-jetbrains text-[#00FF88] text-sm font-bold">YES</span>
                    <span className="font-jetbrains text-white text-sm font-bold">89%</span>
                  </div>
                  <span className="font-jetbrains text-[#00FF88] text-[10px]">+12%</span>
                </div>
              </div>
            </div>

            {/* Top Right - Probability Indicator */}
            <div className="absolute top-[80px] right-[140px] px-3 py-2 bg-[#0A0A0A]/90 border border-[#FF4444]/30 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 fill-[#FF4444]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
                <span className="font-jetbrains text-[#FF4444] text-lg font-bold">-23%</span>
              </div>
            </div>

            {/* Middle Left - Volume Metric */}
            <div className="absolute top-[320px] left-[40px] px-3 py-2 bg-[#0A0A0A]/90 border border-[#FFFFFF15] backdrop-blur-md">
              <div className="flex flex-col gap-1">
                <span className="font-jetbrains text-[#666] text-[9px]">24H VOL</span>
                <span className="font-jetbrains text-white text-sm font-bold">$2.4M</span>
              </div>
            </div>

            {/* Middle Right - Market Card */}
            <div className="absolute top-[280px] right-[80px] px-4 py-3 bg-[#0A0A0A]/90 border border-[#FFFFFF15] backdrop-blur-md max-w-[200px]">
              <div className="flex flex-col gap-1">
                <span className="font-jetbrains text-[#666] text-[9px] font-medium">KALSHI</span>
                <span className="font-jetbrains text-white text-[11px] font-semibold leading-tight">BTC above $100k?</span>
                <div className="flex items-center gap-2">
                  <span className="font-jetbrains text-[#00FF88] text-sm font-bold">67%</span>
                  <div className="flex-1 h-1 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full w-[67%] bg-[#00FF88]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Left - Quick Stat */}
            <div className="absolute bottom-[180px] left-[90px] px-3 py-2 bg-[#0A0A0A]/90 border border-[#FFFFFF15] backdrop-blur-md">
              <span className="font-jetbrains text-white text-xs font-bold">900+ MARKETS</span>
            </div>

            {/* Bottom Right - Market Trend */}
            <div className="absolute bottom-[140px] right-[120px] px-4 py-3 bg-[#0A0A0A]/90 border border-[#00FF88]/30 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 fill-[#00FF88]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                </svg>
                <span className="font-jetbrains text-[#00FF88] text-xs font-bold">TRENDING</span>
              </div>
            </div>

            {/* Far Right - Simple odds */}
            <div className="absolute top-[480px] right-[50px] px-3 py-2 bg-[#0A0A0A]/90 border border-[#FFFFFF15] backdrop-blur-md">
              <div className="flex flex-col items-end gap-1">
                <span className="font-jetbrains text-[#00FF88] text-xs">YES 34¢</span>
                <span className="font-jetbrains text-[#FF4444] text-xs">NO 66¢</span>
              </div>
            </div>

            {/* Connecting lines - subtle data network effect */}
            <svg className="absolute inset-0 w-full h-full opacity-20" style={{ mixBlendMode: 'screen' }}>
              <line x1="180" y1="150" x2="320" y2="280" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="140" y1="340" x2="280" y2="420" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="720" y1="110" x2="640" y2="310" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="4 4" />
            </svg>
          </div>
        </div>
      </section>

      {/* Agent-Focused Section */}
      <section className="flex flex-col items-center gap-12 w-full px-[120px] py-[100px] bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-bold tracking-[2px] uppercase">// FOR AGENTS</span>
          <h2 className="font-grotesk text-[var(--text-primary)] text-[42px] font-bold tracking-[-1px] text-center">
            Infrastructure for AI Agents
          </h2>
          <p className="font-jetbrains text-[var(--text-secondary)] text-[15px] font-normal leading-[1.7] text-center w-[700px]">
            Automated intelligence layer that feeds structured trading signals to AI agents. Your bots poll the API, get analyzed tweets with sentiment and market matches, and execute trades autonomously.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-[1200px]">
          {/* Feature 1 - Feed System (prioritized) */}
          <div className="flex flex-col gap-4 p-8 bg-[var(--bg-tertiary)] border-l-2 border-r border-b border-t border-[var(--border-primary)]">
            <svg className="w-7 h-7 fill-[var(--text-primary)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8l-5-5zM5 19V5h10v4h4v10H5z"/>
            </svg>
            <h3 className="font-grotesk text-[var(--text-primary)] text-lg font-semibold">
              Automated Feed
            </h3>
            <p className="font-jetbrains text-[var(--text-secondary)] text-[13px] font-normal leading-[1.7] w-full">
              Auto-collects and analyzes tweets from 71 monitored accounts across 8 categories. Updates every 2 minutes. Bots poll the feed endpoint.
            </p>
          </div>

          {/* Feature 2 - REST API */}
          <div className="flex flex-col gap-4 p-8 bg-[var(--bg-tertiary)] border-l-2 border-r border-b border-t border-[var(--border-primary)]">
            <svg className="w-7 h-7 fill-[var(--text-primary)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3"/>
            </svg>
            <h3 className="font-grotesk text-[var(--text-primary)] text-lg font-semibold">
              REST API
            </h3>
            <p className="font-jetbrains text-[var(--text-secondary)] text-[13px] font-normal leading-[1.7] w-full">
              Multiple endpoints: /api/feed, /api/analyze-text, /api/markets/arbitrage, /api/markets/movers. Free, no rate limits.
            </p>
          </div>

          {/* Feature 3 - Agent SDK */}
            <div className="flex flex-col gap-4 p-8 bg-[var(--bg-tertiary)] border-l-2 border-r border-b border-t border-[var(--border-primary)]">
              <svg className="w-7 h-7 fill-[var(--text-primary)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
              </svg>
              <h3 className="font-grotesk text-[var(--text-primary)] text-lg font-semibold">
                Agent SDK
              </h3>
              <p className="font-jetbrains text-[var(--text-secondary)] text-[13px] font-normal leading-[1.7] w-full">
                TypeScript/JavaScript SDK for building trading bots. Poll analyzed tweets, detect arbitrage, track movers.
              </p>
            </div>

          {/* Feature 4 - Trading Signals */}
          <div className="flex flex-col gap-4 p-8 bg-[var(--bg-tertiary)] border-l-2 border-r border-b border-t border-[var(--border-primary)]">
            <svg className="w-7 h-7 fill-[var(--text-primary)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
            <h3 className="font-grotesk text-[var(--text-primary)] text-lg font-semibold">
              Trading Signals
            </h3>
            <p className="font-jetbrains text-[var(--text-secondary)] text-[13px] font-normal leading-[1.7] w-full">
              AI generates trading signals with direction (YES/NO/HOLD), confidence scores, edge calculation, and urgency levels.
            </p>
          </div>

          {/* Feature 5 - Terminal CLI */}
            <div className="flex flex-col gap-4 p-8 bg-[var(--bg-tertiary)] border-l-2 border-r border-b border-t border-[var(--border-primary)]">
              <svg className="w-7 h-7 fill-[var(--text-primary)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 18V6h16v12H4zm2-8.5l4 4-4 4 1.5 1.5L13 13.5 7.5 8 6 9.5z"/>
              </svg>
              <h3 className="font-grotesk text-[var(--text-primary)] text-lg font-semibold">
                Terminal CLI
              </h3>
              <p className="font-jetbrains text-[var(--text-secondary)] text-[13px] font-normal leading-[1.7] w-full">
                Real-time dashboard with live feed, arbitrage opportunities, market movers, and stats. Bloomberg-style UI.
              </p>
            </div>

          {/* Feature 6 - Chrome Extension (monitoring only) */}
          <div className="flex flex-col gap-4 p-8 bg-[var(--bg-tertiary)] border-l-2 border-r border-b border-t border-[var(--border-primary)]">
            <svg className="w-7 h-7 fill-[var(--text-primary)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <h3 className="font-grotesk text-[var(--text-primary)] text-lg font-semibold">
              Chrome Extension
            </h3>
            <p className="font-jetbrains text-[var(--text-secondary)] text-[13px] font-normal leading-[1.7] w-full">
              Human monitoring dashboard. Shows what your bots see: analyzed tweets, signals, matched markets on Twitter/X.
            </p>
          </div>
        </div>
      </section>

      {/* Terminal Demo Section */}
      <div id="see-the-difference">
        <TerminalDemo />
      </div>

      {/* Platforms Section */}
      <section className="flex flex-col items-center gap-12 w-full px-[120px] py-[80px] bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
        <h2 className="font-grotesk text-[var(--text-primary)] text-[42px] font-bold tracking-[-1px] text-center">
          The Bridge Between Social & Markets
        </h2>
        <p className="font-jetbrains text-[var(--text-secondary)] text-[13px] font-normal leading-[1.7] text-center w-[600px]">
          Live data from the two largest prediction market platforms, matched against Twitter conversations. Structured for humans and agents alike.
        </p>

        <div className="flex items-center justify-center gap-10 w-full">
          <div className="flex-1 flex flex-col items-center gap-3 px-12 py-8 bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
            <span className="font-grotesk text-[var(--text-primary)] text-[22px] font-bold">Polymarket</span>
            <span className="font-jetbrains text-[var(--text-muted)] text-[13px] font-medium">500+ markets</span>
            <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal">Live CLOB API price updates every 60s</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-3 px-12 py-8 bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
            <span className="font-grotesk text-[var(--text-primary)] text-[22px] font-bold">Kalshi</span>
            <span className="font-jetbrains text-[var(--text-muted)] text-[13px] font-medium">400+ markets</span>
            <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal">CFTC-regulated exchange</span>
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="flex flex-col items-center gap-12 w-full px-[120px] py-[80px] bg-[var(--bg-primary)]">
        <h2 className="font-grotesk text-[var(--text-primary)] text-[42px] font-bold tracking-[-1px] text-center">
          Built for Trading Bots
        </h2>

        <div className="grid grid-cols-2 gap-8 w-full max-w-[1100px]">
          {/* Feed System */}
          <div className="flex flex-col gap-6 p-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 fill-[#00FF88]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8l-5-5zM5 19V5h10v4h4v10H5z"/>
              </svg>
              <h3 className="font-grotesk text-[var(--text-primary)] text-xl font-semibold">
                Automated Feed System
              </h3>
            </div>
            <p className="font-jetbrains text-[var(--text-secondary)] text-sm leading-[1.8]">
              Monitors 71 high-signal Twitter accounts across 8 categories (crypto, politics, economics, tech, sports, geopolitics, finance, breaking news). Automatically collects, analyzes, and matches tweets to markets every 2 minutes.
            </p>
            <div className="flex flex-col gap-2">
              <span className="font-jetbrains text-[var(--text-tertiary)] text-xs">Categories tracked:</span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-[var(--overlay-lighter)] border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">CRYPTO</span>
                <span className="px-2 py-1 bg-[var(--overlay-lighter)] border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">POLITICS</span>
                <span className="px-2 py-1 bg-[var(--overlay-lighter)] border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">ECONOMICS</span>
                <span className="px-2 py-1 bg-[var(--overlay-lighter)] border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">TECH</span>
                <span className="px-2 py-1 bg-[var(--overlay-lighter)] border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">SPORTS</span>
                <span className="px-2 py-1 bg-[var(--overlay-lighter)] border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">GEOPOLITICS</span>
                <span className="px-2 py-1 bg-[var(--overlay-lighter)] border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">FINANCE</span>
                <span className="px-2 py-1 bg-[var(--overlay-lighter)} border border-[var(--border-primary)] font-jetbrains text-[10px] text-[var(--text-secondary)]">BREAKING NEWS</span>
              </div>
            </div>
          </div>

          {/* Sentiment & Signals */}
          <div className="flex flex-col gap-6 p-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 fill-[#00FF88]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
              <h3 className="font-grotesk text-[var(--text-primary)] text-xl font-semibold">
                Trading Signals
              </h3>
            </div>
            <p className="font-jetbrains text-[var(--text-secondary)] text-sm leading-[1.8]">
              AI-powered sentiment analysis classifies each tweet as bullish, bearish, or neutral. Generates trading signals with direction (YES/NO/HOLD), confidence scores, edge calculation, and urgency levels (critical/high/medium/low).
            </p>
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-jetbrains text-[#00FF88] text-xs font-bold">BULLISH</span>
                <span className="font-jetbrains text-[var(--text-tertiary)] text-[10px]">Long signal</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-jetbrains text-[#FF4444] text-xs font-bold">BEARISH</span>
                <span className="font-jetbrains text-[var(--text-tertiary)] text-[10px]">Short signal</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-jetbrains text-[#9CA3AF] text-xs font-bold">NEUTRAL</span>
                <span className="font-jetbrains text-[var(--text-tertiary)] text-[10px]">Hold position</span>
              </div>
            </div>
          </div>

          {/* Arbitrage Detection */}
          <div className="flex flex-col gap-6 p-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 fill-[#00FF88]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
              <h3 className="font-grotesk text-[var(--text-primary)] text-xl font-semibold">
                Arbitrage Detection
              </h3>
            </div>
            <p className="font-jetbrains text-[var(--text-secondary)] text-sm leading-[1.8]">
              Cross-platform price discrepancy detection between Polymarket and Kalshi. Identifies opportunities where the same event has different odds on different platforms. Filter by minimum spread, confidence, and category.
            </p>
            <div className="flex items-center gap-2 p-3 bg-[var(--overlay-lighter)] border border-[var(--border-primary)]">
              <span className="font-jetbrains text-[var(--text-secondary)] text-xs">Example: Polymarket 63% → Kalshi 70% = </span>
              <span className="font-jetbrains text-[#00FF88] text-xs font-bold">7% spread</span>
            </div>
          </div>

          {/* Market Movers */}
          <div className="flex flex-col gap-6 p-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 fill-[#00FF88]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13h2v8H3v-8zm4-8h2v16H7V5zm4 4h2v12h-2V9zm4-4h2v16h-2V5zm4 7h2v9h-2v-9z"/>
              </svg>
              <h3 className="font-grotesk text-[var(--text-primary)] text-xl font-semibold">
                Market Movers
              </h3>
            </div>
            <p className="font-jetbrains text-[var(--text-secondary)] text-sm leading-[1.8]">
              Tracks markets with significant price changes using 7-day price history stored in Vercel KV. Detects movements >5% in 1h or 24h windows. Real-time CLOB API polling updates top 50 markets every 60 seconds.
            </p>
            <div className="flex items-center gap-4">
              <div className="px-3 py-2 bg-[var(--overlay-lighter)] border border-[var(--border-primary)]">
                <span className="font-jetbrains text-[var(--text-tertiary)] text-[10px]">1H CHANGE</span>
                <span className="font-jetbrains text-[#00FF88] text-sm font-bold ml-2">+12%</span>
              </div>
              <div className="px-3 py-2 bg-[var(--overlay-lighter)] border border-[var(--border-primary)]">
                <span className="font-jetbrains text-[var(--text-tertiary)] text-[10px]">24H CHANGE</span>
                <span className="font-jetbrains text-[#FF4444] text-sm font-bold ml-2">-8%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />

      {/* Final CTA Section */}
      <section className="flex w-full px-[120px] py-[120px] bg-[var(--bg-primary)] border border-[var(--border-primary)] min-h-[500px]">
        <div className="flex flex-col items-center justify-center gap-10 w-full mx-auto">
          <h2 className="font-grotesk text-[var(--text-primary)] text-[72px] font-bold tracking-[-2px] text-center leading-[1.1]">
            Built for AI agents
          </h2>

          <a href="/ai" className="px-12 py-5 bg-[var(--text-primary)] hover:opacity-90 transition-opacity mx-auto">
            <span className="font-jetbrains text-[var(--bg-primary)] text-sm font-bold">START BUILDING — FREE</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-6 w-full px-[120px] py-12 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)]">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-3">
            <span className="font-jetbrains text-[var(--text-primary)] text-base font-semibold tracking-[1px]">
              MUSASHI
            </span>
            <span className="font-jetbrains text-[var(--text-tertiary)] text-xs font-normal max-w-[400px] leading-relaxed">
              AI intelligence service for trading bots. Automated feed API with sentiment analysis and trading signals. Chrome extension for monitoring.
            </span>
          </div>

          <div className="flex gap-16">
            <div className="flex flex-col gap-3">
              <span className="font-jetbrains text-[var(--text-muted)] text-[10px] font-bold tracking-[1.5px] uppercase">
                Product
              </span>
              <nav className="flex flex-col gap-2">
                <a href="/ai" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">API Docs</a>
                <a href="/pricing" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">Pricing</a>
                <a href="/privacy" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">Privacy</a>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-jetbrains text-[var(--text-muted)] text-[10px] font-bold tracking-[1.5px] uppercase">
                Community
              </span>
              <nav className="flex flex-col gap-2">
                <a href="https://twitter.com/musashimarket" target="_blank" rel="noopener noreferrer" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">Twitter</a>
                <a href="https://github.com/VittorioC13/musashi-bot" target="_blank" rel="noopener noreferrer" className="font-jetbrains text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors">GitHub</a>
              </nav>
            </div>
          </div>
        </div>

        <div className="w-full h-[1px] bg-[var(--border-primary)]" />

        <div className="flex items-center justify-between w-full">
          <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal">
            © {new Date().getFullYear()} Musashi
          </span>
          <span className="font-jetbrains text-[var(--text-tertiary)] text-[11px] font-normal">
            Built for agents. Powered by prediction markets.
          </span>
        </div>
      </footer>
    </div>
  );
}
