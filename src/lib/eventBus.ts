import { EventEmitter } from 'events';

export type DeploymentEvent =
  | { type: 'log'; payload: { id: string; stream: string; message: string; timestamp: string } }
  | { type: 'state'; payload: any }
  | { type: 'status'; payload: { status: string; stage?: string } }
  | { type: 'qr'; payload: { id: string; stream: 'qr'; message: string; timestamp: string } }
  | { type: 'ping'; payload: { ts: number } };

const channelMap: Map<string, EventEmitter> = new Map();

function channelKey(serverId: string, deploymentId: string): string {
  return `${serverId}__${deploymentId}`;
}

export function getDeploymentChannel(serverId: string, deploymentId: string): EventEmitter {
  const key = channelKey(serverId, deploymentId);
  let ch = channelMap.get(key);
  if (!ch) {
    ch = new EventEmitter();
    // Increase listener limit for multiple clients
    ch.setMaxListeners(100);
    channelMap.set(key, ch);
  }
  return ch;
}

export function publishDeploymentEvent(serverId: string, deploymentId: string, event: DeploymentEvent): void {
  const ch = getDeploymentChannel(serverId, deploymentId);
  ch.emit('event', event);
}

export function subscribeDeploymentEvents(
  serverId: string,
  deploymentId: string,
  listener: (e: DeploymentEvent) => void
): () => void {
  const ch = getDeploymentChannel(serverId, deploymentId);
  ch.on('event', listener);
  return () => ch.off('event', listener);
}
