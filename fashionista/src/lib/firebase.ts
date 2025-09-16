import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential, onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { signInWithCustomToken } from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.PLASMO_PUBLIC_FIREBASE_PUBLIC_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || "__FIREBASE_API_KEY__",
  authDomain: import.meta.env.PLASMO_PUBLIC_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "__FIREBASE_AUTH_DOMAIN__",
  projectId: import.meta.env.PLASMO_PUBLIC_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID || "__FIREBASE_PROJECT_ID__",
  storageBucket: import.meta.env.PLASMO_PUBLIC_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: import.meta.env.PLASMO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: import.meta.env.PLASMO_PUBLIC_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID || "__FIREBASE_APP_ID__",
//   measurementId: import.meta.env.PLASMO_PUBLIC_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "__FIREBASE_MEASUREMENT_ID__"
};

// Initialize Firebase app (guard against double init in HMR)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig as any);

export const auth = getAuth(app as any);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app as any);

export const signOutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Firebase signOut error:", e);
  }
};

export const onAuthChanged = (cb: (user: User | null) => void) => {
  // Also set window helpers for other components to read uid or request idTokens
  const wrapped = (user: User | null) => {
    try {
      if (typeof window !== 'undefined') {
        // helper to get uid synchronously
        (window as any).__auth_uid = user?.uid || null;
        // helper to get idToken asynchronously
        (window as any).__auth_getIdToken = async () => {
          if (!auth.currentUser) return null;
          try {
            return await auth.currentUser.getIdToken();
          } catch (e) {
            return null;
          }
        };
      }
    } catch (e) {}
    cb(user);
  };
  return onAuthStateChanged(auth, wrapped);
};

export async function signInWithGoogleCredential(token: string) {
  // Firebase's GoogleAuthProvider.credential accepts (idToken?, accessToken?).
  // chrome.identity returns an OAuth2 access token (starts with "ya29.")
  // while some flows return an ID token (JWT). Detect and pass correctly.
  let idToken: string | null = null;
  let accessToken: string | null = null;

  if (!token) throw new Error("No token provided to signInWithGoogleCredential");

  // Heuristic: Google OAuth2 access tokens often start with "ya29."; ID tokens are JWTs with dots.
  if (token.startsWith("ya29.")) {
    accessToken = token;
  } else if (token.split('.').length >= 3) {
    // Looks like a JWT (id_token)
    idToken = token;
  } else {
    // Fallback — treat as access token
    accessToken = token;
  }

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  return signInWithCredential(auth, credential);
}

export async function signInWithFirebaseCustomToken(customToken: string) {
  return signInWithCustomToken(auth, customToken);
}

export async function signInWithGooglePopup() {
  // Browser fallback for dev: use Firebase popup flow when chrome.identity isn't available.
  try {
    return await signInWithPopup(auth, provider);
  } catch (err: any) {
    // Handle COOP/COEP or window closing issues in some dev setups by falling back to redirect
    console.warn("Popup sign-in failed, falling back to redirect:", err?.message || err);
    try {
      await signInWithRedirect(auth, provider);
      return;
    } catch (e) {
      console.error("Redirect sign-in also failed:", e);
      throw e;
    }
  }
}

export default app;
