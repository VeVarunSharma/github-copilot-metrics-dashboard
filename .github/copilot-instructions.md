# Copilot repository instructions

> Repository-wide custom instructions for GitHub Copilot. Path-specific rules live in [`.github/instructions/`](./instructions/) and are applied additively via frontmatter `applyTo:` globs.

This repo follows a layered instruction model. To work on this codebase, in priority order:

1. **[`specs/CONSTITUTION.md`](../specs/CONSTITUTION.md)** — non-negotiable principles. If anything else conflicts with the constitution, the constitution wins.
2. **[`AGENTS.md`](../AGENTS.md)** at the repo root — operational quick-reference: commands, conventions, gotchas. This is the open agents.md standard and is the canonical source for AI agent guidance.
3. **[`ARCHITECTURE.md`](../ARCHITECTURE.md)** at the repo root — 5-minute system orientation following the [architecture.md/](https://architecture.md/) template and grounded in named patterns (Medallion, Hexagonal, CQRS, Contract-First, Kimball, Modulith).
4. **[`specs/`](../specs/README.md)** — six detailed design specs (product, data model, value translation, architecture rationale, UI, roadmap).
5. **[`.github/instructions/*.instructions.md`](./instructions/)** — path-scoped overlays.

When generating code, follow `AGENTS.md` + `ARCHITECTURE.md` + `specs/CONSTITUTION.md`. When generating changes that touch user-visible behavior, the data model, the value-translation methodology, or the deployment topology, update both `specs/` AND `ARCHITECTURE.md` in the same change set (Constitution Principle 8).
