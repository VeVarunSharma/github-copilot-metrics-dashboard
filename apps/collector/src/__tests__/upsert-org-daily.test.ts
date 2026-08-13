import { describe, it } from 'vitest';

describe.skip('upsertOrgDaily integration', () => {
  it('upserts org daily rows idempotently against Postgres', async () => {
    // Enable with @testcontainers/postgresql in a follow-up when DB integration tests are wired in CI.
  });
});
