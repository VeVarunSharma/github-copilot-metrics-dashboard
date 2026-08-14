import { querySettings, updateKnobs } from '../queries/settings';
import type { KnobsBody, UpdateKnobsErrorResponse } from '@ghcp-dash/contracts';
import { authenticateRequestHeaders } from '@/lib/auth-request';
import { resolveAuthMode } from '@/lib/auth-config';

type HandlerContext = {
  request?: {
    headers: Pick<Headers, 'get'>;
  };
};

const SETTINGS_AUTH_ERROR = 'Settings changes require authenticated shared-password or trusted identity-header access.';

export async function settingsHandler() { return { status: 200 as const, body: await querySettings() }; }

async function canMutateSettings(context?: HandlerContext) {
  if (resolveAuthMode() === 'open') return false;
  if (!context?.request?.headers) return false;
  return (await authenticateRequestHeaders(context.request.headers)).ok;
}

export async function updateKnobsHandler({ body }: { body: KnobsBody }, context?: HandlerContext) {
  if (!(await canMutateSettings(context))) {
    return { status: 401 as const, body: { ok: false, error: SETTINGS_AUTH_ERROR } satisfies UpdateKnobsErrorResponse };
  }

  try {
    return { status: 200 as const, body: await updateKnobs(body) };
  } catch (error) {
    console.warn('Settings knob save failed', error);
    return { status: 503 as const, body: { ok: false, error: 'Settings could not be saved because the database is unavailable.' } satisfies UpdateKnobsErrorResponse };
  }
}
