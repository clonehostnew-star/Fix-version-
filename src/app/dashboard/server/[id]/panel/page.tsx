'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Server } from 'lucide-react';
import Link from 'next/link';

export default function ServerPanelSelectionPage() {
  const params = useParams();
  const serverId = params.id as string;
  const serverName = decodeURIComponent(serverId);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
            <h1 className="font-headline text-xl font-bold">WhatsApp bot site hosting</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          {/* CORRECTED: Links to control panel with server ID */}
          <Link href={`/dashboard/server/${serverId}/control-panel`} className="block w-full">
            <Card className="hover:bg-card-foreground/10 transition-colors cursor-pointer border-l-4 border-red-500">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-full">
                        <Server className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-grow">
                        <h2 className="font-bold text-lg">{serverName}</h2>
                        <p className="text-sm text-muted-foreground">WhatsApp bot server</p>
                    </div>
                </CardContent>
            </Card>
          </Link>
        </div>
      </main>
      
      <footer className="text-center p-4 text-xs text-muted-foreground">
        Pterodactyl&reg; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
