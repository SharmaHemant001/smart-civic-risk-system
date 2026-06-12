import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup as firebaseSignInWithPopup } from "firebase/auth";

const isConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let auth = null;
let googleProvider = null;

if (isConfigured) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

// Simulated wrapper for Google Sign-In (handles mock fallback automatically)
export const signInWithGoogle = async () => {
  if (isConfigured && auth && googleProvider) {
    try {
      const result = await firebaseSignInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      return {
        token,
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        }
      };
    } catch (err) {
      console.error("Firebase Auth Error, failing back:", err);
      throw err;
    }
  } else {
    // Fallback simulated Google login
    console.log("⚠️ Firebase API key missing. Using simulated Google Auth fallback.");
    return {
      token: "mock-google-id-token",
      user: {
        uid: "mock-google-uid-judge",
        email: "google-judge@civicguard.gov",
        displayName: "Demo Google User",
        photoURL: "",
      }
    };
  }
};

export { auth, googleProvider };
