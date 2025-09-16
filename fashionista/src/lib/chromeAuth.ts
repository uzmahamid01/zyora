import { signInWithGoogleCredential, signInWithFirebaseCustomToken, signOutFirebase, signInWithGooglePopup } from "./firebase";
import { toast } from "../components/hooks/use-toast";
import { setLastAuthMethod } from "./authIndicator";

// Requests an OAuth2 access token from chrome.identity and returns it
export async function getChromeAccessToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!chrome?.identity?.getAuthToken) {
      return reject(new Error("chrome.identity.getAuthToken is not available"));
    }

    chrome.identity.getAuthToken({ interactive }, (result: any) => {
      const err = chrome.runtime.lastError;
      if (err) {
        // Normalize chrome.runtime.lastError to an Error with a message
        const msg = (err && err.message) || JSON.stringify(err) || String(err);
        return reject(new Error(msg));
      }
      // result may be a string token or an object in some typings. Normalize it.
      const token: string | undefined = typeof result === "string" ? result : result?.token;
      if (!token) return reject(new Error("No token returned from chrome.identity.getAuthToken"));
      resolve(token);
    });
  });
}

export async function signInWithChrome(interactive = true) {
  let accessToken: string | null = null;
  try {
    accessToken = await getChromeAccessToken(interactive);
    setLastAuthMethod("chrome");
  } catch (e) {
    // Normalize error message for logs and toast
  const ee: any = e;
  const errMsg = ee && (ee.message || (typeof ee === "string" ? ee : JSON.stringify(ee))) || String(ee);
    console.warn("chrome.identity unavailable or token fetch failed:", errMsg);
    // If we're running inside an extension environment (chrome object present) we should not attempt
    // popup sign-in because extension pages disallow remote scripts and popups can fail due to CSP.
    // Heuristic: only treat as an extension environment if we're actually running
    // in a chrome-extension: page or if chrome.runtime.id exists (background/extension pages).
    const isExtensionPage = (typeof window !== 'undefined' && window.location && window.location.protocol === 'chrome-extension:')
      || (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && !!(chrome.runtime as any).id);

    if (isExtensionPage) {
      toast({ title: "Auth error", description: `chrome.identity unavailable: ${errMsg}. Run as installed extension.` });
      throw e;
    }

    // Otherwise (normal browser/dev), fallback to Firebase popup for dev browsers
    console.warn("Falling back to popup sign-in for dev browser.", errMsg);
    toast({ title: "Auth", description: `Falling back to popup sign-in: ${errMsg}` });
    const res = await signInWithGooglePopup();
    setLastAuthMethod("popup");
    toast({ title: "Signed in", description: "Signed in with popup" });
    return res;
  }
  // Exchange access token for a Firebase custom token via backend
  try {
  const BACKEND_URL = import.meta.env.PLASMO_PUBLIC_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Diagnostic logging to help track down "TypeError: Failed to fetch" errors
  try {
    console.debug("Attempting backend token exchange", { BACKEND_URL: BACKEND_URL.replace(/\/$/, ""), online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown' });
  } catch (logErr) {
    // ignore logging failure in some environments
  }

  const resp = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/exchange-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // explicit CORS mode to make intent clear; the backend must allow CORS for extension/browser origin
      mode: 'cors',
      body: JSON.stringify({ access_token: accessToken }),
    });

    if (!resp.ok) {
      // Fallback: try signing in directly with Google credential using the access token
      const credRes = await signInWithGoogleCredential(accessToken);
      toast({ title: "Signed in", description: "Signed in with Google credential (access token)" });
      setLastAuthMethod("chrome");
      return credRes;
    }

    const { customToken } = await resp.json();
    if (!customToken) {
      const credRes = await signInWithGoogleCredential(accessToken);
      toast({ title: "Signed in", description: "Signed in with Google credential (access token)" });
      setLastAuthMethod("chrome");
      return credRes;
    }

    const final = await signInWithFirebaseCustomToken(customToken);
    toast({ title: "Signed in", description: "Signed in via backend token exchange" });
    setLastAuthMethod("chrome");
    return final;
  } catch (e) {
    // Provide richer diagnostics to help the developer understand why fetch failed.
    console.error("Token exchange failed, attempting direct credential sign-in:", e, {
      note: 'Check that BACKEND_URL is correct and the backend is running and allowing CORS from this origin',
      BACKEND_URL: import.meta.env.PLASMO_PUBLIC_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000",
      online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
    });
    toast({ title: "Auth: token exchange failed", description: "Unable to contact backend to exchange token. Check backend URL, CORS, and that the server is running." });
    try {
      const credRes = await signInWithGoogleCredential(accessToken as string);
      toast({ title: "Signed in", description: "Signed in with Google credential (access token)" });
      setLastAuthMethod("chrome");
      return credRes;
    } catch (err) {
      toast({ title: "Sign-in failed", description: String(err) });
      throw err;
    }
  }
}

export async function signOutChrome() {
  // Remove cached token
  if (chrome?.identity?.removeCachedAuthToken) {
    try {
      // get current token then remove
      chrome.identity.getAuthToken({ interactive: false }, (result: any) => {
        if (chrome.runtime.lastError) return;
        const token: string | undefined = typeof result === "string" ? result : result?.token;
        if (!token) return;
        chrome.identity.removeCachedAuthToken({ token }, () => {
          // ignore errors
        });
      });
    } catch (e) {
      console.warn("removeCachedAuthToken failed", e);
    }
  }

  await signOutFirebase();
}
