import admin from 'firebase-admin';

let firestore: admin.firestore.Firestore | null = null;
let initError: Error | null = null;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    firestore = admin.firestore();
    return;
  }

  try {
    const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    let serviceAccountJson: string | undefined = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountJson && rawB64) {
      try {
        serviceAccountJson = Buffer.from(rawB64, 'base64').toString('utf8');
      } catch (e) {
        throw new Error('Failed to decode FIREBASE_SERVICE_ACCOUNT_B64.');
      }
    }

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
    }

    firestore = admin.firestore();
  } catch (e: any) {
    initError = e;
    console.error("Firebase Admin SDK initialization failed:", e);
    firestore = null;
  }
}

initializeFirebase();

export function getDb() {
  if (!firestore) {
    console.error("Firestore is not initialized. Initialization error:", initError);
  }
  return firestore;
}

export const adminAvailable = () => {
  return !!firestore;
};
