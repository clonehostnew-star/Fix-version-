
'use client';

import type { DeploymentLog } from '@/lib/types';
import dynamic from 'next/dynamic';
import type React from 'react';

// Dynamically import TerminalOutput with SSR turned off
const TerminalOutput = dynamic(() => import('./TerminalOutput').then(mod => mod.TerminalOutput), {
  ssr: false,
  loading: () => <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">Loading terminal...</div>
});

// Re-export the props type if needed elsewhere
export type { TerminalOutputProps } from './TerminalOutput';

interface ClientTerminalProps {
  logs: DeploymentLog[];
  isBotRunning: boolean;
  theme?: 'light' | 'dark';
  title?: string;
  icon?: React.ReactNode;
}

// Create a wrapper component that passes props through
export function ClientTerminal(props: ClientTerminalProps) {
  return <TerminalOutput {...props} />;
}
