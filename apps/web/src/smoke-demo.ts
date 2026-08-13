import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { dimOrg, db } from '@ghcp-dash/db';
import { CALCULATOR_DEFAULTS, computeCalculator } from '@/calculator/compute';
import type { DateRange } from '@/lib/date-range';
import { queryAdoption } from '@/server/queries/adoption';
import { queryCodeGeneration } from '@/server/queries/code-generation';
import { queryCost } from '@/server/queries/cost';
import { queryOverview } from '@/server/queries/overview';
import { queryPullRequests } from '@/server/queries/pull-requests';
import { querySettings } from '@/server/queries/settings';
import {
  blendWeightFields,
  knobsToDraft,
  numericKnobFields,
  validateSettingsKnobDraft,
} from '@/views/settings-knobs-form';

const DEMO_ORG_SLUG = 'demo-org';
const DEMO_ORG_DISPLAY_NAME = '[demo] Demo organization';
const MIN_VIEW_DAYS = 28;

interface SmokeCheck {
  name: string;
  value: number | string | boolean;
  minimum?: number;
}

interface P0Route {
  label: string;
  href: string;
  pageRelativePath: string;
  viewRelativePath: string;
}

const p0Routes: readonly P0Route[] = [
  {
    label: 'Overview',
    href: '/overview',
    pageRelativePath: 'app/(dashboard)/overview/page.tsx',
    viewRelativePath: 'views/overview-view.tsx',
  },
  {
    label: 'Adoption',
    href: '/adoption',
    pageRelativePath: 'app/(dashboard)/adoption/page.tsx',
    viewRelativePath: 'views/adoption-view.tsx',
  },
  {
    label: 'Code Generation',
    href: '/code-generation',
    pageRelativePath: 'app/(dashboard)/code-generation/page.tsx',
    viewRelativePath: 'views/code-generation-view.tsx',
  },
  {
    label: 'Pull Requests',
    href: '/pull-requests',
    pageRelativePath: 'app/(dashboard)/pull-requests/page.tsx',
    viewRelativePath: 'views/pull-requests-view.tsx',
  },
  {
    label: 'Cost & Spend',
    href: '/cost',
    pageRelativePath: 'app/(dashboard)/cost/page.tsx',
    viewRelativePath: 'views/cost-view.tsx',
  },
  {
    label: 'Calculator',
    href: '/calculator',
    pageRelativePath: 'app/calculator/page.tsx',
    viewRelativePath: 'views/calculator-view.tsx',
  },
  {
    label: 'Settings',
    href: '/settings',
    pageRelativePath: 'app/(dashboard)/settings/page.tsx',
    viewRelativePath: 'views/settings-view.tsx',
  },
];

function loadEnvFromWorkspaceRoot(): void {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
        const separator = trimmed.indexOf('=');
        if (separator <= 0) continue;
        const key = trimmed.slice(0, separator).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;
        const rawValue = trimmed.slice(separator + 1).trim();
        process.env[key] =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
      }
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

function dayString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  throw new Error(`Expected YYYY-MM-DD day value, received ${String(value)}`);
}

function shiftDays(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function positive(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function nonEmpty<T>(values: readonly T[]): boolean {
  return values.length > 0;
}

function check(checks: SmokeCheck[], name: string, passed: boolean, value: SmokeCheck['value'], minimum?: number): void {
  checks.push({ name, value: passed, minimum });
  if (!passed) {
    checks.push({ name: `${name} observed`, value, minimum });
  }
}

function checkMinimum(checks: SmokeCheck[], name: string, value: number, minimum: number): void {
  check(checks, name, value >= minimum, value, minimum);
}

function checkPositive(checks: SmokeCheck[], name: string, value: number | null | undefined): void {
  check(checks, name, positive(value), value ?? 'null', 1);
}

function readSource(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`Expected source file to exist: ${path}`);
  }
  return readFileSync(path, 'utf8');
}

async function demoRange(): Promise<DateRange> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the web demo smoke check.');
  }

  const [org] = await db
    .select({
      orgId: dimOrg.orgId,
      displayName: dimOrg.displayName,
      lastSeenDay: dimOrg.lastSeenDay,
    })
    .from(dimOrg)
    .where(eq(dimOrg.orgId, DEMO_ORG_SLUG))
    .limit(1);

  if (!org || org.displayName !== DEMO_ORG_DISPLAY_NAME) {
    throw new Error(`Demo org ${DEMO_ORG_SLUG} is missing. Run pnpm db:seed:demo first.`);
  }

  const to = dayString(org.lastSeenDay);
  return { from: shiftDays(to, -(MIN_VIEW_DAYS - 1)), to };
}

function smokeP0Routes(checks: SmokeCheck[]): void {
  const srcDir = dirname(fileURLToPath(import.meta.url));
  const topNav = readSource(resolve(srcDir, 'components/layout/top-nav.tsx'));
  const stubPattern = /\b(coming soon|not implemented|stub)\b/i;

  for (const route of p0Routes) {
    check(checks, `${route.label} appears in P0 nav`, topNav.includes(`'${route.href}'`), route.href);

    const pageSource = readSource(resolve(srcDir, route.pageRelativePath));
    const viewSource = readSource(resolve(srcDir, route.viewRelativePath));
    check(checks, `${route.label} page is not a launch stub`, !stubPattern.test(pageSource), route.pageRelativePath);
    check(checks, `${route.label} view is not a launch stub`, !stubPattern.test(viewSource), route.viewRelativePath);
  }
}

async function smokeOverview(range: DateRange, checks: SmokeCheck[]): Promise<void> {
  const data = await queryOverview(DEMO_ORG_SLUG, range);
  checkPositive(checks, 'Overview hours saved is populated', data.headlines.hoursSavedMtd);
  checkPositive(checks, 'Overview dollars saved is populated', data.headlines.dollarsSavedMtd);
  checkPositive(checks, 'Overview spend is populated', data.headlines.totalSpendMtd);
  checkPositive(checks, 'Overview active users is populated', data.sub.activeUsers);
  checkPositive(checks, 'Overview acceptance rate is populated', data.sub.acceptanceRate);
  checkMinimum(checks, 'Overview daily saved series covers demo range', data.dailySaved.length, MIN_VIEW_DAYS);
  checkMinimum(checks, 'Overview estimator breakdown has all estimators', data.estimatorBreakdown.length, 3);
  checkMinimum(checks, 'Overview spend-vs-value series covers demo range', data.spendVsValue.length, MIN_VIEW_DAYS);
}

async function smokeAdoption(range: DateRange, checks: SmokeCheck[]): Promise<void> {
  const data = await queryAdoption(DEMO_ORG_SLUG, range);
  checkPositive(checks, 'Adoption DAU is populated', data.headlines.dau);
  checkPositive(checks, 'Adoption WAU is populated', data.headlines.wau);
  checkPositive(checks, 'Adoption MAU is populated', data.headlines.mau);
  checkPositive(checks, 'Adoption acceptance rate is populated', data.headlines.acceptanceRate);
  checkPositive(checks, 'Adoption agent adoption is populated', data.headlines.agentAdoptionPct);
  checkMinimum(checks, 'Adoption DAU/WAU trend covers demo range', data.dauWauTrend.length, MIN_VIEW_DAYS);
  checkMinimum(checks, 'Adoption acceptance trend covers demo range', data.acceptanceRateTrend.length, MIN_VIEW_DAYS);
  check(checks, 'Adoption chat-mode breakdown is populated', nonEmpty(data.chatModeBreakdown), data.chatModeBreakdown.length, 1);
  check(checks, 'Adoption top IDEs are populated', nonEmpty(data.topIdes), data.topIdes.length, 1);
  check(checks, 'Adoption top models are populated', nonEmpty(data.topModels), data.topModels.length, 1);
  check(checks, 'Adoption funnel is populated', data.funnel.every((stage) => stage.count > 0), data.funnel.map((stage) => `${stage.stage}:${stage.count}`).join(', '));
}

async function smokeCodeGeneration(range: DateRange, checks: SmokeCheck[]): Promise<void> {
  const data = await queryCodeGeneration(DEMO_ORG_SLUG, range);
  checkPositive(checks, 'Code Generation LoC added is populated', data.headlines.locAdded);
  checkPositive(checks, 'Code Generation LoC changed is populated', data.headlines.locChanged);
  checkPositive(checks, 'Code Generation acceptance rate is populated', data.headlines.acceptanceRate);
  checkPositive(checks, 'Code Generation agent contribution is populated', data.headlines.agentContributionPct);
  checkMinimum(checks, 'Code Generation daily LoC covers demo range', data.dailyLoc.length, MIN_VIEW_DAYS);
  check(checks, 'Code Generation language breakdown is populated', nonEmpty(data.byLanguage), data.byLanguage.length, 1);
  check(checks, 'Code Generation feature breakdown is populated', nonEmpty(data.byFeature), data.byFeature.length, 1);
  check(checks, 'Code Generation IDE breakdown is populated', nonEmpty(data.byIde), data.byIde.length, 1);
  check(checks, 'Code Generation chat-mode breakdown is populated', nonEmpty(data.byChatMode), data.byChatMode.length, 1);
  check(checks, 'Code Generation model breakdown is populated', nonEmpty(data.byModel), data.byModel.length, 1);
}

async function smokePullRequests(range: DateRange, checks: SmokeCheck[]): Promise<void> {
  const data = await queryPullRequests(DEMO_ORG_SLUG, range);
  checkPositive(checks, 'Pull Requests created count is populated', data.headlines.totalCreated);
  checkPositive(checks, 'Pull Requests created-by-Copilot pct is populated', data.headlines.pctByCopilot);
  checkPositive(checks, 'Pull Requests merged count is populated', data.headlines.totalMerged);
  checkPositive(checks, 'Pull Requests merged-by-Copilot pct is populated', data.headlines.pctMergedByCopilot);
  checkPositive(checks, 'Pull Requests reviewed-by-Copilot pct is populated', data.headlines.pctReviewedByCopilot);
  checkMinimum(checks, 'Pull Requests daily merged covers demo range', data.dailyMerged.length, MIN_VIEW_DAYS);
  checkMinimum(checks, 'Pull Requests time-to-merge covers demo range', data.timeToMerge.length, MIN_VIEW_DAYS);
  checkPositive(checks, 'Pull Requests suggestions are populated', data.suggestions.totalSuggestions);
  checkPositive(checks, 'Pull Requests Copilot suggestions are populated', data.suggestions.copilotSuggestions);
  checkPositive(
    checks,
    'Pull Requests authored/reviewed overlap is populated',
    data.authoredVsReviewedOverlap.authoredOnly + data.authoredVsReviewedOverlap.reviewedOnly + data.authoredVsReviewedOverlap.both,
  );
}

async function smokeCost(range: DateRange, checks: SmokeCheck[]): Promise<void> {
  const data = await queryCost(DEMO_ORG_SLUG, range);
  checkPositive(checks, 'Cost total spend is populated', data.headlines.totalSpendMtd);
  checkPositive(checks, 'Cost seat spend is populated', data.headlines.seatCostMtd);
  checkPositive(checks, 'Cost premium spend is populated', data.headlines.premiumSpendMtd);
  checkPositive(checks, 'Cost AI-credit spend is populated', data.headlines.aiCreditSpendMtd);
  checkPositive(checks, 'Cost per active user is populated', data.headlines.dollarPerActiveUser);
  checkMinimum(checks, 'Cost daily stacked series covers demo range', data.dailyStacked.length, MIN_VIEW_DAYS);
  check(checks, 'Cost model spend is populated', nonEmpty(data.byModel), data.byModel.length, 1);
  checkMinimum(checks, 'Cost per-chat series covers demo range', data.costPerChatRequest.length, MIN_VIEW_DAYS);
  checkMinimum(checks, 'Cost included burndown covers demo range', data.includedBurndown.length, MIN_VIEW_DAYS);
  checkMinimum(checks, 'Cost forecast covers demo range', data.forecast.length, MIN_VIEW_DAYS);
}

function smokeCalculator(checks: SmokeCheck[]): void {
  const result = computeCalculator(CALCULATOR_DEFAULTS);
  const largerTeamResult = computeCalculator({ ...CALCULATOR_DEFAULTS, developers: CALCULATOR_DEFAULTS.developers + 10 });
  const allInputsFinite = Object.values(CALCULATOR_DEFAULTS).every((value) => Number.isFinite(value) && value > 0);

  check(checks, 'Calculator defaults expose usable positive inputs', allInputsFinite, JSON.stringify(CALCULATOR_DEFAULTS));
  checkPositive(checks, 'Calculator default hours saved is populated', result.roi.hoursSavedBlended);
  checkPositive(checks, 'Calculator default dollars saved is populated', result.roi.dollarsSavedBlended);
  checkPositive(checks, 'Calculator default ROI is populated', result.roi.roiRatio);
  check(checks, 'Calculator contribution chart is populated', result.contributions.length === 4 && result.contributions.every((row) => row.hours > 0), result.contributions.length, 4);
  check(
    checks,
    'Calculator responds to edited inputs',
    largerTeamResult.roi.dollarsSavedBlended > result.roi.dollarsSavedBlended,
    `${largerTeamResult.roi.dollarsSavedBlended} <= ${result.roi.dollarsSavedBlended}`,
  );
}

async function smokeSettings(checks: SmokeCheck[]): Promise<void> {
  const data = await querySettings();
  const draft = knobsToDraft(data.knobs);
  const validation = validateSettingsKnobDraft(draft);
  const blendTotal = Object.values(data.knobs.blend).reduce((sum, value) => sum + value, 0);
  const srcDir = dirname(fileURLToPath(import.meta.url));
  const formSource = readSource(resolve(srcDir, 'views/settings-knobs-form.tsx'));
  const inputCount = formSource.match(/<Input/g)?.length ?? 0;

  check(checks, 'Settings currency knob is populated', data.knobs.currency.length === 3, data.knobs.currency);
  check(checks, 'Settings saved knobs are valid', validation.ok, validation.ok ? 'valid' : validation.errors.join('; '));
  check(checks, 'Settings blend weights sum to 1', Math.abs(blendTotal - 1) <= 0.001, blendTotal.toFixed(3));
  check(
    checks,
    'Settings exposes every numeric value knob as an editable input',
    numericKnobFields.length >= 7 &&
      formSource.includes('numericKnobFields.map') &&
      formSource.includes('id={`knob-${field.key}`}') &&
      formSource.includes('onChange={(event) => updateNumeric(field.key, event.target.value)}'),
    `fields=${numericKnobFields.map((field) => field.key).join(', ')}`,
  );
  check(
    checks,
    'Settings exposes every headline blend knob as an editable input',
    blendWeightFields.length === 3 &&
      formSource.includes('blendWeightFields.map') &&
      formSource.includes('id={`blend-${field.key}`}') &&
      formSource.includes('onChange={(event) => updateBlend(field.key, event.target.value)}'),
    `fields=${blendWeightFields.map((field) => field.key).join(', ')}`,
  );
  check(checks, 'Settings exposes editable input controls', inputCount >= 3, inputCount, 3);
  check(checks, 'Settings exposes save controls', formSource.includes('Save value settings') && formSource.includes('Reset to saved values'), 'missing save/reset controls');
}

async function main(): Promise<void> {
  loadEnvFromWorkspaceRoot();
  const checks: SmokeCheck[] = [];
  const range = await demoRange();

  smokeP0Routes(checks);
  await smokeOverview(range, checks);
  await smokeAdoption(range, checks);
  await smokeCodeGeneration(range, checks);
  await smokePullRequests(range, checks);
  await smokeCost(range, checks);
  smokeCalculator(checks);
  await smokeSettings(checks);

  const failures = checks.filter((item) => item.value === false || (typeof item.value === 'number' && item.minimum !== undefined && item.value < item.minimum));
  if (failures.length > 0) {
    throw new Error(`Web demo smoke failed: ${failures.map((item) => `${item.name}=${String(item.value)}`).join('; ')}`);
  }

  console.log(JSON.stringify({ status: 'ok', orgId: DEMO_ORG_SLUG, range, checks }));
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
