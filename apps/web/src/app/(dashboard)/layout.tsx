import { Suspense } from 'react';
import { AuthDisabledBanner } from '@/components/layout/auth-disabled-banner';
import { TopNav } from '@/components/layout/top-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <TopNav />
      </Suspense>
      <AuthDisabledBanner />
      <main className="container py-6">{children}</main>
    </>
  );
}
