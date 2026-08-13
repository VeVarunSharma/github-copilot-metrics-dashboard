import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EvilChartsSmokeTestClient } from './smoke-test-client';

export const metadata: Metadata = {
  title: 'EvilCharts smoke test',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default function EvilChartsSmokeTestPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return <EvilChartsSmokeTestClient />;
}
