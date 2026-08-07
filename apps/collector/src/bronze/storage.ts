import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function writeBronzeNdjson(baseDir: string, source: string, orgId: string, day: string | null, bytes: string): Promise<string> {
  const dir = resolve(baseDir, source, orgId);
  await mkdir(dir, { recursive: true });
  const path = resolve(dir, `${day ?? 'latest'}.ndjson`);
  await writeFile(path, bytes, 'utf8');
  return path;
}

export async function readBronzeNdjson(baseDir: string, source: string, orgId: string, day: string): Promise<string> {
  return readFile(resolve(baseDir, source, orgId, `${day}.ndjson`), 'utf8');
}
