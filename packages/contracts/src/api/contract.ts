import { initContract } from '@ts-rest/core';
import {
  AdoptionResponseSchema,
  CodeGenResponseSchema,
  ConsumptionPatternsResponseSchema,
  CostResponseSchema,
  DeliveryResponseSchema,
  EngineeringHealthResponseSchema,
  HealthResponseSchema,
  IngestionRunsQuerySchema,
  IngestionRunsResponseSchema,
  KnobsBodySchema,
  MetricsQuerySchema,
  OrgsResponseSchema,
  OverviewResponseSchema,
  PrResponseSchema,
  SettingsResponseSchema,
  UnitEconomicsResponseSchema,
  UpdateKnobsErrorResponseSchema,
  UpdateKnobsResponseSchema,
} from './schemas.js';

const c = initContract();

export const apiContract = c.router({
  health: {
    method: 'GET',
    path: '/api/health',
    responses: { 200: HealthResponseSchema, 503: HealthResponseSchema },
  },
  orgs: {
    method: 'GET',
    path: '/api/orgs',
    responses: { 200: OrgsResponseSchema },
  },
  overview: {
    method: 'GET',
    path: '/api/metrics/overview',
    query: MetricsQuerySchema,
    responses: { 200: OverviewResponseSchema },
  },
  adoption: {
    method: 'GET',
    path: '/api/metrics/adoption',
    query: MetricsQuerySchema,
    responses: { 200: AdoptionResponseSchema },
  },
  codeGeneration: {
    method: 'GET',
    path: '/api/metrics/code-generation',
    query: MetricsQuerySchema,
    responses: { 200: CodeGenResponseSchema },
  },
  pullRequests: {
    method: 'GET',
    path: '/api/metrics/pull-requests',
    query: MetricsQuerySchema,
    responses: { 200: PrResponseSchema },
  },
  cost: {
    method: 'GET',
    path: '/api/metrics/cost',
    query: MetricsQuerySchema,
    responses: { 200: CostResponseSchema },
  },
  unitEconomics: {
    method: 'GET',
    path: '/api/metrics/unit-economics',
    query: MetricsQuerySchema,
    responses: { 200: UnitEconomicsResponseSchema },
  },
  consumptionPatterns: {
    method: 'GET',
    path: '/api/metrics/consumption-patterns',
    query: MetricsQuerySchema,
    responses: { 200: ConsumptionPatternsResponseSchema },
  },
  delivery: {
    method: 'GET',
    path: '/api/metrics/delivery',
    query: MetricsQuerySchema,
    responses: { 200: DeliveryResponseSchema },
  },
  engineeringHealth: {
    method: 'GET',
    path: '/api/metrics/engineering-health',
    query: MetricsQuerySchema,
    responses: { 200: EngineeringHealthResponseSchema },
  },
  settings: {
    method: 'GET',
    path: '/api/settings',
    responses: { 200: SettingsResponseSchema },
  },
  updateKnobs: {
    method: 'PUT',
    path: '/api/settings/knobs',
    body: KnobsBodySchema,
    responses: { 200: UpdateKnobsResponseSchema, 401: UpdateKnobsErrorResponseSchema, 503: UpdateKnobsErrorResponseSchema },
  },
  ingestionRuns: {
    method: 'GET',
    path: '/api/ingestion/runs',
    query: IngestionRunsQuerySchema,
    responses: { 200: IngestionRunsResponseSchema },
  },
});

export default apiContract;
