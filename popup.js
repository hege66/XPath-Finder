// UI Elements
const ui = {
  elements: {
    toggleSwitch: null,
    simpleModeSwitch: null,
    statusMessage: null,
    xpathContainer: null,
    xpathList: null,
  },

  initialize() {
    // Get DOM elements
    this.elements.toggleSwitch = document.getElementById("toggleSwitch");
    this.elements.simpleModeSwitch = document.getElementById("simpleMode");
    this.elements.statusMessage = document.getElementById("statusMessage");
    this.elements.xpathContainer = document.getElementById("xpathContainer");
    this.elements.xpathList = document.getElementById("xpathList");
  },

  showErrorState(message) {
    this.elements.statusMessage.textContent =
      message || "Cannot run on this page";
    this.elements.statusMessage.classList.add("text-red-600");
    this.elements.toggleSwitch.disabled = true;
  },

  updateStatus(isActive) {
    this.elements.toggleSwitch.checked = isActive;
    this.elements.statusMessage.textContent = isActive
      ? "Element selection is active"
      : "Element selection is inactive";

    if (isActive) {
      this.elements.statusMessage.classList.add("text-indigo-600");
      this.elements.statusMessage.classList.remove("text-red-600");
    } else {
      this.elements.statusMessage.classList.remove("text-indigo-600");
      this.elements.statusMessage.classList.remove("text-red-600");
      this.elements.xpathContainer.classList.add("hidden");
    }
  },
};

// XPath display and management
const xpathManager = {
  currentElementData: null,
  isSimpleMode: true,

  displayElementData(data) {
    this.currentElementData = data;
    ui.elements.xpathContainer.classList.remove("hidden");

    // Clear previous XPaths
    ui.elements.xpathList.innerHTML = "";

    // Check if we have empty XPaths
    if (
      !data.xpaths ||
      data.xpaths.length === 0 ||
      data.elementHasEmptyXPaths
    ) {
      this.displayEmptyXPathError(data);
      return;
    }

    // Group XPaths by type
    const xpathsByType = this.groupXPathsByType(data.xpaths);

    // Determine which types to show based on mode
    let typesToShow = this.isSimpleMode
      ? ["ID-based", "Text-based", "Optimized"]
      : Object.keys(xpathsByType);

    // Check if we have any XPaths in the simple mode categories
    if (this.isSimpleMode) {
      const hasSimpleModeXPaths = typesToShow.some(
        (type) => xpathsByType[type] && xpathsByType[type].length > 0
      );

      // If no XPaths found in simple mode, automatically switch to full mode
      if (!hasSimpleModeXPaths) {
        this.switchToFullMode(xpathsByType);
        typesToShow = Object.keys(xpathsByType);
      }
    }

    // Create XPath list with categories
    this.renderXPathCategories(typesToShow, xpathsByType);

    // Scroll to the top of the XPath list
    ui.elements.xpathList.scrollTop = 0;
  },

  displayEmptyXPathError(data) {
    // Create an error message
    const errorMessage = document.createElement("div");
    errorMessage.className =
      "text-red-600 text-sm font-medium p-2 bg-red-50 rounded-md mb-2";
    errorMessage.textContent = `无法为选中的 ${
      data.elementTag || "元素"
    } 生成XPath表达式。请尝试选择另一个元素。`;
    ui.elements.xpathList.appendChild(errorMessage);

    // Add a suggestion
    const suggestion = document.createElement("div");
    suggestion.className = "text-gray-600 text-xs p-2";
    suggestion.textContent =
      "提示：某些动态生成或特殊元素可能无法生成有效的XPath。";
    ui.elements.xpathList.appendChild(suggestion);
  },

  groupXPathsByType(xpaths) {
    const xpathsByType = {
      "ID-based": [],
      "Attribute-based": [],
      Optimized: [],
      "Text-based": [],
      "Class-based": [],
      "Position-based": [],
      Absolute: [],
    };

    // Categorize XPaths
    xpaths.forEach(function (xpathInfo) {
      if (xpathInfo.xpath) {
        const type = xpathInfo.type || "Other";
        if (xpathsByType[type]) {
          xpathsByType[type].push(xpathInfo);
        } else {
          xpathsByType["Other"] = [xpathInfo];
        }
      }
    });

    return xpathsByType;
  },

  switchToFullMode(xpathsByType) {
    console.log(
      "XPath Finder: No XPaths found in Basic Mode, switching to Full Mode"
    );

    // Update the UI to reflect the mode change
    this.isSimpleMode = false;
    ui.elements.simpleModeSwitch.checked = false;

    // Show a notification about the mode switch
    const modeChangeNotice = document.createElement("div");
    modeChangeNotice.className =
      "text-blue-600 text-xs p-2 bg-blue-50 rounded-md mb-2 notice";
    modeChangeNotice.textContent =
      "Automatically switched to Full Mode to show more XPath options";
    ui.elements.xpathList.appendChild(modeChangeNotice);
  },

  renderXPathCategories(typesToShow, xpathsByType) {
    for (const type of typesToShow) {
      const xpaths = xpathsByType[type] || [];
      if (xpaths.length > 0) {
        // Create category header
        const categoryHeader = document.createElement("div");
        categoryHeader.className =
          "text-sm font-medium text-gray-700 mt-3 mb-1";
        categoryHeader.textContent = type;
        ui.elements.xpathList.appendChild(categoryHeader);

        // Add XPaths in this category
        xpaths.forEach((xpathInfo) => {
          const xpathItem = this.createXPathItem(
            xpathInfo.xpath,
            xpathInfo.description
          );
          ui.elements.xpathList.appendChild(xpathItem);
        });
      }
    }
  },

  createXPathItem(xpath, description) {
    const xpathItem = document.createElement("div");
    xpathItem.className = "bg-gray-50 p-2 rounded border border-gray-200";

    // Create a container for the XPath content and button
    const container = document.createElement("div");
    container.className = "flex-container";

    // Create the content section (left side)
    const xpathContent = document.createElement("div");
    xpathContent.className = "flex-content";

    const xpathText = document.createElement("div");
    xpathText.className = "text-xs font-mono overflow-x-auto mb-1 xpath-text";
    xpathText.textContent = xpath;

    const xpathDescription = document.createElement("div");
    xpathDescription.className = "text-xs text-gray-500 italic";
    xpathDescription.textContent = description || "";

    // Create the button section (right side)
    const copyButton = document.createElement("button");
    copyButton.className =
      "text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors focus:outline-none copy-button";
    copyButton.style.border = "none";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () =>
      this.copyXPathToClipboard(xpath, copyButton)
    );

    // Assemble the components
    xpathContent.appendChild(xpathText);
    if (description) {
      xpathContent.appendChild(xpathDescription);
    }

    container.appendChild(xpathContent);
    container.appendChild(copyButton);
    xpathItem.appendChild(container);

    return xpathItem;
  },

  copyXPathToClipboard(xpath, copyButton) {
    navigator.clipboard.writeText(xpath).then(function () {
      const originalText = copyButton.textContent;
      copyButton.textContent = "Copied!";
      copyButton.classList.remove("bg-indigo-500");
      copyButton.classList.add("bg-green-500");
      setTimeout(function () {
        copyButton.textContent = originalText;
        copyButton.classList.remove("bg-green-500");
        copyButton.classList.add("bg-indigo-500");
      }, 1500);
    });
  },

  clearXPaths() {
    this.currentElementData = null;
    ui.elements.xpathContainer.classList.add("hidden");
    ui.elements.xpathList.innerHTML = "";
  },
};

// Communication with background script and content script
const communication = {
  checkPageCompatibility() {
    chrome.runtime.sendMessage(
      { action: "checkPageCompatibility" },
      function (response) {
        if (chrome.runtime.lastError) {
          console.error(
            "Error checking page compatibility:",
            chrome.runtime.lastError
          );
          ui.showErrorState("Error checking page compatibility");
          return;
        }

        if (!response || response.canRun === false) {
          ui.showErrorState(
            response ? response.reason : "Cannot run on this page"
          );
          return;
        }

        // Page is compatible, check if the extension is already active
        communication.checkExtensionStatus();

        // Check if there's any recently selected element data
        communication.checkForRecentElementData();
      }
    );
  },

  checkExtensionStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        try {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getStatus" },
            function (response) {
              if (chrome.runtime.lastError) {
                console.log(
                  "Error sending message:",
                  chrome.runtime.lastError.message
                );
                return;
              }

              if (response) {
                if (response.canRun === false) {
                  ui.showErrorState(
                    "Content script reports it cannot run on this page"
                  );
                  return;
                }

                if (response.isActive) {
                  ui.updateStatus(true);
                }
              }
            }
          );
        } catch (error) {
          console.log("Error sending message:", error);
        }
      }
    });
  },

  checkForRecentElementData() {
    chrome.runtime.sendMessage(
      { action: "getLastSelectedElement" },
      function (response) {
        if (chrome.runtime.lastError) {
          console.log(
            "Error getting last selected element:",
            chrome.runtime.lastError
          );
          return;
        }

        if (response && response.success && response.data) {
          if (
            (response.data.xpaths.length === 0 ||
              response.data.elementHasEmptyXPaths) &&
            ui.elements.toggleSwitch.checked
          ) {
            console.warn(
              "XPath Finder: Detected empty XPaths with active extension"
            );
            xpathManager.displayElementData(response.data);
          } else {
            xpathManager.displayElementData(response.data);
          }
        }
      }
    );
  },

  activateExtension() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        try {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "activate" },
            function (response) {
              if (chrome.runtime.lastError) {
                console.log(
                  "Error sending message:",
                  chrome.runtime.lastError.message
                );
                ui.elements.toggleSwitch.checked = false;
                ui.elements.statusMessage.textContent =
                  "Error: Cannot activate on this page";
                ui.elements.statusMessage.classList.add("text-red-600");
                return;
              }

              if (response) {
                if (response.canRun === false) {
                  ui.elements.toggleSwitch.checked = false;
                  ui.showErrorState(
                    "Content script reports it cannot run on this page"
                  );
                  return;
                }

                ui.updateStatus(true);

                // Notify background script that extension is activated
                chrome.runtime.sendMessage({ action: "activate" });
              } else {
                ui.elements.toggleSwitch.checked = false;
                ui.elements.statusMessage.textContent =
                  "Error: No response from page";
                ui.elements.statusMessage.classList.add("text-red-600");
              }
            }
          );
        } catch (error) {
          console.error("Error activating extension:", error);
          ui.elements.toggleSwitch.checked = false;
          ui.elements.statusMessage.textContent = "Error: " + error.message;
          ui.elements.statusMessage.classList.add("text-red-600");
        }
      }
    });
  },

  deactivateExtension() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        try {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "deactivate" },
            function (response) {
              if (chrome.runtime.lastError) {
                console.log(
                  "Error sending message:",
                  chrome.runtime.lastError.message
                );
                return;
              }

              ui.updateStatus(false);

              // Clear XPath data when deactivated
              chrome.runtime.sendMessage({ action: "clearXPaths" });
            }
          );
        } catch (error) {
          console.error("Error deactivating extension:", error);
        }
      }
    });
  },
};

// Event handlers
const eventHandlers = {
  setupEventListeners() {
    // Toggle extension activation
    ui.elements.toggleSwitch.addEventListener("change", function () {
      if (ui.elements.toggleSwitch.disabled) return;

      if (ui.elements.toggleSwitch.checked) {
        communication.activateExtension();
      } else {
        communication.deactivateExtension();
      }
    });

    // Toggle simple mode
    ui.elements.simpleModeSwitch.addEventListener("change", function () {
      xpathManager.isSimpleMode = ui.elements.simpleModeSwitch.checked;

      // If we have current data, redisplay it with the new mode
      if (xpathManager.currentElementData) {
        xpathManager.displayElementData(xpathManager.currentElementData);
      }
    });

    // Listen for messages from the content script
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (request.action === "elementSelected") {
        xpathManager.displayElementData(request);
        sendResponse({ success: true });
      } else if (request.action === "clearXPaths") {
        // Clear XPath display
        xpathManager.clearXPaths();
        sendResponse({ success: true });
      }
      return true;
    });
  },
};

// Initialize the popup
document.addEventListener("DOMContentLoaded", function () {
  // Initialize UI
  ui.initialize();

  // Setup event listeners
  eventHandlers.setupEventListeners();

  // Check page compatibility
  communication.checkPageCompatibility();
});
