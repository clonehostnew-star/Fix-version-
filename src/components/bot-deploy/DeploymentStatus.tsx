
'use client';

import type { DeploymentLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DeploymentStatusProps {
  status: string;
  stage: 'idle' | 'starting' | 'unpacking' | 'installing' | 'running' | 'analyzing' | 'finished' | 'error';
  lastLog: DeploymentLog | null;
  isDeploying: boolean;
}

const StageIcon = ({ stage }: { stage: string }) => {
  switch (stage) {
    case 'starting':
    case 'unpacking':
    case 'analyzing':
    case 'installing':
      return <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-500" />;
    case 'running':
        return <RefreshCw className="mr-2 h-4 w-4 animate-spin text-green-500" />;
    case 'finished':
      return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />;
    default:
      return <Info className="mr-2 h-4 w-4 text-muted-foreground" />;
  }
};

const getStageVariant = (stage: string) => {
    switch (stage) {
        case 'error': return 'destructive';
        case 'finished': return 'default';
        case 'running': return 'default';
        default: return 'secondary';
    }
}

export function DeploymentStatus({ status, stage, lastLog, isDeploying }: DeploymentStatusProps) {
  if (stage === 'idle') {
    return null; // Don't show before deployment starts
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-xl flex items-center">
          <StageIcon stage={stage} />
          Live Deployment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold text-sm">Status:</p>
          <p className="text-sm text-muted-foreground truncate">{status}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold text-sm">Stage:</p>
          <Badge variant={getStageVariant(stage)} className={stage === 'running' ? 'bg-green-500/20 text-green-700' : ''}>{stage.toUpperCase()}</Badge>
        </div>
        
        <div>
          <p className="font-semibold text-sm mb-1">Last Log Message:</p>
          <div className="p-3 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap break-all min-h-[4rem] text-muted-foreground">
            {lastLog ? (
                <span className={lastLog.stream === 'stderr' ? 'text-destructive' : 'text-foreground'}>
                    {lastLog.message.trim()}
                </span>
            ) : (
                'Waiting for logs...'
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
