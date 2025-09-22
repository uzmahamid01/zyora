import { 
  signInWithGoogleCredential, 
  signOutFirebase, 
  signInWithGooglePopup 
} from "./firebase";
import { toast } from "../components/hooks/use-toast";
import { setLastAuthMethod } from "./authIndicator";

/**
 * Requests an OAuth2 access token from chrome.identity
 */
export async function getChromeAccessToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!chrome?.identity?.getAuthToken) {
      return reject(new Error("chrome.identity.getAuthToken is not available"));
    }

    chrome.identity.getAuthToken({ interactive }, (result: any) => {
      const err = chrome.runtime.lastError;
      if (err) {
        const msg = err.message || JSON.stringify(err) || String(err);
        return reject(new Error(msg));
      }

      const token = typeof result === "string" ? result : result?.token;
      if (!token) return reject(new Error("No token returned from chrome.identity.getAuthToken"));

      resolve(token);
    });
  });
}

export async function signInWithChrome(interactive = true) {
  try {
    const accessToken = await getChromeAccessToken(interactive);
    setLastAuthMethod("chrome");

    // Use direct Google credential authentication
    const credRes = await signInWithGoogleCredential(accessToken);
    toast({ title: "Signed in", description: "Signed in with Google credential" });
    return credRes;

  } catch (error) {
    const errMsg = 
      (error as any)?.message || 
      (typeof error === "string" ? error : JSON.stringify(error)) || 
      String(error);

    console.warn("chrome.identity unavailable or token fetch failed:", errMsg);

    const isExtensionPage =
      (typeof window !== "undefined" && window.location?.protocol === "chrome-extension:") ||
      (typeof chrome !== "undefined" && !!chrome.runtime?.id);

    if (isExtensionPage) {
      toast({ title: "Auth error", description: `chrome.identity unavailable: ${errMsg}. Run as installed extension.` });
      throw error;
    }

    // Fallback to Firebase popup for normal browsers
    console.warn("Falling back to popup sign-in for dev browser:", errMsg);
    toast({ title: "Auth", description: `Falling back to popup sign-in: ${errMsg}` });

    const res = await signInWithGooglePopup();
    setLastAuthMethod("popup");
    toast({ title: "Signed in", description: "Signed in with popup" });
    return res;
  }
}

export async function signOutChrome() {
  if (chrome?.identity?.removeCachedAuthToken) {
    try {
      chrome.identity.getAuthToken({ interactive: false }, (result: any) => {
        if (chrome.runtime.lastError) return;

        const token = typeof result === "string" ? result : result?.token;
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
