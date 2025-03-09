// Background script for XPath Finder extension

// Store the last selected element data
let lastSelectedElementData = null;
let activeTabId = null;

// Listen for installation
chrome.runtime.onInstalled.addListener(function (details) {
  console.log("XPath Finder extension installed");
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(function (activeInfo) {
  // If the tab changes, deactivate the extension and clear XPath data
  if (activeTabId && activeTabId !== activeInfo.tabId) {
    deactivateExtension();
    clearXPathData();
  }
  activeTabId = activeInfo.tabId;
});

// Listen for navigation within the same tab
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // If the URL changes in the active tab, deactivate the extension and clear XPath data
  if (changeInfo.url && tabId === activeTabId) {
    deactivateExtension();
    clearXPathData();
  }
});

// Deactivate the extension
function deactivateExtension() {
  if (activeTabId) {
    try {
      chrome.tabs.sendMessage(
        activeTabId,
        { action: "deactivate" },
        function (response) {
          if (chrome.runtime.lastError) {
            console.log(
              "Error deactivating extension:",
              chrome.runtime.lastError.message
            );
          } else {
            console.log("Extension deactivated on tab change");
          }
        }
      );
    } catch (error) {
      console.error("Error sending deactivate message:", error);
    }
  }
}

// Clear XPath data
function clearXPathData() {
  lastSelectedElementData = null;
  // Notify popup to clear XPath display if it's open
  try {
    chrome.runtime.sendMessage({ action: "clearXPaths" }, function (response) {
      if (chrome.runtime.lastError) {
        // This is normal if popup is not open
        console.log("Could not clear XPaths in popup (probably not open)");
      } else {
        console.log("XPaths cleared in popup");
      }
    });
  } catch (error) {
    console.error("Error sending clearXPaths message:", error);
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Background script received message:", request);

  // Store element data when an element is selected
  if (request.action === "elementSelected") {
    lastSelectedElementData = {
      xpaths: request.xpaths,
      timestamp: Date.now(),
    };
    sendResponse({
      success: true,
      message: "Data stored in background script",
    });
    return true;
  }

  // Provide the last selected element data to the popup
  if (request.action === "getLastSelectedElement") {
    sendResponse({
      success: true,
      data: lastSelectedElementData,
    });
    return true;
  }

  // Handle error reporting
  if (request.action === "reportError") {
    console.error("XPath Finder error:", request.error);
    sendResponse({ success: true });
    return true;
  }

  // Handle page compatibility check
  if (request.action === "checkPageCompatibility") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        activeTabId = tab.id;

        // Check if this is a chrome:// page or other restricted page
        if (
          tab.url.startsWith("chrome://") ||
          tab.url.startsWith("chrome-extension://") ||
          tab.url.startsWith("about:") ||
          (tab.url.startsWith("file://") && tab.url.endsWith(".pdf"))
        ) {
          sendResponse({
            canRun: false,
            reason: "Cannot run on Chrome internal pages or PDFs",
          });
        } else {
          sendResponse({ canRun: true });
        }
      } else {
        sendResponse({
          canRun: false,
          reason: "No active tab found",
        });
      }
    });
    return true; // Keep the message channel open for asynchronous response
  }

  // Store active tab ID when extension is activated
  if (request.action === "activate") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        activeTabId = tabs[0].id;
      }
    });
  }

  // Forward messages between popup and content scripts if needed
  if (request.action === "forwardToContent") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          request.message,
          function (response) {
            if (chrome.runtime.lastError) {
              console.error(
                "Error forwarding message:",
                chrome.runtime.lastError
              );
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
            } else {
              sendResponse(response);
            }
          }
        );
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
    return true; // Keep the message channel open for asynchronous response
  }

  // Handle other messages if needed
  return false;
});
