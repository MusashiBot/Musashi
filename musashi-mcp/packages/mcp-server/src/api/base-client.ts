import fetch, { type RequestInit, type Response } from 'node-fetch';
import { APIClientError } from '../types/errors.js';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Base HTTP client with retry logic and error handling
 */
export class BaseAPIClient {
  protected baseURL: string;
  protected retryConfig: RetryConfig;
  protected defaultHeaders: Record<string, string>;

  constructor(
    baseURL: string,
    retryConfig: Partial<RetryConfig> = {},
    defaultHeaders: Record<string, string> = {}
  ) {
    this.baseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    this.retryConfig = {
      maxRetries: retryConfig.maxRetries ?? 3,
      initialDelayMs: retryConfig.initialDelayMs ?? 1000,
      maxDelayMs: retryConfig.maxDelayMs ?? 10000,
      backoffMultiplier: retryConfig.backoffMultiplier ?? 2,
    };
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Musashi-MCP-Server/1.0',
      ...defaultHeaders,
    };
  }

  /**
   * Make HTTP GET request with retry logic
   */
  protected async get<T>(
    endpoint: string,
    options: RequestInit = {},
    sourceName: 'polymarket' | 'kalshi' = 'polymarket'
  ): Promise<T> {
    return this.request<T>('GET', endpoint, options, sourceName);
  }

  /**
   * Make HTTP POST request with retry logic
   */
  protected async post<T>(
    endpoint: string,
    body?: unknown,
    options: RequestInit = {},
    sourceName: 'polymarket' | 'kalshi' = 'polymarket'
  ): Promise<T> {
    return this.request<T>(
      'POST',
      endpoint,
      {
        ...options,
        body: body ? JSON.stringify(body) : undefined,
      },
      sourceName
    );
  }

  /**
   * Core request method with exponential backoff retry
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: RequestInit,
    sourceName: 'polymarket' | 'kalshi'
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const requestOptions: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...(options.headers as Record<string, string>),
      },
      ...options,
    };

    let lastError: Error | undefined;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);

        // Handle non-2xx responses
        if (!response.ok) {
          const errorBody = await this.safeReadBody(response);
          throw new APIClientError(
            `HTTP ${response.status}: ${response.statusText} - ${errorBody}`,
            sourceName
          );
        }

        // Parse response
        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof APIClientError) {
          const statusMatch = error.message.match(/HTTP (\d+)/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1]!);
            if (status >= 400 && status < 500 && status !== 429) {
              throw error; // Don't retry client errors
            }
          }
        }

        // Last attempt failed
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        await this.sleep(Math.min(delay, this.retryConfig.maxDelayMs));
        delay *= this.retryConfig.backoffMultiplier;

        console.log(
          `[BaseAPIClient] Retry ${attempt + 1}/${this.retryConfig.maxRetries} for ${url}`
        );
      }
    }

    // All retries exhausted
    throw new APIClientError(
      `Request failed after ${this.retryConfig.maxRetries} retries: ${lastError?.message}`,
      sourceName,
      lastError
    );
  }

  /**
   * Safely read response body (handles JSON parse errors)
   */
  private async safeReadBody(response: Response): Promise<string> {
    try {
      const text = await response.text();
      return text || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build query string from parameters
   */
  protected buildQueryString(params: Record<string, any>): string {
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
      });

    return filtered.length > 0 ? '?' + filtered.join('&') : '';
  }
}
