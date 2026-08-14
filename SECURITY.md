# Security Policy

## Supported status

| Version | Status |
| --- | --- |
| `main` / latest P0 beta | Supported for security fixes on a best-effort OSS basis. |
| Older commits or forks | Not supported by maintainers. |

Copilot Metrics Dashboard is currently **P0 OSS Beta**. It is intended for local/demo and early self-host evaluation, not production self-host endorsement. Production readiness is gated by P1 items such as hardened auth, secret storage, observability, backups, and runbooks.

## Reporting a vulnerability

Use GitHub Private Vulnerability Reporting or a draft GitHub Security Advisory if available. If private reporting is unavailable, open a minimal public issue asking for a maintainer security contact and do **not** include exploit details.

Please include:

- Affected commit, tag, or branch.
- Impact and affected component.
- Reproduction steps or proof of concept using synthetic data when possible.
- Sanitized logs and configuration details.

Do not include tokens, `.env` values, raw GitHub API payloads, customer org names, user logins, database dumps, or sensitive screenshots.

## Credential and secret safety

- Store GitHub tokens and database credentials in local `.env` files or a secret store; never commit them.
- Rotate any credential that appears in an issue, PR, log, shell history, or screenshot.
- The collector is the only component that should hold outbound GitHub credentials.
- The web app should remain read-only against the database and must not make outbound GitHub API calls.
- Use least-privilege tokens. Enterprise ingestion may require classic PAT scopes such as `read:enterprise` or `manage_billing:copilot`.

## Data sensitivity

Copilot Metrics Dashboard processes Copilot usage, billing, PR, and derived value data. Even when identities are pseudonymized and views default to org/team aggregates, raw bronze files, database rows, logs, and exports can contain confidential customer information.

Use synthetic demo data for public issues, tests, and screenshots. Do not attach customer data unless a maintainer explicitly provides a private handling path.

## No phone-home stance

Copilot Metrics Dashboard is OSS-first and customer-controlled. It must not phone home, collect hidden telemetry, require a SaaS account, or send analytics to external services. Report any behavior that appears to violate this stance as a security/privacy issue.
