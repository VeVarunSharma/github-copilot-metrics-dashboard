import { CodeGenerationView } from '@/views/code-generation-view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) { return <CodeGenerationView searchParams={await searchParams} />; }
