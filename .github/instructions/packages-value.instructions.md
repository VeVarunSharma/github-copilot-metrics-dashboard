---
applyTo: 'packages/value/**'
---

# `packages/value` — value translation engine

Path-scoped rules for the pure-function value engine. Read first: [`specs/02-value-translation.md`](../../specs/02-value-translation.md) — this entire file is the methodology spec. Then [`specs/CONSTITUTION.md`](../../specs/CONSTITUTION.md).

## The cardinal rule

This package implements **the defensible math** that the entire product is built on. Every change here MUST be:

1. Traceable to a section in `specs/02-value-translation.md`.
2. Covered by unit tests.
3. Preserving snapshot reproducibility (knob changes invalidate gold; old snapshots remain explainable).

If the change would alter what a customer sees on screen, **update spec 02 in the same PR** with version-bumped rationale. (Constitution Principle 8.)

## Hard constraints

- **Pure functions only.** No I/O. No `Date.now()`. No random. No DB access. No HTTP.
- **No imports from other workspace packages.** This package defines its own input/output types so it stays self-contained.
- **All numeric outputs rounded to 2 decimal places at the END of each estimator.** Use the shared `round2(n)` helper. Don't round intermediate values.
- **Default knobs (`DEFAULT_KNOBS`) live in `src/defaults.ts`** and match spec 02 §"Default knobs" exactly. Don't drift.

## The three estimators

Per spec 02:

- `activityEstimator` — counts × minutes per interaction.
- `outputEstimator` — LoC ÷ baseline LoC/hour. **Marked as the most contested** — never lead with this in UI copy.
- `deliveryEstimator` — PR + (Phase 1) issue throughput. **Recommended for the headline** because it ties to delivered work.

All three MUST always be exported and runnable side-by-side. `blend()` combines them via the user-configured weights.

## ROI

```
total_spend = seat_cost + premium_request_spend + ai_credit_spend
net_value = dollars_saved_blended − total_spend
roi_ratio = total_spend === 0 ? 0 : net_value / total_spend
```

The zero-spend guard is intentional — never let ROI be `NaN` or `Infinity`. Negative ROI MUST be surfaced honestly, not clamped.

## Tests

- Unit coverage threshold: ≥ 85% lines (enforced via `vitest --coverage`).
- Test categories required:
  - **Default behavior** with `DEFAULT_KNOBS` and zero inputs → all zeros.
  - **Formula correctness** with hand-computed expected values.
  - **Blending** with edge weights ({1,0,0}, {0,0,1}, {0.5,0,0.5}).
  - **Validation** — `validateKnobs` accepts defaults, rejects negative cost, rejects blend that doesn't sum to 1.
  - **Properties** — monotonicity (doubling input doubles output), linearity in cost knob, blend is a convex combination. Use `toBeCloseTo` with 1dp tolerance for property tests (rounding noise from `round2`).
  - **Determinism** — same inputs always produce the same outputs.

## Knob snapshots

- `snapshotKnobs(knobs)` returns a deterministic JSON string with sorted keys. This goes into `fact_value_daily.knob_snapshot`.
- Snapshots MUST be reproducible — if I change knobs and re-snapshot, the old snapshot remains valid for historical rows.

## When adding a new estimator

This is a Phase 1+ feature (e.g., delivery-with-baseline-delta). When you do:

1. Update `ValueKnobs` and `DEFAULT_KNOBS` together.
2. Add the estimator function. Keep `allEstimators` covering all of them.
3. Update `blend()` if the input shape changes.
4. Update `validateKnobs` for any new constraints.
5. Update spec 02 with the new estimator's formula, defaults, and rationale.
6. Bump the constitution version if methodology changes (Principle 9).
