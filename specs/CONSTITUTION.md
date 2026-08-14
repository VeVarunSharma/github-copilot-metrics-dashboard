# Constitution

> This is the project's governing document. It captures **non-negotiable principles** that all design and implementation choices MUST honor. The detailed [`specs/`](./README.md) are how we implement these principles in practice; if a spec ever conflicts with the constitution, the constitution wins until the constitution is amended.

**Version:** 1.1.0
**Ratified:** 2026-06-20
**Last amended:** 2026-07-03

Normative language follows RFC 2119 (MUST, MUST NOT, SHOULD, MAY).

---

## Principles

### 1. Defensible Math

Every dollar figure and hour figure displayed by the product MUST be traceable from explicit, user-visible inputs. The UI MUST surface a "How is this calculated?" affordance on every derived metric showing the formula and the current knob values. Opaque numbers — values the user cannot reproduce by hand from inputs they can see — MUST NOT ship.

**Rationale:** Customers buy this tool to convince a CFO. The product loses if any number cannot be audited.

### 2. Privacy by Default

Per-user activity is ingested for completeness but the UI MUST surface only org-level and team-level aggregates by default. User logins MUST be pseudonymized via the `pseudonym_salt` setting; an admin opt-in toggle MAY reveal raw logins. The product MUST NOT include per-developer leaderboards, rankings, or surveillance affordances of any kind.

**Rationale:** Customers will share this tool internally. A surveillance-tool reputation kills adoption.

### 3. Read/Write Separation

The collector is the only component that holds outbound GitHub credentials. The web app MUST be read-only against the database and MUST NOT make outbound GitHub calls. This separation MUST be preserved so the web app can be exposed publicly without leaking creds.

**Rationale:** Defense in depth. The web app may run on a shared CAE; the collector runs as a scheduled job with a tighter blast radius.

### 4. Lakehouse-Shaped Schema

Silver and gold fact tables MUST be shaped so they map 1:1 to OneLake / Fabric delta tables. Surrogate keys are stable across re-ingestion. App-only or web-only columns MUST NOT appear in fact tables. Knob snapshots for derived rows MUST be persisted inside the row (`fact_value_daily.knob_snapshot`) so historical exports remain reproducible after knob changes.

**Rationale:** Phase 2 ships a native Fabric writer; that work must be a mechanical lift, not a rewrite.

### 5. Idempotent Ingestion

Every collector code path MUST be safe to re-run for the same `(source, orgId, day)` without data corruption or duplication. Silver upserts MUST use `ON CONFLICT DO UPDATE` on the natural primary key. Checkpoints MUST live in `ingestion_run` so a crashed run resumes without redownloading.

**Rationale:** Crashes happen. Network blips happen. The system must self-heal.

### 6. Bronze Retention

Raw NDJSON downloaded from GitHub MUST be persisted to disk under `./data/bronze/{source}/{orgId}/{YYYY-MM-DD}.ndjson` **before** parsing. This file is the audit trail and the replay source. Retention defaults to 90 days and is configurable per source.

**Rationale:** GitHub's signed URLs expire. If we drop the bytes on the floor, we cannot recover.

### 7. Contract-Driven Development

All HTTP endpoints exposed by the web app MUST be defined as ts-rest contracts in `packages/contracts`. The web client (server components, client components, server route handlers) MUST consume those contracts — no hand-written fetch URLs, no untyped request bodies. The collector MUST reuse the same Zod schemas to parse inbound GitHub API responses.

**Rationale:** Schema drift between client and server is impossible by construction. New endpoints force a contract change, which forces a deliberate decision.

### 8. Spec-First Changes

Changes that materially affect what users see, the data model, the value-translation methodology, the public API contract, or any deployment topology MUST land with a corresponding update to `specs/`. The constitution itself is amended via PR with a version bump (see Governance below).

**Rationale:** The specs are the brain. The code is the body. Drift between them is technical debt with no upside.

### 9. Transparent Methodology

The value-translation engine (`packages/value`) MUST keep all three estimators (Activity, Output, Delivery) available side-by-side and MUST NOT hide which estimator drives the headline number. Knob changes MUST be reflected in `fact_value_daily.knob_snapshot` so re-computation is auditable.

**Rationale:** Hiding methodology is the credibility failure we are explicitly correcting in the market.

### 10. OSS-First, Azure-Target

Customers MUST be able to self-host with `pnpm install && docker compose up && pnpm dev`. The product MUST NOT phone home, MUST NOT collect telemetry to external services, MUST NOT require a SaaS account. Primary deploy target is Azure (Container Apps + Postgres Flex; later OneLake mirror).

**Rationale:** OSS + customer-controlled data is the market position. SaaS lock-in defeats the value pitch.

---

### 11. Brand-Aligned & Accessible by Default

The product's visual language MUST follow the GitHub brand design system captured in [`DESIGN.md`](../DESIGN.md), which is derived from the official GitHub brand ([brand.github.com](https://brand.github.com)). Specifically:

- The palette MUST stay **neutral-anchored**: green-tinted GitHub grays and near-black carry structure; **GitHub Green is the single hero** and MUST be used sparingly (primary action, brand marks, the value/headline series, success).
- **Copilot Purple** MUST be reserved for **Copilot-attributed** meaning (Copilot-attributed metrics, the Copilot badge, Copilot-themed modules) and MUST NOT be used as generic decoration. **Security Blue** is reserved for security-attributed modules. Inline links are blue; green is never a link color.
- Typography MUST use **Mona Sans** (UI + display), **self-hosted** — no external font CDN (reinforces Principle 10). Code SHOULD use **Mona Sans Mono** once GitHub publishes it as open source (also self-hosted); until then a documented system-mono fallback is acceptable.
- **Dark mode is first-class**: every token, component, and chart MUST ship a designed dark value at parity with light.
- Data visualization MUST be **colorblind-aware**: meaning MUST NOT be encoded by hue alone (pair color with label, shape, or position). Charts MUST honor the semantic reservations in `DESIGN.md` (value = green, Copilot-attributed = purple, baseline = neutral).
- The UI MUST meet **WCAG 2.1 AA** (contrast, visible focus, reduced-motion) and MUST NOT introduce leaderboards, rankings, or per-developer surveillance chrome (reinforces Principle 2).

Material changes to the design system (tokens, typography, the semantic color reservations, or the component library) MUST update `DESIGN.md` in the same change set (see Principle 8).

**Rationale:** The value story is only persuasive if it looks trustworthy and unmistakably GitHub-native. A disciplined, accessible, brand-faithful surface is a credibility asset; ad-hoc styling and inaccessible charts undercut the numbers we ask a CFO to believe.

---

## Governance

### Amendment process

1. Open a PR with the label `spec:constitution`.
2. The PR MUST update the `Version` and `Last amended` fields above.
3. The PR description MUST include rationale and a callout of any specs that need consequential updates.
4. At least one repository maintainer MUST approve. The PR MUST land on a separate commit (not squashed with implementation) so the constitution's git history stays clean.

### Versioning

`MAJOR.MINOR.PATCH` per semver:

- **MAJOR:** A principle is removed, weakened, or replaced. Or a previously-MUST rule becomes MAY.
- **MINOR:** A new principle is added, or an existing principle is materially expanded.
- **PATCH:** Wording clarifications, typo fixes, non-semantic refinements.

### Compliance

Pull request templates SHOULD include a "Constitution check" checklist:

- [ ] Does this change introduce or modify a derived metric? If yes, is "How is this calculated?" wired up? (Principle 1)
- [ ] Does this change surface per-user data in the UI? (Principle 2)
- [ ] Does this change add an outbound GitHub call from the web app? (Principle 3)
- [ ] Does this change add app-only columns to fact tables? (Principle 4)
- [ ] Are new collector code paths idempotent? (Principle 5)
- [ ] Are new collector code paths persisting bronze before parsing? (Principle 6)
- [ ] Is the new web endpoint defined in a ts-rest contract? (Principle 7)
- [ ] Does this change require a spec update? (Principle 8)
- [ ] If knob math changed, is `knob_snapshot` updated and is recomputation triggered? (Principle 9)
- [ ] Does this change add phone-home telemetry or SaaS dependencies? (Principle 10)
- [ ] Does this change touch the visual language? If yes, does it follow `DESIGN.md` (green scarce, purple = Copilot-attributed, self-hosted Mona Sans, dark parity, WCAG AA, no hue-only charts) and is `DESIGN.md` updated when the design system itself changed? (Principle 11)

---

## Open questions

- **Maintainers**: who can approve constitution PRs? Currently undefined; defaults to anyone with write access until the project incorporates.
- **Compliance enforcement**: today the checklist is advisory. Consider a CI check that fails when PRs touching `packages/value` or `apps/web/src/views/` don't reference the relevant principle in the description.
