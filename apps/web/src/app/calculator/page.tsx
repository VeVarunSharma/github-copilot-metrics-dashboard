import { Suspense } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { CalculatorView } from '@/views/calculator-view';
import { Skeleton } from '@/components/ui/skeleton';
export default function CalculatorPage() { return <><Suspense><TopNav /></Suspense><main className="container py-6"><Suspense fallback={<Skeleton className="h-96" />}><CalculatorView /></Suspense></main></>; }
