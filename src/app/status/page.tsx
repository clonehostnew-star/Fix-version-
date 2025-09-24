export default async function StatusPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/diagnostics`, { cache: 'no-store' }).catch(() => null);
  const data = res && res.ok ? await res.json() : null;
  return (
    <main className="container py-10 space-y-6">
      <h1 className="text-2xl font-headline font-bold">System Status</h1>
      <div className="grid gap-2 text-sm">
        <div>Node: <span className="text-muted-foreground">{data?.node ?? 'unknown'}</span></div>
        <div>Next: <span className="text-muted-foreground">{data?.next ?? 'unknown'}</span></div>
        <div>AI deps installed: <span className="text-muted-foreground">{String(data?.aiAvailable ?? false)}</span></div>
        <div>Persistence enabled: <span className="text-muted-foreground">{String(data?.persistence ?? false)}</span></div>
      </div>
    </main>
  );
}

