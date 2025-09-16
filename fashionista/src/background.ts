
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(e => console.error(e));

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: "index.html",
    enabled: true,
  });

  // Create context menu only if the API is available (some environments may not expose it)
  if (chrome.contextMenus && typeof chrome.contextMenus.create === 'function') {
    try {
      chrome.contextMenus.create({
        id: "zyora-try-on",
        title: "Try On with ZYORA",
        contexts: ["image"]
      });
    } catch (e) {
      console.error('Failed to create context menu:', e);
    }
  } else {
    console.warn('chrome.contextMenus API is not available in this environment. Skipping context menu creation.');
  }
});

// Attach click listener only if the API exists and exposes onClicked
if (chrome.contextMenus && chrome.contextMenus.onClicked && typeof chrome.contextMenus.onClicked.addListener === 'function') {
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
} else {
  console.warn('chrome.contextMenus.onClicked is not available; click handling disabled.');
}

