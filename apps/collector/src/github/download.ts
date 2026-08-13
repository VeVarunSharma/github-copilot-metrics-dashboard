import { DownloadLinksResponseSchema } from '@ghcp-dash/contracts';
import type { z } from 'zod';
import { GitHubClient } from './client.js';

export type DownloadLinksResponse = z.infer<typeof DownloadLinksResponseSchema>;

export function parseNdjson(text: string): unknown[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

export async function fetchDownloadLinks(client: GitHubClient, endpoint: string): Promise<DownloadLinksResponse> {
  const response = await client.request(endpoint);
  const json = await response.json() as unknown;
  const parsed = DownloadLinksResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Failed to parse GitHub download links response', { cause: parsed.error });
  }
  return parsed.data;
}

export async function downloadSignedNdjson(client: GitHubClient, links: string[]): Promise<string> {
  const bodies: string[] = [];
  for (const link of links) {
    const response = await client.request(link, {}, { auth: false });
    bodies.push(await response.text());
  }
  return bodies.join('\n');
}
