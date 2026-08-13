import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitHubClient, FeatureUnavailableError, NoContentError } from '../github/client.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('GitHubClient', () => {
  it('sends required GitHub headers', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer secret');
      expect(headers.get('Accept')).toBe('application/vnd.github+json');
      expect(headers.get('X-GitHub-Api-Version')).toBe('2026-03-10');
      expect(headers.get('User-Agent')).toBe('ghcp-metrics-dashboard/0.1.0');
      return new Response('{"ok":true}', { status: 200 });
    });
    globalThis.fetch = fetchMock as typeof fetch;
    await new GitHubClient({ token: 'secret', baseUrl: 'https://example.test' }).request('/user');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not send auth to signed URLs', async () => {
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).has('Authorization')).toBe(false);
      return new Response('x', { status: 200 });
    }) as typeof fetch;
    await new GitHubClient({ token: 'secret' }).request('https://signed.example/file', {}, { auth: false });
  });

  it('maps 204 and allowed 404 to sentinel errors', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch;
    await expect(new GitHubClient({ token: 'secret', maxRetries: 1 }).request('/empty')).rejects.toBeInstanceOf(NoContentError);

    globalThis.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as typeof fetch;
    await expect(new GitHubClient({ token: 'secret', maxRetries: 1 }).request('/missing', {}, { allow404: true })).rejects.toBeInstanceOf(FeatureUnavailableError);
  });
});
