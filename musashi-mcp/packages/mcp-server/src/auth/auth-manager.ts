import { AuthError } from '../types/errors.js';
import { RateLimiter, RATE_LIMIT_TIERS, type RateLimitTier } from './rate-limiter.js';

/**
 * API key configuration
 */
export interface APIKey {
  key: string;
  tier: 'free' | 'pro';
  createdAt: string;
  description?: string;
}

/**
 * Auth context for a request
 */
export interface AuthContext {
  connectionId: string;
  tier: RateLimitTier;
  apiKey?: string;
}

/**
 * Authentication and authorization manager
 */
export class AuthManager {
  private rateLimiter: RateLimiter;
  private apiKeys: Map<string, APIKey> = new Map();

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.loadAPIKeys();
  }

  /**
   * Load API keys from environment or storage
   */
  private loadAPIKeys(): void {
    // For now, we support anonymous access with free tier
    // API keys can be added via environment variables:
    // MUSASHI_API_KEYS=key1:pro,key2:free
    const apiKeysEnv = process.env['MUSASHI_API_KEYS'];
    if (!apiKeysEnv) {
      return;
    }

    const keyPairs = apiKeysEnv.split(',');
    for (const pair of keyPairs) {
      const [key, tierStr] = pair.split(':');
      if (!key || !tierStr) continue;

      const tier = tierStr.trim() as 'free' | 'pro';
      if (tier !== 'free' && tier !== 'pro') {
        console.warn(`[AuthManager] Invalid tier for API key: ${tierStr}`);
        continue;
      }

      this.apiKeys.set(key.trim(), {
        key: key.trim(),
        tier,
        createdAt: new Date().toISOString(),
        description: 'Loaded from environment',
      });
    }

    console.log(`[AuthManager] Loaded ${this.apiKeys.size} API keys from environment`);
  }

  /**
   * Authenticate a connection
   * Returns auth context or throws AuthError
   */
  authenticate(connectionId: string, apiKey?: string): AuthContext {
    // If API key provided, validate it
    if (apiKey) {
      const keyConfig = this.apiKeys.get(apiKey);
      if (!keyConfig) {
        throw new AuthError('Invalid API key');
      }

      const tier = RATE_LIMIT_TIERS[keyConfig.tier];
      if (!tier) {
        throw new AuthError('Invalid tier configuration');
      }

      return {
        connectionId,
        tier,
        apiKey,
      };
    }

    // No API key = free tier (anonymous access)
    return {
      connectionId,
      tier: RATE_LIMIT_TIERS['free']!,
    };
  }

  /**
   * Check rate limit for authenticated context
   */
  checkRateLimit(context: AuthContext): void {
    this.rateLimiter.checkLimit(context.connectionId, context.tier);
  }

  /**
   * Get rate limit usage for context
   */
  getRateLimitUsage(context: AuthContext) {
    return this.rateLimiter.getUsage(context.connectionId, context.tier);
  }

  /**
   * Reset rate limits for a connection
   */
  resetRateLimit(connectionId: string): void {
    this.rateLimiter.reset(connectionId);
  }

  /**
   * Add new API key (for admin operations)
   */
  addAPIKey(key: string, tier: 'free' | 'pro', description?: string): void {
    this.apiKeys.set(key, {
      key,
      tier,
      createdAt: new Date().toISOString(),
      description,
    });
  }

  /**
   * Remove API key
   */
  removeAPIKey(key: string): boolean {
    return this.apiKeys.delete(key);
  }

  /**
   * List all API keys (admin)
   */
  listAPIKeys(): APIKey[] {
    return Array.from(this.apiKeys.values()).map((k) => ({
      ...k,
      key: k.key.slice(0, 8) + '...' + k.key.slice(-4), // Masked
    }));
  }

  /**
   * Get global auth statistics
   */
  getStats() {
    return {
      totalAPIKeys: this.apiKeys.size,
      rateLimiter: this.rateLimiter.getStats(),
    };
  }
}
