import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { hasAuthenticatedRequest } from '@/lib/auth';
import { sharedPasswordFallbackEnabled } from '@/lib/auth-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; loggedOut?: string }> }) {
  if (await hasAuthenticatedRequest(await headers())) redirect('/overview');
  const params = await searchParams;
  const passwordFallbackEnabled = sharedPasswordFallbackEnabled();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {passwordFallbackEnabled
              ? 'Enter the dashboard password. Shared-password auth is a beta fallback, not production RBAC.'
              : 'Access is handled by upstream identity-aware ingress. No local shared-password fallback is configured.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordFallbackEnabled ? (
            <form action="/api/auth/login" method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoFocus />
              </div>
              {params.error && <p className="text-sm text-destructive">Invalid password.</p>}
              {params.loggedOut && <p className="text-sm text-muted-foreground">You have been signed out.</p>}
              <Button className="w-full" type="submit">
                Continue
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask your operator to confirm the identity-aware proxy is sending the configured trusted identity header.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
