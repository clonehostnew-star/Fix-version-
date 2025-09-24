// Safe Firebase Admin initialization for server actions.
// Returns null Firestore if credentials are unavailable.

let firestore: import('firebase-admin/firestore').Firestore | null = null;
let initialized = false;

function tryInit() {
  if (initialized) return;
  initialized = true;
  try {
    // Avoid static imports to prevent bundlers from requiring admin on client
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req: any = (0, eval)('require');
    const adminApp = req('firebase-admin/app');
    const adminFirestore = req('firebase-admin/firestore');

    const apps = adminApp.getApps ? adminApp.getApps() : [];
    if (!apps || apps.length === 0) {
      const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
      let rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;

      // Decode base64 if provided
      if (!rawJson && rawB64) {
        try { rawJson = Buffer.from(rawB64, 'base64').toString('utf8'); } catch {}
      }

      if (rawJson) {
        // Trim surrounding quotes from env (common in .env) and normalize newlines in private_key
        let cleaned = rawJson.trim();
        if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
          cleaned = cleaned.slice(1, -1);
        }
        const creds = JSON.parse(cleaned);
        if (creds.private_key && typeof creds.private_key === 'string') {
          // Convert escaped \n to actual newlines
          creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }
        adminApp.initializeApp({ credential: adminApp.cert(creds) });
      } else {
        // Use application default credentials when available
        try {
          adminApp.initializeApp({ credential: adminApp.applicationDefault() });
        } catch (_e) {
          // fallback no credentials
          adminApp.initializeApp();
        }
      }
    }
    firestore = adminFirestore.getFirestore();
  } catch (_err) {
    firestore = null;
  }
}

export function getDb() {
  tryInit();
  return firestore;
}

export const adminAvailable = () => {
  tryInit();
  return !!firestore;
};

