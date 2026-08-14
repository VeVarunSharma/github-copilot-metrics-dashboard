import { createNextHandler } from '@ts-rest/serverless/next';
import { apiContract } from '@ghcp-dash/contracts';
import { healthHandler } from './handlers/health';
import { orgsHandler } from './handlers/orgs';
import { overviewHandler } from './handlers/overview';
import { adoptionHandler } from './handlers/adoption';
import { codeGenerationHandler } from './handlers/code-generation';
import { pullRequestsHandler } from './handlers/pull-requests';
import { costHandler } from './handlers/cost';
import { unitEconomicsHandler } from './handlers/unit-economics';
import { consumptionPatternsHandler } from './handlers/consumption';
import { deliveryHandler } from './handlers/delivery';
import { engineeringHealthHandler } from './handlers/engineering-health';
import { settingsHandler, updateKnobsHandler } from './handlers/settings';
import { ingestionRunsHandler } from './handlers/ingestion-runs';

export const router = {
  health: healthHandler,
  orgs: orgsHandler,
  overview: overviewHandler,
  adoption: adoptionHandler,
  codeGeneration: codeGenerationHandler,
  pullRequests: pullRequestsHandler,
  cost: costHandler,
  unitEconomics: unitEconomicsHandler,
  consumptionPatterns: consumptionPatternsHandler,
  delivery: deliveryHandler,
  engineeringHealth: engineeringHealthHandler,
  settings: settingsHandler,
  updateKnobs: updateKnobsHandler,
  ingestionRuns: ingestionRunsHandler,
};

export const nextHandler = createNextHandler(apiContract, router, { handlerType: 'app-router' });
export const GET = nextHandler;
export const POST = nextHandler;
export const PUT = nextHandler;
export const DELETE = nextHandler;
