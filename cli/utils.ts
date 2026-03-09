/**
 * Musashi CLI - Utility Functions
 *
 * Formatting, colors, and helper functions
 */

import type { LogLevel } from './app-state';

// ─── Time Formatting ──────────────────────────────────────────────────────────

export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

export function getUrgencyColor(urgency: string): string {
  switch (urgency.toLowerCase()) {
    case 'critical': return 'red-fg';
    case 'high': return 'yellow-fg';
    case 'medium': return 'cyan-fg';
    default: return 'white-fg';
  }
}

export function getLogColor(level: LogLevel): string {
  switch (level) {
    case 'error': return 'red-fg';
    case 'warn': return 'yellow-fg';
    case 'success': return 'green-fg';
    default: return 'white-fg';
  }
}

export function getLogIcon(level: LogLevel): string {
  switch (level) {
    case 'error': return '✗';
    case 'warn': return '⚠';
    case 'success': return '✓';
    default: return 'ℹ';
  }
}

export function getPriceChangeColor(change: number): string {
  if (change > 0) return 'green-fg';
  if (change < 0) return 'red-fg';
  return 'white-fg';
}

// ─── Number Formatting ────────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  return (price * 100).toFixed(1) + '%';
}

export function formatPriceChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return sign + (change * 100).toFixed(1) + '%';
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${Math.round(volume / 1_000)}K`;
  return `$${Math.round(volume)}`;
}

export function formatSpread(spread: number): string {
  return (spread * 100).toFixed(1) + '%';
}

export function formatProfit(profit: number): string {
  return `$${profit.toFixed(0)}`;
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toFixed(decimals);
}

// ─── Text Helpers ─────────────────────────────────────────────────────────────

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

export function padRight(text: string, width: number): string {
  return text.padEnd(width, ' ');
}

export function padLeft(text: string, width: number): string {
  return text.padStart(width, ' ');
}

export function center(text: string, width: number): string {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

// ─── Platform Helpers ─────────────────────────────────────────────────────────

export function getPlatformName(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'polymarket': return 'Poly';
    case 'kalshi': return 'Kalshi';
    default: return platform;
  }
}

export function getPlatformColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'polymarket': return 'magenta-fg';
    case 'kalshi': return 'blue-fg';
    default: return 'white-fg';
  }
}

// ─── Arrow Symbols ────────────────────────────────────────────────────────────

export function getArrow(direction: 'up' | 'down'): string {
  return direction === 'up' ? '↑' : '↓';
}
