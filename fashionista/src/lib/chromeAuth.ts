import { signInWithGoogleCredential, signOutFirebase, signInWithGooglePopup } from "./firebase";
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
  // Skip backend token exchange and use direct Google credential authentication
  // This avoids custom token mismatch issues when Firebase project is not properly configured
  try {
    const credRes = await signInWithGoogleCredential(accessToken);
    toast({ title: "Signed in", description: "Signed in with Google credential" });
    setLastAuthMethod("chrome");
    return credRes;
  } catch (e) {
    console.error("Direct credential sign-in failed:", e);
    toast({ title: "Sign-in failed", description: "Unable to sign in with Google credential" });
    throw e;
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
