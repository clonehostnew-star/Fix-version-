
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, RotateCw, Square, Loader2 } from 'lucide-react';

interface ServerControlsProps {
    onStart: () => void;
    onRestart: () => void;
    onStop: () => void;
    onCompleteStop: () => void;
    stage: string;
    isDeploying: boolean;
}

export function ServerControls({ onStart, onRestart, onStop, onCompleteStop, stage, isDeploying }: ServerControlsProps) {

    const isRunning = stage === 'running';
    const isProcessing = isDeploying && !isRunning; // Covers installing, unpacking etc.

    return (
        <div className="flex gap-2 flex-wrap">
            <Button onClick={onStart} disabled={isProcessing || isRunning}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {isProcessing ? 'Deploying...' : 'Start'}
            </Button>
            <Button variant="secondary" onClick={onRestart} disabled={isProcessing || !isRunning}>
                <RotateCw className="mr-2 h-4 w-4" />
                Restart
            </Button>
            <Button variant="destructive" onClick={onStop} disabled={isProcessing || !isRunning}>
                <Square className="mr-2 h-4 w-4" />
                Stop
            </Button>
            <Button variant="destructive" onClick={onCompleteStop} disabled={isProcessing}>
                <Square className="mr-2 h-4 w-4" />
                Complete Stop
            </Button>
        </div>
    );
}
