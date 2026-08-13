import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ViewHeader } from '@/components/layout/view-header';
import { querySettings } from '@/server/queries/settings';
import { SettingsKnobsForm } from './settings-knobs-form';

export async function SettingsView() {
  const data = await querySettings();

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Settings"
        subtitle="Tune the value-translation methodology and review ingestion status."
      />

      <Card>
        <CardHeader>
          <CardTitle>Value-translation knobs</CardTitle>
          <CardDescription>
            Defaults are conservative and sourced from spec 02. Knobs are updated via the contract endpoint{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PUT /api/settings/knobs</code>; the collector gold rebuild applies saved changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsKnobsForm initialKnobs={data.knobs} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingestion status</CardTitle>
          <CardDescription>Last collector runs. See <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ingestion_run</code> for the full audit trail.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-2 font-medium">Run</th>
                  <th className="p-2 font-medium">Source</th>
                  <th className="p-2 font-medium">Day</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.lastIngestionRun.map((run) => (
                  <tr key={run.runId} className="border-b last:border-0">
                    <td className="p-2 font-mono text-xs">{run.runId.slice(0, 8)}</td>
                    <td className="p-2">{run.source}</td>
                    <td className="p-2 font-mono text-xs">{run.targetDay ?? '—'}</td>
                    <td className="p-2">
                      <span
                        className={
                          run.status === 'success'
                            ? 'rounded-md bg-[hsl(var(--success)/0.14)] px-2 py-0.5 text-xs font-medium text-success'
                            : run.status === 'no_content'
                            ? 'rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                            : 'rounded-md bg-[hsl(var(--destructive)/0.06)] px-2 py-0.5 text-xs font-medium text-destructive'
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{run.completedAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.lastIngestionRun.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No ingestion runs yet. Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm collect</code> to start.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy posture</CardTitle>
          <CardDescription>Raw-login display is operator-controlled, not a browser-editable setting.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Real-login display is <span className="font-medium text-foreground">{data.showRealLogins ? 'enabled' : 'disabled'}</span> by environment/operator configuration
          (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">SHOW_REAL_LOGINS</code>). This page intentionally does not present a nonfunctional toggle.
          The v1 dashboard only displays aggregate data; pseudonymization remains the default defense-in-depth posture (Constitution P2).
        </CardContent>
      </Card>
    </div>
  );
}
