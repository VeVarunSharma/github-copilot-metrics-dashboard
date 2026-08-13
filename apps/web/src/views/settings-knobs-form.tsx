'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { UpdateKnobsErrorResponseSchema, type KnobsBody } from '@ghcp-dash/contracts';
import { DEFAULT_KNOBS, validateKnobs } from '@ghcp-dash/value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/ts-rest-client';
import { cn } from '@/lib/utils';

const BLEND_SUM_TOLERANCE = 0.001;

export const numericKnobKeys = [
  'avgLoadedEngCostPerHour',
  'minPerAcceptedCompletion',
  'minPerChatRequest',
  'minPerAgentSession',
  'minSavedPerAuthoredPr',
  'minSavedPerReviewedPr',
  'locPerHourBaseline',
] as const;

type NumericKnobKey = (typeof numericKnobKeys)[number];
type BlendKey = keyof KnobsBody['blend'];

export type KnobDraft = Record<NumericKnobKey, string> & {
  currency: string;
  blend: Record<BlendKey, string>;
};

type ValidationResult = { ok: true; knobs: KnobsBody } | { ok: false; errors: string[] };

interface NumericKnobField {
  key: NumericKnobKey;
  label: string;
  unit: string;
  step: string;
  description: string;
  source: string;
}

interface BlendField {
  key: BlendKey;
  label: string;
  description: string;
}

export const numericKnobFields = [
  {
    key: 'avgLoadedEngCostPerHour',
    label: 'Loaded engineering cost / hour',
    unit: `${DEFAULT_KNOBS.currency} per hour`,
    step: '1',
    description: 'Converts saved hours into dollars saved.',
    source: 'Spec 02: salary + benefits + overhead divided by ~1,800 productive hours/year.',
  },
  {
    key: 'minPerAcceptedCompletion',
    label: 'Minutes saved / accepted completion',
    unit: 'minutes',
    step: '0.01',
    description: 'Activity estimator multiplier for accepted code completions.',
    source: 'Spec 02: GitHub research range of ~30–90 seconds; conservative midpoint.',
  },
  {
    key: 'minPerChatRequest',
    label: 'Minutes saved / chat request',
    unit: 'minutes',
    step: '0.1',
    description: 'Activity estimator multiplier for chat, ask, edit, and plan interactions.',
    source: 'Spec 02: typical Q&A or code explanation saves 2–5 minutes; conservative end.',
  },
  {
    key: 'minPerAgentSession',
    label: 'Minutes saved / agent session',
    unit: 'minutes',
    step: '1',
    description: 'Activity estimator multiplier for multi-step agent work.',
    source: 'Spec 02: conservative median for refactor, scaffolding, and multi-file tasks.',
  },
  {
    key: 'minSavedPerAuthoredPr',
    label: 'Minutes saved / Copilot-authored PR',
    unit: 'minutes',
    step: '1',
    description: 'Delivery estimator multiplier for merged PRs authored with Copilot.',
    source: 'Spec 02: small-to-medium PRs take ~1.5–4 focused hours; one hour saved is conservative.',
  },
  {
    key: 'minSavedPerReviewedPr',
    label: 'Minutes saved / Copilot-reviewed PR',
    unit: 'minutes',
    step: '1',
    description: 'Delivery estimator multiplier for PRs reviewed with Copilot.',
    source: 'Spec 02: average PR review takes 30–60 minutes; summary savings use 15 minutes.',
  },
  {
    key: 'locPerHourBaseline',
    label: 'LoC / hour baseline',
    unit: 'lines per hour',
    step: '1',
    description: 'Output estimator baseline for converting Copilot-authored LoC into hours.',
    source: 'Spec 02: industry range is commonly 10–50 LoC/hour; 30 is the conservative midpoint.',
  },
] as const satisfies readonly NumericKnobField[];

export const blendWeightFields = [
  {
    key: 'activity',
    label: 'Activity-based',
    description: 'Accepted completions, chat requests, and agent sessions.',
  },
  {
    key: 'output',
    label: 'Output-based',
    description: 'Copilot-authored lines of code against the LoC/hour baseline.',
  },
  {
    key: 'delivery',
    label: 'Delivery-based',
    description: 'Merged and reviewed PR evidence; default headline basis.',
  },
] as const satisfies readonly BlendField[];

const validationLabels: Record<string, string> = {
  currency: 'Currency',
  avgLoadedEngCostPerHour: 'Loaded engineering cost / hour',
  minPerAcceptedCompletion: 'Minutes saved / accepted completion',
  minPerChatRequest: 'Minutes saved / chat request',
  minPerAgentSession: 'Minutes saved / agent session',
  minSavedPerAuthoredPr: 'Minutes saved / Copilot-authored PR',
  minSavedPerReviewedPr: 'Minutes saved / Copilot-reviewed PR',
  locPerHourBaseline: 'LoC / hour baseline',
  'blend.activity': 'Activity blend weight',
  'blend.output': 'Output blend weight',
  'blend.delivery': 'Delivery blend weight',
};

export function knobsToDraft(knobs: KnobsBody): KnobDraft {
  return {
    currency: knobs.currency,
    avgLoadedEngCostPerHour: String(knobs.avgLoadedEngCostPerHour),
    minPerAcceptedCompletion: String(knobs.minPerAcceptedCompletion),
    minPerChatRequest: String(knobs.minPerChatRequest),
    minPerAgentSession: String(knobs.minPerAgentSession),
    minSavedPerAuthoredPr: String(knobs.minSavedPerAuthoredPr),
    minSavedPerReviewedPr: String(knobs.minSavedPerReviewedPr),
    locPerHourBaseline: String(knobs.locPerHourBaseline),
    blend: {
      activity: String(knobs.blend.activity),
      output: String(knobs.blend.output),
      delivery: String(knobs.blend.delivery),
    },
  };
}

export function blendTotalFromDraft(draft: KnobDraft): number | null {
  const values = blendWeightFields.map((field) => {
    const raw = draft.blend[field.key].trim();
    return raw.length === 0 ? Number.NaN : Number(raw);
  });
  if (values.some((value) => !Number.isFinite(value))) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

export function validateSettingsKnobDraft(draft: KnobDraft): ValidationResult {
  const errors: string[] = [];
  const currency = draft.currency.trim().toUpperCase();
  const numericValues: Record<NumericKnobKey, number> = {
    avgLoadedEngCostPerHour: 0,
    minPerAcceptedCompletion: 0,
    minPerChatRequest: 0,
    minPerAgentSession: 0,
    minSavedPerAuthoredPr: 0,
    minSavedPerReviewedPr: 0,
    locPerHourBaseline: 0,
  };
  const blendValues: Record<BlendKey, number> = { activity: 0, output: 0, delivery: 0 };

  if (currency.length === 0) {
    errors.push('Currency is required.');
  }

  for (const field of numericKnobFields) {
    const value = parseNumberInput(draft[field.key], field.label);
    if (value.ok) {
      numericValues[field.key] = value.value;
    } else {
      errors.push(value.error);
    }
  }

  for (const field of blendWeightFields) {
    const value = parseNumberInput(draft.blend[field.key], `${field.label} blend weight`);
    if (value.ok) {
      blendValues[field.key] = value.value;
    } else {
      errors.push(value.error);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const knobs: KnobsBody = {
    currency,
    avgLoadedEngCostPerHour: numericValues.avgLoadedEngCostPerHour,
    minPerAcceptedCompletion: numericValues.minPerAcceptedCompletion,
    minPerChatRequest: numericValues.minPerChatRequest,
    minPerAgentSession: numericValues.minPerAgentSession,
    minSavedPerAuthoredPr: numericValues.minSavedPerAuthoredPr,
    minSavedPerReviewedPr: numericValues.minSavedPerReviewedPr,
    locPerHourBaseline: numericValues.locPerHourBaseline,
    blend: blendValues,
  };
  const validation = validateKnobs(knobs);

  return validation.ok
    ? { ok: true, knobs }
    : { ok: false, errors: validation.errors.map(humanizeValidationError) };
}

function parseNumberInput(raw: string, label: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: `${label} is required.` };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a finite number.` };
  }
  return { ok: true, value };
}

function humanizeValidationError(error: string): string {
  return Object.entries(validationLabels).reduce(
    (message, [field, label]) => message.replaceAll(field, label),
    error,
  );
}

function draftSignature(draft: KnobDraft): string {
  return [
    draft.currency,
    ...numericKnobKeys.map((key) => draft[key]),
    ...blendWeightFields.map((field) => draft.blend[field.key]),
  ].join('\u001f');
}

function formatDefault(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString('en-US') : String(value);
}

type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success'; savedAt: string; recomputeStatus: 'not_started'; recomputeMessage: string }
  | { kind: 'error'; message: string };

export function SettingsKnobsForm({ initialKnobs }: { initialKnobs: KnobsBody }) {
  const [draft, setDraft] = useState(() => knobsToDraft(initialKnobs));
  const [savedDraft, setSavedDraft] = useState(() => knobsToDraft(initialKnobs));
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const validation = useMemo(() => validateSettingsKnobDraft(draft), [draft]);
  const blendTotal = useMemo(() => blendTotalFromDraft(draft), [draft]);
  const isDirty = useMemo(() => draftSignature(draft) !== draftSignature(savedDraft), [draft, savedDraft]);
  const isSaving = status.kind === 'saving';
  const canSave = validation.ok && isDirty && !isSaving;
  const blendTotalValid = blendTotal !== null && Math.abs(blendTotal - 1) <= BLEND_SUM_TOLERANCE;

  function clearStatus() {
    if (status.kind !== 'idle') setStatus({ kind: 'idle' });
  }

  function updateCurrency(event: ChangeEvent<HTMLInputElement>) {
    clearStatus();
    setDraft((current) => ({ ...current, currency: event.target.value }));
  }

  function updateNumeric(key: NumericKnobKey, value: string) {
    clearStatus();
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateBlend(key: BlendKey, value: string) {
    clearStatus();
    setDraft((current) => ({ ...current, blend: { ...current.blend, [key]: value } }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateSettingsKnobDraft(draft);
    if (!result.ok) return;

    setStatus({ kind: 'saving' });
    try {
      const response = await apiClient.updateKnobs({ body: result.knobs });
      if (response.status === 200) {
        const nextSavedDraft = knobsToDraft(result.knobs);
        setSavedDraft(nextSavedDraft);
        setDraft(nextSavedDraft);
        setStatus({
          kind: 'success',
          savedAt: response.body.savedAt,
          recomputeStatus: response.body.recompute.status,
          recomputeMessage: response.body.recompute.message,
        });
        return;
      }

      const errorBody = UpdateKnobsErrorResponseSchema.safeParse(response.body);
      setStatus({
        kind: 'error',
        message: errorBody.success ? errorBody.data.error : 'Settings could not be saved.',
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Settings could not be saved.',
      });
    }
  }

  function resetToSaved() {
    clearStatus();
    setDraft(savedDraft);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Saving updates the canonical value-translation knobs only. Recompute remains collector-owned:
        this web endpoint reports <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">not_started</code>, so derived gold values update after the next collector gold rebuild.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="knob-currency">Currency code</Label>
          <Input
            id="knob-currency"
            value={draft.currency}
            onChange={updateCurrency}
            disabled={isSaving}
            maxLength={3}
            className="uppercase"
          />
          <p className="text-xs text-muted-foreground">
            Default {DEFAULT_KNOBS.currency}. Spec 02 states billing amounts are normalized at ingestion using the configured currency.
          </p>
        </div>

        {numericKnobFields.map((field) => (
          <div key={field.key} className="space-y-2 rounded-lg border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label htmlFor={`knob-${field.key}`}>{field.label}</Label>
              <span className="text-xs text-muted-foreground">Default {formatDefault(DEFAULT_KNOBS[field.key])}</span>
            </div>
            <Input
              id={`knob-${field.key}`}
              type="number"
              min="0"
              step={field.step}
              inputMode="decimal"
              value={draft[field.key]}
              onChange={(event) => updateNumeric(field.key, event.target.value)}
              disabled={isSaving}
            />
            <p className="text-xs font-medium text-muted-foreground">{field.unit}</p>
            <p className="text-xs text-muted-foreground">{field.description}</p>
            <p className="text-xs text-muted-foreground">{field.source}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4 rounded-lg border p-4" aria-labelledby="blend-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="blend-heading" className="font-semibold">Headline blend weights</h3>
            <p className="text-sm text-muted-foreground">
              Use decimals from 0 to 1. The three weights must sum to 1.000 before saving. Spec 02 defaults to 100% delivery-based.
            </p>
          </div>
          <span
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium',
              blendTotalValid
                ? 'bg-[hsl(var(--success)/0.14)] text-success'
                : 'bg-[hsl(var(--destructive)/0.06)] text-destructive',
            )}
          >
            Total {blendTotal === null ? 'invalid' : blendTotal.toFixed(3)}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {blendWeightFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={`blend-${field.key}`}>{field.label}</Label>
                <span className="text-xs text-muted-foreground">Default {DEFAULT_KNOBS.blend[field.key]}</span>
              </div>
              <Input
                id={`blend-${field.key}`}
                type="number"
                min="0"
                max="1"
                step="0.01"
                inputMode="decimal"
                value={draft.blend[field.key]}
                onChange={(event) => updateBlend(field.key, event.target.value)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-3" aria-live="polite">
        {!validation.ok && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <p className="font-medium">Fix these values before saving:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.ok && (
          <p className="text-sm text-muted-foreground">
            All inputs are valid. Blend total is {blendTotal?.toFixed(3) ?? 'invalid'}.
          </p>
        )}

        {status.kind === 'saving' && (
          <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">Saving settings…</p>
        )}

        {status.kind === 'success' && (
          <div className="rounded-lg border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] p-4 text-sm text-foreground">
            <p className="font-medium">Saved at {new Date(status.savedAt).toLocaleString()}.</p>
            <p className="mt-1">Recompute status: <code className="rounded bg-[hsl(var(--success)/0.16)] px-1 py-0.5 text-xs">{status.recomputeStatus}</code>.</p>
            <p className="mt-1">{status.recomputeMessage}</p>
          </div>
        )}

        {status.kind === 'error' && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <p className="font-medium">Settings were not saved.</p>
            <p className="mt-1">{status.message}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!canSave}>
          {isSaving ? 'Saving…' : 'Save value settings'}
        </Button>
        <Button type="button" variant="outline" onClick={resetToSaved} disabled={!isDirty || isSaving}>
          Reset to saved values
        </Button>
      </div>
    </form>
  );
}
