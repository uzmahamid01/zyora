const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
const FIREBASE_HOSTING_URL = 'https://extension--auth-firebase.web.app'; 

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(e => console.error(e));

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: "index.html",
    enabled: true,
  });

  chrome.contextMenus.create({
    id: "zyora-try-on",
    title: "Try On with ZYORA",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (
    info.menuItemId === "zyora-try-on" &&
    info.srcUrl &&
    !info.srcUrl.startsWith("data:") &&
    tab &&
    typeof tab.windowId !== "undefined" &&
    typeof tab.url !== "undefined"
  ) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(e => console.error("Error opening side panel:", e));
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "setProductImage", url: info.srcUrl, pageUrl: tab.url });
    }, 1000);
  }
});

chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  console.log("Google token:", token);
});

let creatingOffscreenDocument: Promise<void> | null = null;

async function hasOffscreenDocument(): Promise<boolean> {
  const docs = await chrome.offscreen?.hasDocument?.();
  return !!docs;
}

async function setupOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) return;

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
  } else {
    creatingOffscreenDocument = chrome.offscreen!.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen!.Reason.DOM_SCRAPING],
      justification: 'Firebase Authentication'
    });
    await creatingOffscreenDocument;
    creatingOffscreenDocument = null;
  }
}

async function getAuthFromOffscreen(): Promise<any> {
  await setupOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getAuth', target: 'offscreen' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message: any, sender, sendResponse: (response?: any) => void) => {
  if (message.action === 'signIn') {
    getAuthFromOffscreen()
      .then(user => {
        chrome.storage.local.set({ user }, () => {
          sendResponse({ user });
        });
      })
      .catch(error => {
        console.error('Authentication error:', error);
        sendResponse({ error: (error as Error).message });
      });
    return true; // Keep the message channel open
  } else if (message.action === 'signOut') {
    chrome.storage.local.remove('user', () => {
      sendResponse();
    });
    return true;
  }
});
