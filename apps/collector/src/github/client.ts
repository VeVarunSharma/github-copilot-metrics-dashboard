import type { Logger } from '../logger.js';

export interface GitHubClientOptions {
  token: string;
  baseUrl?: string;
  userAgent?: string;
  maxRetries?: number;
  timeoutMs?: number;
  logger?: Logger;
}

export class NoContentError extends Error {
  constructor() {
    super('GitHub returned 204 No Content');
    this.name = 'NoContentError';
  }
}

export class FeatureUnavailableError extends Error {
  constructor(message = 'GitHub feature is unavailable for this org') {
    super(message);
    this.name = 'FeatureUnavailableError';
  }
}

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = 'ghcp-metrics-dashboard/0.1.0';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headerNumber(headers: Headers, name: string): number | undefined {
  const value = headers.get(name);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class GitHubClient {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly userAgent: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly logger?: Logger;

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.logger = options.logger;
  }

  async request(pathOrUrl: string, init: RequestInit = {}, options: { auth?: boolean; allow404?: boolean } = {}): Promise<Response> {
    const auth = options.auth ?? true;
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers = new Headers(init.headers);
        headers.set('Accept', 'application/vnd.github+json');
        headers.set('X-GitHub-Api-Version', '2026-03-10');
        headers.set('User-Agent', this.userAgent);
        if (auth) headers.set('Authorization', `Bearer ${this.token}`);

        const started = Date.now();
        const response = await fetch(url, { ...init, headers, signal: controller.signal });
        this.logger?.info({ url, status: response.status, durationMs: Date.now() - started, attempt }, 'github request');

        await this.honorRateLimit(response.headers);

        if (response.status === 204) throw new NoContentError();
        if (response.status === 404 && options.allow404) throw new FeatureUnavailableError();
        if (response.status === 429) {
          await this.sleepForRetryAfter(response.headers, attempt);
          continue;
        }
        if (response.status >= 500) {
          await sleep(this.backoffMs(attempt));
          continue;
        }
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`GitHub request failed: ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`);
        }
        return response;
      } catch (error) {
        if (error instanceof NoContentError || error instanceof FeatureUnavailableError) throw error;
        lastError = error;
        if (attempt >= this.maxRetries) break;
        await sleep(this.backoffMs(attempt));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(`GitHub request failed after ${this.maxRetries} attempts`, { cause: lastError });
  }

  private async honorRateLimit(headers: Headers): Promise<void> {
    const remaining = headerNumber(headers, 'X-RateLimit-Remaining');
    const reset = headerNumber(headers, 'X-RateLimit-Reset');
    if (remaining !== undefined && reset !== undefined && remaining <= 50) {
      const waitMs = Math.max(reset * 1000 - Date.now(), 0) + 1000;
      this.logger?.warn({ remaining, reset, waitMs }, 'rate limit nearly exhausted; sleeping until reset');
      await sleep(waitMs);
    }
  }

  private async sleepForRetryAfter(headers: Headers, attempt: number): Promise<void> {
    const retryAfter = headerNumber(headers, 'Retry-After');
    await sleep(retryAfter !== undefined ? retryAfter * 1000 : this.backoffMs(attempt));
  }

  private backoffMs(attempt: number): number {
    return 1000 * 2 ** Math.max(attempt - 1, 0);
  }
}
