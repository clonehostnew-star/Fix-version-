import { adminAvailable } from '@/lib/firebase/admin';
import { loadLatestDeploymentForServer } from '@/lib/persistence';
import { NextRequest, NextResponse } from 'next/server';
import { subscribeDeploymentEvents } from '@/lib/eventBus';

export async function GET(request: NextRequest) {
  // Expects a serverId query parameter, for example: /api/diagnostics?serverId=YOUR_SERVER_ID
  const url = new URL(request.url);
  const serverId = url.searchParams.get('serverId');
  const stream = url.searchParams.get('stream');

  if (!serverId) {
    return new NextResponse(JSON.stringify({ error: "Please provide a serverId query parameter." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const node = process.version;
  let next = null;
  try {
    next = require('next/package.json').version;
  } catch {}

  const aiAvailable = (() => {
    try {
      require.resolve('genkit');
      require.resolve('@genkit-ai/googleai');
      return true;
    } catch {
      return false;
    }
  })();

  let deploymentState = null;
  let error = null;
  if (adminAvailable()) {
    try {
      deploymentState = await loadLatestDeploymentForServer(serverId);
    } catch (e: any) {
      error = e.message;
    }
  }


  if (stream === 'events') {
    const deploymentId = url.searchParams.get('deploymentId');
    if (!serverId || !deploymentId) {
      return new NextResponse('Missing serverId or deploymentId', { status: 400 });
    }
    const readable = new ReadableStream({
      start(controller) {
        const send = (data: any) => {
          const line = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(line));
        };
        const unsubscribe = subscribeDeploymentEvents(serverId, deploymentId, (evt) => send(evt));
        // initial ping
        send({ type: 'ping', payload: { ts: Date.now() } });
        const keepAlive = setInterval(() => send({ type: 'ping', payload: { ts: Date.now() } }), 30000);
        controller.enqueue(new TextEncoder().encode('retry: 5000\n\n'));
        (controller as any)._cleanup = () => { clearInterval(keepAlive); unsubscribe(); };
      },
      cancel() {
        const cleanup = (this as any)?._cleanup;
        if (cleanup) cleanup();
      }
    });
    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      }
    });
  }

  return new NextResponse(JSON.stringify({
    node,
    next,
    aiAvailable,
    persistence: adminAvailable(),
    deploymentState,
    error,
  }), { headers: { 'Content-Type': 'application/json' } });
}
