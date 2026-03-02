
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  "projectId": "studio-6628516125-4d93e",
  "appId": "1:854748639823:web:be6bca24b650bebb0d303a",
  "storageBucket": "studio-6628516125-4d93e.firebasestorage.app",
  "apiKey": "AIzaSyBPrJjnyytshyMXiO3GIcYsgDpC4WlYq3g",
  "authDomain": "studio-6628516125-4d93e.firebaseapp.com",
  "messagingSenderId": "854748639823"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
