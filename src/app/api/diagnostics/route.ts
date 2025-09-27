import { adminAvailable } from '@/lib/firebase/admin';
import { loadLatestDeploymentForServer } from '@/lib/persistence';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Expects a serverId query parameter, for example: /api/diagnostics?serverId=YOUR_SERVER_ID
  const url = new URL(request.url);
  const serverId = url.searchParams.get('serverId');

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


  return new NextResponse(JSON.stringify({
    node,
    next,
    aiAvailable,
    persistence: adminAvailable(),
    deploymentState,
    error,
  }), { headers: { 'Content-Type': 'application/json' } });
}
