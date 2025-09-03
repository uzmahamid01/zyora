
// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(e => console.error(e));

// Create a context menu for images
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

// Handle context menu click
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
