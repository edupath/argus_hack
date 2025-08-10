import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apps = getApps();
if (!apps.length) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      credential: cert({
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        projectId: process.env.FIREBASE_PROJECT_ID,
      }),
    });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
}

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

