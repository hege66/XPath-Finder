document.addEventListener("DOMContentLoaded", function () {
  const toggleSwitch = document.getElementById("toggleSwitch");
  const simpleModeSwitch = document.getElementById("simpleMode");
  const statusMessage = document.getElementById("statusMessage");
  const xpathContainer = document.getElementById("xpathContainer");
  const xpathList = document.getElementById("xpathList");

  // Current data storage
  let currentElementData = null;
  let isSimpleMode = true; // Default to simple mode

  // Custom styles for the toggle switch
  const style = document.createElement("style");
  style.textContent = `
    .toggle-checkbox:checked {
      transform: translateX(100%);
      border-color: #4f46e5;
    }
    .toggle-checkbox:checked + .toggle-label {
      background-color: #4f46e5;
    }
  `;
  document.head.appendChild(style);

  // First check if we can run on this page
  chrome.runtime.sendMessage(
    { action: "checkPageCompatibility" },
    function (response) {
      if (chrome.runtime.lastError) {
        console.error(
          "Error checking page compatibility:",
          chrome.runtime.lastError
        );
        showErrorState("Error checking page compatibility");
        return;
      }

      if (!response || response.canRun === false) {
        showErrorState(response ? response.reason : "Cannot run on this page");
        return;
      }

      // Page is compatible, check if the extension is already active
      checkExtensionStatus();

      // Check if there's any recently selected element data
      checkForRecentElementData();
    }
  );

  // Toggle simple mode
  simpleModeSwitch.addEventListener("change", function () {
    isSimpleMode = simpleModeSwitch.checked;

    // If we have current data, redisplay it with the new mode
    if (currentElementData) {
      displayElementData(currentElementData);
    }
  });

  // Check for recently selected element data from background script
  function checkForRecentElementData() {
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
          // Check if the data is recent (within the last 5 minutes)
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          if (
            response.data.timestamp &&
            response.data.timestamp > fiveMinutesAgo
          ) {
            currentElementData = response.data;
            displayElementData(response.data);
          }
        }
      }
    );
  }

  // Display element data in the popup
  function displayElementData(data) {
    currentElementData = data;
    xpathContainer.classList.remove("hidden");

    // Clear previous XPaths
    xpathList.innerHTML = "";

    // Group XPaths by type
    const xpathsByType = {
      "ID-based": [],
      "Attribute-based": [],
      "Text-based": [],
      "Class-based": [],
      "Position-based": [],
      Absolute: [],
      Optimized: [],
    };

    // Categorize XPaths
    data.xpaths.forEach(function (xpathInfo) {
      if (xpathInfo.xpath) {
        const type = xpathInfo.type || "Other";
        if (xpathsByType[type]) {
          xpathsByType[type].push(xpathInfo);
        } else {
          xpathsByType["Other"] = [xpathInfo];
        }
      }
    });

    // Determine which types to show based on mode
    const typesToShow = isSimpleMode
      ? ["ID-based", "Text-based", "Optimized"]
      : Object.keys(xpathsByType);

    // Create XPath list with categories
    for (const type of typesToShow) {
      const xpaths = xpathsByType[type] || [];
      if (xpaths.length > 0) {
        // Create category header
        const categoryHeader = document.createElement("div");
        categoryHeader.className =
          "text-sm font-medium text-gray-700 mt-3 mb-1";
        categoryHeader.textContent = type;
        xpathList.appendChild(categoryHeader);

        // Add XPaths in this category
        xpaths.forEach(function (xpathInfo) {
          const xpathItem = createXPathItem(
            xpathInfo.xpath,
            xpathInfo.description
          );
          xpathList.appendChild(xpathItem);
        });
      }
    }

    // Scroll to the top of the XPath list
    xpathList.scrollTop = 0;
  }

  function showErrorState(message) {
    statusMessage.textContent = message || "Cannot run on this page";
    statusMessage.classList.add("text-red-600");
    toggleSwitch.disabled = true;
  }

  function checkExtensionStatus() {
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
                // This is normal for pages that haven't loaded the content script yet
                // We don't show an error here, just leave the toggle in the default state
                return;
              }

              if (response) {
                if (response.canRun === false) {
                  showErrorState(
                    "Content script reports it cannot run on this page"
                  );
                  return;
                }

                if (response.isActive) {
                  toggleSwitch.checked = true;
                  statusMessage.textContent = "Element selection is active";
                  statusMessage.classList.add("text-indigo-600");
                }
              }
            }
          );
        } catch (error) {
          console.log("Error sending message:", error);
          // Don't show an error, just leave the toggle in the default state
        }
      }
    });
  }

  // Toggle the element selection mode
  toggleSwitch.addEventListener("change", function () {
    if (toggleSwitch.disabled) return;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        try {
          if (toggleSwitch.checked) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "activate" },
              function (response) {
                if (chrome.runtime.lastError) {
                  console.log(
                    "Error sending message:",
                    chrome.runtime.lastError.message
                  );
                  toggleSwitch.checked = false;
                  statusMessage.textContent =
                    "Error: Cannot activate on this page";
                  statusMessage.classList.add("text-red-600");
                  return;
                }

                if (response) {
                  if (response.canRun === false) {
                    toggleSwitch.checked = false;
                    showErrorState(
                      "Content script reports it cannot run on this page"
                    );
                    return;
                  }

                  statusMessage.textContent = "Element selection is active";
                  statusMessage.classList.add("text-indigo-600");
                  statusMessage.classList.remove("text-red-600");

                  // Notify background script that extension is activated
                  chrome.runtime.sendMessage({ action: "activate" });
                } else {
                  toggleSwitch.checked = false;
                  statusMessage.textContent = "Error: No response from page";
                  statusMessage.classList.add("text-red-600");
                }
              }
            );
          } else {
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

                statusMessage.textContent = "Element selection is inactive";
                statusMessage.classList.remove("text-indigo-600");
                statusMessage.classList.remove("text-red-600");
                xpathContainer.classList.add("hidden");
              }
            );
          }
        } catch (error) {
          console.log("Error sending message:", error);
          toggleSwitch.checked = false;
          statusMessage.textContent = "Error: Cannot activate on this page";
          statusMessage.classList.add("text-red-600");
        }
      }
    });
  });

  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "elementSelected") {
      displayElementData(request);
      sendResponse({ success: true });
    } else if (request.action === "clearXPaths") {
      // Clear XPath display
      currentElementData = null;
      xpathContainer.classList.add("hidden");
      xpathList.innerHTML = "";
      sendResponse({ success: true });
    }
    return true;
  });

  // Create an XPath item with copy button
  function createXPathItem(xpath, description) {
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
    copyButton.addEventListener("click", function () {
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
    });

    // Assemble the components
    xpathContent.appendChild(xpathText);
    if (description) {
      xpathContent.appendChild(xpathDescription);
    }

    container.appendChild(xpathContent);
    container.appendChild(copyButton);
    xpathItem.appendChild(container);

    return xpathItem;
  }
});
