import { authEnabled } from '@/lib/env';

const AUTH_DOCS_URL = 'https://github.com/microsoft/github-copilot-metrics-dashboard/blob/main/docs/auth.md';

export function AuthDisabledBanner({ authIsEnabled = authEnabled }: { authIsEnabled?: boolean }) {
  if (authIsEnabled) return null;

  return (
    <aside role="status" className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="container flex flex-col gap-1 px-0 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong>Dashboard auth is disabled.</strong> This dashboard is public to anyone who can reach this URL because{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">AUTH_MODE</code> resolves to <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">open</code>. Use identity-header mode behind protected ingress or set the beta shared-password fallback before exposing dashboard data.
        </p>
        <a className="font-medium underline underline-offset-4" href={AUTH_DOCS_URL} target="_blank" rel="noreferrer">
          docs/auth.md
        </a>
      </div>
    </aside>
  );
}
