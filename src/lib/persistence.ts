import type { BotDeployState, DeploymentLog } from '@/lib/types';
import { getDb } from '@/lib/firebase/admin';

const COLLECTION = 'deployments';

export async function saveDeploymentState(serverId: string, deploymentId: string, state: BotDeployState) {
  const db = getDb();
  if (!db) return; // soft-fail if admin not available
  // Store light state (without heavy logs)
  const { logs: _logs, qrLogs: _qr, ...rest } = state as any;
  await db.collection(COLLECTION).doc(`${serverId}__${deploymentId}`).set({
    serverId,
    deploymentId,
    state: { ...rest, logs: [], qrLogs: [] },
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function appendLogs(serverId: string, deploymentId: string, logs: DeploymentLog[]) {
  const db = getDb();
  if (!db || logs.length === 0) return;
  const ref = db.collection(COLLECTION).doc(`${serverId}__${deploymentId}`).collection('logs');
  const batch = db.batch();
  for (const log of logs) {
    const docRef = ref.doc();
    batch.set(docRef, {
      id: log.id,
      stream: log.stream,
      message: log.message,
      ts: Number.isFinite(+log.timestamp) ? +log.timestamp : Date.parse(log.timestamp) || Date.now(),
    });
  }
  await batch.commit();
}

export async function loadDeploymentState(serverId: string, deploymentId: string): Promise<BotDeployState | null> {
  const db = getDb();
  if (!db) return null;
  const key = `${serverId}__${deploymentId}`;
  const snap = await db.collection(COLLECTION).doc(key).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  const state = data.state as BotDeployState;
  // Load last 10000 logs from subcollection for strong backfill persistence
  try {
    const logsSnap = await db.collection(COLLECTION).doc(key).collection('logs')
      .orderBy('ts', 'asc')
      .limitToLast(10000)
      .get();
    const logs: DeploymentLog[] = [] as any;
    logsSnap.forEach(doc => {
      const d = doc.data();
      logs.push({ id: String(d.id || d.ts), timestamp: new Date(d.ts).toISOString(), stream: d.stream, message: d.message });
    });
    (state as any).logs = logs;
  } catch {}
  return state;
}

export async function loadLatestDeploymentForServer(serverId: string): Promise<BotDeployState | null> {
  const db = getDb();
  if (!db) return null;
  const q = await db.collection(COLLECTION)
    .where('serverId', '==', serverId)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();
  if (q.empty) return null;
  const doc = q.docs[0];
  const state = (doc.data() as any).state as BotDeployState;
  // load logs (up to 10000)
  try {
    const logsSnap = await doc.ref.collection('logs')
      .orderBy('ts', 'asc')
      .limitToLast(10000)
      .get();
    const logs: DeploymentLog[] = [] as any;
    logsSnap.forEach(d => {
      const v = d.data();
      logs.push({ id: String(v.id || v.ts), timestamp: new Date(v.ts).toISOString(), stream: v.stream, message: v.message });
    });
    (state as any).logs = logs;
  } catch {}
  return state;
}

export async function clearLogs(serverId: string, deploymentId: string) {
  const db = getDb();
  if (!db) return;
  const ref = db.collection(COLLECTION).doc(`${serverId}__${deploymentId}`).collection('logs');
  const snap = await ref.limit(500).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function deleteDeployment(serverId: string, deploymentId: string) {
  const db = getDb();
  if (!db) return;
  const key = `${serverId}__${deploymentId}`;
  // delete logs in batches
  const logsRef = db.collection(COLLECTION).doc(key).collection('logs');
  while (true) {
    const snap = await logsRef.limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await db.collection(COLLECTION).doc(key).delete().catch(() => {});
}

