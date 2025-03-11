// Core state management
const state = {
  activeTabId: null,
};

// Storage operations
const storage = {
  async save(data) {
    await chrome.storage.local.set({ lastEleKey: data });
  },
  async clear() {
    await chrome.storage.local.remove("lastEleKey");
  },
  async get() {
    const { lastEleKey } = await chrome.storage.local.get("lastEleKey");
    return lastEleKey;
  },
};

// Badge operations
const badge = {
  set(count) {
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : "" });
    chrome.action.setBadgeBackgroundColor({
      color: count > 0 ? "#4F46E5" : "#EF4444",
    });
  },
  clear() {
    chrome.action.setBadgeText({ text: "" });
  },
};

// Extension state management
const extension = {
    await storage.clear();
    badge.clear();
	console.log("cleaer")
    try {
      chrome.runtime.sendMessage({ action: "clearXPaths" });
    } catch (error) {
      console.log("Popup not available");
    }
  },

  async deactivate() {
    if (!state.activeTabId) return;
    try {
      await chrome.tabs.sendMessage(state.activeTabId, {
        action: "deactivate",
      });
      await extension.clear();
    } catch (error) {
    }
  },
};

// Message handlers
const handlers = {
  async elementSelected(request, sendResponse) {
    let lastSelectedElementData = {
      xpaths: request.xpaths,
      elementTag: request.elementTag,
      elementHasEmptyXPaths: request.elementHasEmptyXPaths,
    };
    await storage.save(lastSelectedElementData);
    badge.set(request.xpathCount || 0);
    sendResponse({ success: true });
  },

  async getLastSelectedElement(_, sendResponse) {
    sendResponse({ success: true, data: await storage.get() });
  },

  async clearXPaths(_, sendResponse) {
    await extension.clear();
    sendResponse({ success: true });
  },

  async checkPageCompatibility(_, sendResponse) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.length) {
      return sendResponse({ canRun: false, reason: "No active tab" });
    }

    state.activeTabId = tabs[0].id;
    const isRestricted =
      /^(chrome|chrome-extension|about):/.test(tabs[0].url) ||
      (tabs[0].url.startsWith("file://") && tabs[0].url.endsWith(".pdf"));

    sendResponse({
      canRun: !isRestricted,
      reason: isRestricted ? "Cannot run on this page" : null,
    });
  },

  async activate() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs?.length) {
      state.activeTabId = tabs[0].id;
    }
  },
};

// Event listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log("XPath Finder installed");
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (state.activeTabId && state.activeTabId !== tabId) {
    await extension.deactivate();
  }
  state.activeTabId = tabId;
});

chrome.tabs.onUpdated.addListener(async ({ tabId }) => {
	await extension.deactivate();
});

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  const handler = handlers[request.action];
  if (handler) {
    handler(request, sendResponse).catch((error) => {
      console.error(`${request.action} error:`, error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  return false;
});
