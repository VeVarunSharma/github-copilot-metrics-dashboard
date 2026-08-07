# Authentication and production access posture

Copilot Metrics Dashboard is currently a **P0 OSS Beta**. This page documents the dashboard inbound auth modes and the recommended access posture for self-hosted evaluations. Native dashboard OAuth/RBAC is **not** implemented today. For production-like P1 evaluations, use identity-aware ingress/OIDC first, and treat the shared-password mode only as a temporary fallback or defense-in-depth control. Production readiness remains gated by the P1 requirements in [`specs/08-launch-readiness-and-priorities.md`](../specs/08-launch-readiness-and-priorities.md).

Security issues should be reported through [`SECURITY.md`](../SECURITY.md).

## Auth modes

The web app uses `AUTH_MODE` to choose its inbound browser/API access model:

| Mode | Behavior | Intended use |
| --- | --- | --- |
| unset | Backward-compatible default: resolves to `shared-password` when `DASHBOARD_PASSWORD` is set, otherwise `open`. | Existing local/private installs. |
| `open` | No dashboard route or application API auth in middleware. Dashboard pages show an auth-disabled warning banner. Settings mutations are still rejected because there is no authenticated operator. | Local demo only, or deployments where another layer blocks all untrusted traffic before the app. |
| `shared-password` | Dashboard pages and application API routes require a signed session cookie created by `/api/auth/login`. Requires `DASHBOARD_PASSWORD`. | Beta fallback for local/private self-hosting; not production RBAC/OAuth. |
| `identity-header` | Dashboard pages and application API routes require a trusted identity header from an upstream identity-aware proxy. `AUTH_IDENTITY_HEADER` defaults to `x-ms-client-principal-name`. If `DASHBOARD_PASSWORD` is also set, the shared-password login remains available as a fallback. | Recommended production-credible app mode when Azure Easy Auth, Microsoft Entra ID, or another OIDC-capable gateway/proxy protects the origin. |

Do **not** set `identity-header` unless the app is reachable only through an upstream component that authenticates users, strips any client-supplied copy of the trusted header, and injects the header after successful authentication. The app does not validate OIDC tokens itself.

## Do you need auth? (exposure-based decision guide)

Auth requirements are exposure-dependent:

- **Localhost and fully network-isolated deployments** may legitimately run `AUTH_MODE=open` when the network boundary is the access control. This includes local demos, VPN-only deployments, or restricted internal ingress reachable only by authorized viewers. The app remains safe-by-default in open mode: it shows an auth-disabled banner and rejects Settings/knob mutations because there is no authenticated operator.
- **Public ingress deployments** MUST enable auth. Azure Container Apps public ingress is public by default; use Microsoft Entra built-in auth as described in [Enable Microsoft Entra built-in auth on Azure Container Apps](#enable-microsoft-entra-built-in-auth-on-azure-container-apps), or use the shared-password fallback only as a temporary control.
- **Shared corporate networks** MUST enable auth when "inside the boundary" does not mean "only authorized Copilot Metrics Dashboard viewers." In that case, prefer Entra/OIDC-backed `identity-header` access and reserve `shared-password` for fallback or defense-in-depth.

## Shared-password fallback behavior

When `AUTH_MODE=shared-password`, or when `AUTH_MODE=identity-header` and `DASHBOARD_PASSWORD` is set, the shared-password fallback behaves as follows:

- The login form posts to `/api/auth/login`. The submitted password is compared with `DASHBOARD_PASSWORD`; the password is not stored in the browser.
- On successful login, the app sets a signed cookie and redirects to `/overview`.
- The cookie name defaults to `ghcp_dash_session` and can be overridden with `AUTH_COOKIE_NAME`.
- The cookie value is `v1.<issuedAt>.<signature>`, signed with HMAC-SHA-256 using `DASHBOARD_PASSWORD`.
- Session max age is **12 hours**. Cookies older than 12 hours are rejected.
- Cookie flags are `httpOnly`, `sameSite=lax`, `path=/`, and `secure` when `NODE_ENV=production`.
- Logout posts to `/api/auth/logout`, clears the cookie with `maxAge=0` and an expired date, then redirects to `/login?loggedOut=1`.
- Unauthenticated page requests redirect to `/login` when the fallback is available; unauthenticated API requests return `401`.

Changing `DASHBOARD_PASSWORD` and restarting/redeploying the web app invalidates existing cookies because the cookie signature no longer verifies.

## Identity-header behavior

`AUTH_MODE=identity-header` trusts exactly one configured request header as proof that upstream auth succeeded. The default `AUTH_IDENTITY_HEADER=x-ms-client-principal-name` matches common Azure App Service / Container Apps Easy Auth conventions; operators may set a different header for another proxy.

In this mode:

- Protected dashboard pages and application API routes require the trusted header, unless the optional shared-password fallback session cookie is valid.
- The app does not implement per-user roles, group mapping, MFA, Conditional Access, or token validation. Those controls must be enforced upstream.
- Settings mutations require authenticated identity-header or shared-password access. If separate viewer/admin roles are required, the upstream proxy must restrict access to `/settings` and `/api/settings/*` to the admin group until native dashboard RBAC exists.
- `/login` remains public, but it only shows a password form when the shared-password fallback is configured.
- When Azure Container Apps Easy Auth is enabled, logout redirects to the platform sign-out endpoint `/.auth/logout` so the upstream EasyAuth session is cleared as well as any app fallback cookie.

## Public routes

The middleware intentionally leaves these routes public in protected modes:

| Route | Why it is public |
| --- | --- |
| `/` | Public landing page with product/demo orientation and links. It does not expose dashboard data. |
| `/getting-started` and `/getting-started/*` | Public onboarding guide with setup commands and credential-scope guidance. It does not expose dashboard data or secrets. |
| `/calculator` and `/calculator/*` | Standalone value calculator. It must work without GitHub credentials or a database connection. |
| `/login` and `/login/*` | Users must be able to reach the login/fallback status page before they have an app session. |
| `/api/auth/login` | Creates a session cookie only when the shared-password fallback is configured and the password is valid. |
| `/api/auth/logout` | Clears the session cookie. |
| `/api/health` | Health/readiness probe for local checks and deployment platforms. It returns status/check metadata, not dashboard facts or GitHub credentials. |

Next.js static assets, optimized images, `favicon.ico`, and paths containing file extensions are excluded from the middleware matcher. The current auth route family contains only login and logout; do not add sensitive routes under `/api/auth` without revisiting the public-route policy.

## Why shared password is not production RBAC

`DASHBOARD_PASSWORD` is a beta safeguard for local or private self-hosted evaluation. It is **not** production RBAC, OAuth, or SSO because it has:

- One shared secret for every user.
- No user identity, group mapping, roles, or per-user authorization.
- No MFA, Conditional Access, device compliance, or centralized sign-in policy.
- No per-user session revocation or audit trail.
- No built-in rate limiting, lockout, password reset workflow, or identity-provider lifecycle.

Anyone who knows the shared password gets the same dashboard access. Treat it as a temporary gate, not as the only control for production data.

## Recommended P1 access posture before native auth

Until native dashboard OAuth/RBAC lands, do not expose the web app directly to the public internet with only `DASHBOARD_PASSWORD`.

Recommended patterns:

1. **Use `AUTH_MODE=identity-header` behind identity-aware ingress/OIDC as the primary P1 path.** Use Microsoft Entra ID, Azure Easy Auth, or another OIDC-compatible reverse proxy/gateway that enforces SSO, MFA/Conditional Access, and an allow-listed group before traffic reaches the app. For Azure Container Apps, use the Bicep/azd setup below instead of manually setting `AUTH_MODE`.
2. **Use Azure platform controls where applicable.** If hosting supports Container Apps authentication/authorization with Microsoft Entra ID, enable it before allowing public ingress. Use Azure Application Gateway or Azure Front Door for TLS, WAF, private origin access, and IP/routing controls; pair them with Entra/platform auth or an OIDC proxy because edge routing alone is not app RBAC.
3. **Keep the app on a private network where possible.** Prefer private ingress, VNet integration, VPN/corporate network access, private database endpoints, and no public Postgres exposure.
4. **Apply IP restrictions.** Restrict inbound access to corporate egress, VPN, approved operations networks, or trusted deployment probes.
5. **Store secrets in a secret store.** For production-like deployments, use Azure Key Vault or an equivalent store. Do not bake `.env` values into images or source.
6. **Preserve read/write separation.** The web app should use only read-only database access and must not receive outbound GitHub collector credentials.

You may keep `DASHBOARD_PASSWORD` enabled as a defense-in-depth fallback behind the identity layer, but it MUST NOT be the primary production access control. Leaving `AUTH_MODE=open` is acceptable only when another trusted network or identity-aware layer blocks unauthenticated users before they reach the app, and Settings mutations will not be available through the app itself.


### Enable Microsoft Entra built-in auth on Azure Container Apps

The Azure Bicep deployment can provision Container Apps built-in authentication (EasyAuth) with Microsoft Entra ID for the web Container App. This is the recommended P1 path for Azure public ingress and maps to the [`identity-header` behavior](#identity-header-behavior) above. The Bicep parameters are `enableEntraAuth`, `entraClientId`, `entraClientSecret`, `authIdentityHeader`, and `authMode`; `infra/main.parameters.json` surfaces them as azd environment variables.

1. Create a Microsoft Entra app registration for Copilot Metrics Dashboard.
2. Add this web redirect URI to the app registration: `https://<web-app-fqdn>/.auth/login/aad/callback`.
3. Create a client secret for the app registration.
4. Set the azd environment values used by `infra/main.parameters.json`:

   ```bash
   azd env set ENABLE_ENTRA_AUTH true
   azd env set ENTRA_CLIENT_ID <entra-application-client-id>
   azd env set ENTRA_CLIENT_SECRET <entra-client-secret>
   # Optional; defaults to x-ms-client-principal-name, which Container Apps EasyAuth injects.
   azd env set AUTH_IDENTITY_HEADER x-ms-client-principal-name
   ```

5. Deploy or reprovision:

   ```bash
   azd up
   # or, for an existing environment:
   azd provision
   ```

When `enableEntraAuth=true`, `infra/bicep/main.bicep` adds a `Microsoft.App/containerApps/authConfigs` resource to the web Container App, stores the supplied secret in Key Vault as `entra-client-secret`, references it from EasyAuth, and forces the web app to run with `AUTH_MODE=identity-header`. The `authMode` / `AUTH_MODE` parameter is used only when `enableEntraAuth=false`; its default remains `shared-password`. In Entra/EasyAuth mode, Container Apps injects `AUTH_IDENTITY_HEADER` for authenticated users, and logout redirects to `/.auth/logout`.

## Secret rotation

### Rotate `DASHBOARD_PASSWORD`

1. Generate a new high-entropy shared secret in your password manager or secret store.
2. Update the deployment secret or local `.env` value for `DASHBOARD_PASSWORD`.
3. Restart/redeploy the web app so the new value is loaded.
4. Ask users to sign in again. Existing cookies are invalid after the secret changes.
5. Remove the old value from the secret store and any deployment slots.
6. If the old password was exposed, review access logs and rotate any related credentials that may have been visible to users with dashboard access.

### Rotate GitHub collector credentials

The collector is the only component that should hold outbound GitHub credentials such as `GITHUB_TOKEN`.

1. Create a replacement credential with the least privileges required for your configured scope:
   - Organization metrics: `read:org`.
   - Billing and AI-credit data: `manage_billing:copilot`.
   - Delivery ingestion: `repo` or `public_repo` only when delivery ingestion is enabled.
   - Enterprise metrics: `read:enterprise` or `manage_billing:copilot`, depending on target data.
2. Store the new credential in Key Vault or your secret store; for local development, update `.env`.
3. Update the collector job/deployment secret reference. Do not add the GitHub credential to the web app.
4. Run the collector configuration smoke check, for example `pnpm smoke:collector-config`, using the updated secret.
5. Run the next scheduled collector job or a controlled manual collection and confirm logs show successful ingestion without token leakage.
6. Revoke the old GitHub credential in GitHub.
7. If rotation was due to exposure, also scrub affected logs/screenshots/issues and review whether database, dashboard, or platform credentials were exposed.

## Future native auth direction and P1/P2 boundaries

P1 production self-host readiness requires a production-credible dashboard access model or an explicitly documented hardened fallback risk. A P1 model must protect dashboard views except public calculator surfaces, store secrets outside code/images, support secure sessions and rotation/reset procedures, preserve web/collector credential separation, and gate admin Settings separately when roles exist.

The expected native direction is OIDC/OAuth-based dashboard auth with per-user sessions, identity-provider group mapping, viewer/admin roles, session revocation, auditability, and admin-only Settings controls. That native model is future work; current releases do not include full OAuth/RBAC. Microsoft Entra ID should be a first-class target because Azure is the primary production deployment target.

P2 auth work is separate from dashboard access. GitHub App authentication for enterprise source ingestion and non-GitHub tracker adapters may arrive in P2, but those source credentials must remain collector-side and must not weaken the dashboard access boundary.
