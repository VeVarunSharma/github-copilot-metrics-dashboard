---
applyTo: 'specs/**'
---

# `specs/` — design documents

Path-scoped rules for editing the design spec set. Read first: [`specs/CONSTITUTION.md`](../../specs/CONSTITUTION.md), [`specs/README.md`](../../specs/README.md).

## Conventions

- **Normative language follows RFC 2119** — `MUST`, `MUST NOT`, `SHOULD`, `MAY`. Avoid "should" without intent; if a rule is enforced, use `MUST`.
- **Every metric has a definition.** No ambiguous numbers in the dashboard. If a chart shows "Hours Saved", spec 02 must explain exactly how it is computed.
- **Open questions live in the relevant spec** under a bottom-of-file `## Open questions` heading. Resolved questions move into the body of the spec; the section is updated.
- **Spec numbers are stable.** `01-data-sources-and-model.md` is always spec 01. Don't renumber.
- **Cross-references use relative paths** (`./02-value-translation.md`, not full URLs).

## Constitution changes

Edits to `CONSTITUTION.md` follow a stricter process:

1. PR label `spec:constitution`.
2. Bump the version per semver in the constitution itself (MAJOR for removed/weakened principle, MINOR for added/expanded, PATCH for wording).
3. Update `Last amended` to today's date (ISO YYYY-MM-DD).
4. PR description MUST include rationale and a callout of any specs that need consequential updates.
5. Land on a separate commit (not squashed with implementation) so constitution history is auditable.

## When to update a spec

You MUST update specs (in the same PR) when changes affect:

- What users see on the dashboard (spec 04).
- The data model — new tables, new columns, changed PK shape (spec 01).
- The value-translation methodology — new estimators, new knobs, changed formulas (spec 02).
- The deployment topology — new infra, new env vars, new auth model (spec 03).
- The public ts-rest API contract surface (spec 03 + 04).
- The roadmap (spec 05) when items move between phases.

## When NOT to update a spec

- Bug fixes that restore intended behavior.
- Internal refactors that preserve the public contract.
- Test additions that don't change observable behavior.
- Performance improvements within the existing budget.

## Spec template (when adding a new one)

If we add a spec — e.g., `06-issues-correlation.md` for Phase 1:

```md
# NN — Title

Short orienting paragraph. What this spec covers and why.

## Goals

What this design MUST achieve. (Bullet list of MUSTs.)

## Non-goals (vN)

What this design explicitly does NOT do, deferred for now, or is out of scope forever.

## Design

The substance. Tables, schemas, sequence diagrams, formulas — whatever the topic needs.

## Open questions

- Bulleted list of things we haven't decided yet.
```
