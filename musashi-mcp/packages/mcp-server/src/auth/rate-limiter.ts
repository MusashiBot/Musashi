import { RateLimitError } from '../types/errors.js';

/**
 * Rate limit tier configuration
 */
export interface RateLimitTier {
  name: 'free' | 'pro';
  requestsPerHour: number;
  requestsPerMinute: number;
  burstSize: number; // Max requests in a short burst
}

/**
 * Rate limit tiers
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'free',
    requestsPerHour: 100,
    requestsPerMinute: 10,
    burstSize: 5,
  },
  pro: {
    name: 'pro',
    requestsPerHour: 1000,
    requestsPerMinute: 50,
    burstSize: 20,
  },
};

/**
 * Request tracking for a connection
 */
interface RequestWindow {
  hourlyRequests: number[];
  minuteRequests: number[];
  burstRequests: number[];
  lastReset: number;
}

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private connections: Map<string, RequestWindow> = new Map();
  private readonly windowSizeHour = 60 * 60 * 1000; // 1 hour
  private readonly windowSizeMinute = 60 * 1000; // 1 minute
  private readonly windowSizeBurst = 10 * 1000; // 10 seconds

  constructor() {
    // Clean up old connection data every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Check if request is allowed for connection
   * Throws RateLimitError if limit exceeded
   */
  checkLimit(connectionId: string, tier: RateLimitTier): void {
    const now = Date.now();
    const window = this.getOrCreateWindow(connectionId);

    // Clean old requests from windows
    this.cleanWindow(window, now);

    // Check hourly limit
    if (window.hourlyRequests.length >= tier.requestsPerHour) {
      const oldestRequest = window.hourlyRequests[0];
      const retryAfter = Math.ceil((oldestRequest! + this.windowSizeHour - now) / 1000);
      throw new RateLimitError(
        `Hourly rate limit exceeded (${tier.requestsPerHour} requests/hour)`,
        retryAfter
      );
    }

    // Check per-minute limit
    if (window.minuteRequests.length >= tier.requestsPerMinute) {
      const oldestRequest = window.minuteRequests[0];
      const retryAfter = Math.ceil((oldestRequest! + this.windowSizeMinute - now) / 1000);
      throw new RateLimitError(
        `Per-minute rate limit exceeded (${tier.requestsPerMinute} requests/minute)`,
        retryAfter
      );
    }

    // Check burst limit
    if (window.burstRequests.length >= tier.burstSize) {
      const oldestRequest = window.burstRequests[0];
      const retryAfter = Math.ceil((oldestRequest! + this.windowSizeBurst - now) / 1000);
      throw new RateLimitError(
        `Burst limit exceeded (${tier.burstSize} requests per 10 seconds)`,
        retryAfter
      );
    }

    // Record this request
    window.hourlyRequests.push(now);
    window.minuteRequests.push(now);
    window.burstRequests.push(now);
  }

  /**
   * Get current usage for a connection
   */
  getUsage(connectionId: string, tier: RateLimitTier) {
    const window = this.connections.get(connectionId);
    if (!window) {
      return {
        hourly: { used: 0, limit: tier.requestsPerHour, remaining: tier.requestsPerHour },
        minute: { used: 0, limit: tier.requestsPerMinute, remaining: tier.requestsPerMinute },
        burst: { used: 0, limit: tier.burstSize, remaining: tier.burstSize },
      };
    }

    const now = Date.now();
    this.cleanWindow(window, now);

    return {
      hourly: {
        used: window.hourlyRequests.length,
        limit: tier.requestsPerHour,
        remaining: tier.requestsPerHour - window.hourlyRequests.length,
      },
      minute: {
        used: window.minuteRequests.length,
        limit: tier.requestsPerMinute,
        remaining: tier.requestsPerMinute - window.minuteRequests.length,
      },
      burst: {
        used: window.burstRequests.length,
        limit: tier.burstSize,
        remaining: tier.burstSize - window.burstRequests.length,
      },
    };
  }

  /**
   * Reset limits for a connection (e.g., after tier upgrade)
   */
  reset(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * Get or create request window for connection
   */
  private getOrCreateWindow(connectionId: string): RequestWindow {
    let window = this.connections.get(connectionId);
    if (!window) {
      window = {
        hourlyRequests: [],
        minuteRequests: [],
        burstRequests: [],
        lastReset: Date.now(),
      };
      this.connections.set(connectionId, window);
    }
    return window;
  }

  /**
   * Remove expired requests from window
   */
  private cleanWindow(window: RequestWindow, now: number): void {
    // Remove hourly requests older than 1 hour
    window.hourlyRequests = window.hourlyRequests.filter(
      (timestamp) => now - timestamp < this.windowSizeHour
    );

    // Remove minute requests older than 1 minute
    window.minuteRequests = window.minuteRequests.filter(
      (timestamp) => now - timestamp < this.windowSizeMinute
    );

    // Remove burst requests older than 10 seconds
    window.burstRequests = window.burstRequests.filter(
      (timestamp) => now - timestamp < this.windowSizeBurst
    );
  }

  /**
   * Clean up old connection data
   */
  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [connectionId, window] of this.connections.entries()) {
      // If no requests in last 24 hours, remove connection
      if (now - window.lastReset > staleThreshold) {
        this.connections.delete(connectionId);
      }
    }
  }

  /**
   * Get global statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(
        (w) => w.hourlyRequests.length > 0
      ).length,
    };
  }
}
