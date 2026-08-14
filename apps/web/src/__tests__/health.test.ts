import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { healthHandler } from '@/server/handlers/health';
import { queryHealth } from '@/server/queries/health';

const { dbMock, pingDbMock, state } = vi.hoisted(() => {
  const state = {
    ingestionRows: [] as Array<{ completedAt: Date; targetDay: string | null }>,
    queryFailure: undefined as Error | undefined,
  };

  const dbMock = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => (
              state.queryFailure
                ? Promise.reject(state.queryFailure)
                : Promise.resolve(state.ingestionRows)
            )),
          })),
        })),
      })),
    })),
  };

  return { dbMock, pingDbMock: vi.fn(), state };
});

vi.mock('@ghcp-dash/db', async () => {
  const actual = await vi.importActual<typeof import('@ghcp-dash/db')>('@ghcp-dash/db');
  return { ...actual, db: dbMock, pingDb: pingDbMock };
});

const originalDatabaseUrl = process.env.DATABASE_URL;

describe('health query', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T14:12:32.044Z'));
    pingDbMock.mockReset();
    dbMock.select.mockClear();
    state.ingestionRows = [];
    state.queryFailure = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('reports live and ready with unknown freshness when the database has no ingestion rows', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    pingDbMock.mockResolvedValue(true);

    await expect(queryHealth()).resolves.toEqual({
      status: 'ok',
      schemaVersion: 1,
      liveness: 'ok',
      readiness: 'ok',
      checks: { db: 'ok' },
      lastSuccessfulIngestionCompletedAt: null,
      lastSuccessfulIngestionTargetDay: null,
      staleDataStatus: 'unknown',
      staleDataWarning: 'No successful ingestion runs have been recorded yet.',
      staleAfterHours: 26,
    });
  });

  it('reports fresh ingestion when the latest successful run is recent', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    pingDbMock.mockResolvedValue(true);
    state.ingestionRows = [{
      completedAt: new Date('2026-07-02T12:00:00.000Z'),
      targetDay: '2026-07-01',
    }];

    await expect(queryHealth()).resolves.toMatchObject({
      status: 'ok',
      readiness: 'ok',
      checks: { db: 'ok' },
      lastSuccessfulIngestionCompletedAt: '2026-07-02T12:00:00.000Z',
      lastSuccessfulIngestionTargetDay: '2026-07-01',
      staleDataStatus: 'fresh',
      staleDataWarning: null,
      staleAfterHours: 26,
    });
  });

  it('reports stale ingestion without failing readiness when the latest successful run is old', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    pingDbMock.mockResolvedValue(true);
    state.ingestionRows = [{
      completedAt: new Date('2026-06-30T10:00:00.000Z'),
      targetDay: '2026-06-29',
    }];

    await expect(queryHealth()).resolves.toMatchObject({
      status: 'ok',
      liveness: 'ok',
      readiness: 'ok',
      checks: { db: 'ok' },
      lastSuccessfulIngestionCompletedAt: '2026-06-30T10:00:00.000Z',
      lastSuccessfulIngestionTargetDay: '2026-06-29',
      staleDataStatus: 'stale',
      staleDataWarning: 'Last successful ingestion completed more than 26 hours ago.',
    });
  });

  it('reports live but degraded when the database ping fails', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    pingDbMock.mockResolvedValue(false);

    await expect(queryHealth()).resolves.toMatchObject({
      status: 'degraded',
      liveness: 'ok',
      readiness: 'degraded',
      checks: { db: 'error' },
      lastSuccessfulIngestionCompletedAt: null,
      lastSuccessfulIngestionTargetDay: null,
      staleDataStatus: 'unknown',
      staleDataWarning: null,
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('does not initialize the database client when DATABASE_URL is unset', async () => {
    delete process.env.DATABASE_URL;

    await expect(queryHealth()).resolves.toMatchObject({
      status: 'degraded',
      liveness: 'ok',
      readiness: 'degraded',
      checks: { db: 'unconfigured' },
      staleDataStatus: 'unknown',
      staleDataWarning: null,
    });
    expect(pingDbMock).not.toHaveBeenCalled();
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('returns 200 from the route handler when ready', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    pingDbMock.mockResolvedValue(true);

    await expect(healthHandler()).resolves.toMatchObject({
      status: 200,
      body: { status: 'ok', readiness: 'ok', checks: { db: 'ok' } },
    });
  });

  it('returns 503 from the route handler when degraded', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    pingDbMock.mockResolvedValue(false);

    await expect(healthHandler()).resolves.toMatchObject({
      status: 503,
      body: { status: 'degraded', readiness: 'degraded', checks: { db: 'error' } },
    });
  });

  it('returns 200 from the route handler when ingestion is stale but the database is available', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    pingDbMock.mockResolvedValue(true);
    state.ingestionRows = [{
      completedAt: new Date('2026-06-30T10:00:00.000Z'),
      targetDay: '2026-06-29',
    }];

    await expect(healthHandler()).resolves.toMatchObject({
      status: 200,
      body: { status: 'ok', readiness: 'ok', staleDataStatus: 'stale' },
    });
  });
});
