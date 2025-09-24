import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PricingPage() {
  return (
    <main className="container py-10 space-y-8">
      <h1 className="text-2xl font-headline font-bold">Pricing</h1>
      <div className="grid sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Starter</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0</div>
            <p className="text-sm text-muted-foreground">Daily free coins · 1 server</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pro</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$19</div>
            <p className="text-sm text-muted-foreground">Priority region · 3 servers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Business</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$79</div>
            <p className="text-sm text-muted-foreground">Dedicated resources · 10 servers</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

