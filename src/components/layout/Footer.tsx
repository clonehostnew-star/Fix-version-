'use client';

import Link from 'next/link';
import TrustBadges from '@/components/ui/trust-badges';

export function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="container py-10 grid gap-8">
        <TrustBadges />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
          <div className="space-y-2">
            <div className="font-semibold">Company</div>
            <ul className="space-y-1">
              <li><Link href="/about" className="hover:underline">About</Link></li>
              <li><Link href="/pricing" className="hover:underline">Pricing</Link></li>
              <li><Link href="/status" className="hover:underline">Status</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Legal</div>
            <ul className="space-y-1">
              <li><Link href="/terms" className="hover:underline">Terms</Link></li>
              <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact</Link></li>
            </ul>
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-2">
            <div className="font-semibold">WhatsApp Bot Hosting</div>
            <p className="text-muted-foreground">
              Deploy, monitor, and scale your WhatsApp bots with enterprise-grade reliability.
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} WhatsApp Bot Hosting. All rights reserved.</div>
      </div>
    </footer>
  );
}

