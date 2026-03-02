import admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors in hot-reload environments.
if (!admin.apps.length) {
  try {
    // This will use the service account from the environment variables (GOOGLE_APPLICATION_CREDENTIALS)
    // which is the standard and most secure way in Google Cloud environments.
    admin.initializeApp();
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization failed:', e);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;

export default admin;
