import { queryHealth } from '../queries/health';

export async function healthHandler() {
  const body = await queryHealth();
  return { status: body.readiness === 'ok' ? 200 as const : 503 as const, body };
}
