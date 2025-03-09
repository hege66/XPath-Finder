// Global variables
let isActive = false;
let highlightedElement = null;
let highlightOverlay = null;
let tooltipElement = null;

// Check if the extension can run on the current page
function canRunOnPage() {
  // Check if we're in a regular web page (not a Chrome internal page)
  if (
    window.location.protocol === "chrome:" ||
    window.location.protocol === "chrome-extension:" ||
    window.location.protocol === "about:"
  ) {
    console.log("XPath Finder: Cannot run on Chrome internal pages");
    return false;
  }

  // Check if document is accessible
  try {
    // Try to access the document
    const test = document.body;
    return true;
  } catch (error) {
    console.log("XPath Finder: Cannot access document", error);
    return false;
  }
}

// Initialize the extension
function initializeExtension() {
  console.log("XPath Finder: Content script initialized");

  // Check if we can run on this page
  if (!canRunOnPage()) {
    console.log("XPath Finder: Cannot run on this page");
    return;
  }

  // Create highlight overlay if it doesn't exist
  if (!highlightOverlay) {
    highlightOverlay = document.createElement("div");
    highlightOverlay.className = "xpath-finder-highlight";
    highlightOverlay.style.display = "none";
    document.body.appendChild(highlightOverlay);
  }

  // Create tooltip element if it doesn't exist
  if (!tooltipElement) {
    tooltipElement = document.createElement("div");
    tooltipElement.className = "xpath-finder-tooltip";
    tooltipElement.style.display = "none";
    document.body.appendChild(tooltipElement);
  }
}

// Initialize when the DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}

// Initialize message listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("XPath Finder: Received message", request.action);

  try {
    // Check if we can run on this page
    if (!canRunOnPage()) {
      sendResponse({
        success: false,
        error: "Cannot run on this page",
        canRun: false,
      });
      return true;
    }

    if (request.action === "activate") {
      activateElementSelection();
      sendResponse({
        success: true,
        message: "Element selection activated",
        canRun: true,
      });
    } else if (request.action === "deactivate") {
      deactivateElementSelection();
      sendResponse({
        success: true,
        message: "Element selection deactivated",
        canRun: true,
      });
    } else if (request.action === "getStatus") {
      sendResponse({ isActive: isActive, canRun: true });
    }
  } catch (error) {
    console.error("XPath Finder: Error handling message", error);
    sendResponse({ success: false, error: error.message, canRun: false });
  }

  return true; // Keep the message channel open for asynchronous responses
});

// Activate element selection mode
function activateElementSelection() {
  isActive = true;

  // Add crosshair cursor to body
  document.body.classList.add("xpath-finder-active");

  // Add event listeners for mouseover, mouseout and click
  document.addEventListener("mouseover", handleMouseOver);
  document.addEventListener("mouseout", handleMouseOut);
  document.addEventListener("click", handleElementClick, true);

  // Make sure the overlay and tooltip are created
  if (!highlightOverlay) {
    highlightOverlay = document.createElement("div");
    highlightOverlay.className = "xpath-finder-highlight";
    document.body.appendChild(highlightOverlay);
  }

  highlightOverlay.style.display = "none";

  if (!tooltipElement) {
    tooltipElement = document.createElement("div");
    tooltipElement.className = "xpath-finder-tooltip";
    document.body.appendChild(tooltipElement);
  }

  tooltipElement.style.display = "none";

  console.log("XPath Finder: Element selection activated");
}

// Deactivate element selection mode
function deactivateElementSelection() {
  isActive = false;

  // Remove crosshair cursor from body
  document.body.classList.remove("xpath-finder-active");

  // Remove event listeners
  document.removeEventListener("mouseover", handleMouseOver);
  document.removeEventListener("mouseout", handleMouseOut);
  document.removeEventListener("click", handleElementClick, true);

  // Hide highlight overlay
  if (highlightOverlay) {
    highlightOverlay.style.display = "none";
  }

  // Hide tooltip
  if (tooltipElement) {
    tooltipElement.style.display = "none";
  }

  // Clear highlighted element
  highlightedElement = null;
}

// Handle mouseover event
function handleMouseOver(event) {
  if (!isActive) return;

  // Update highlighted element
  highlightedElement = event.target;

  // Update highlight overlay position
  updateHighlightOverlay(highlightedElement);

  // Update tooltip
  updateTooltip(event, highlightedElement);
}

// Handle mouseout event
function handleMouseOut(event) {
  if (!isActive) return;

  // Check if mouse is leaving the document
  if (
    event.relatedTarget === null ||
    event.relatedTarget.nodeName === "HTML" ||
    !document.documentElement.contains(event.relatedTarget)
  ) {
    // Hide highlight overlay and tooltip
    if (highlightOverlay) {
      highlightOverlay.style.display = "none";
    }

    if (tooltipElement) {
      tooltipElement.style.display = "none";
    }
  }
}

// Update highlight overlay position and size
function updateHighlightOverlay(element) {
  if (!element || !highlightOverlay) return;

  try {
    const rect = element.getBoundingClientRect();

    highlightOverlay.style.display = "block";
    highlightOverlay.style.top = window.scrollY + rect.top + "px";
    highlightOverlay.style.left = window.scrollX + rect.left + "px";
    highlightOverlay.style.width = rect.width + "px";
    highlightOverlay.style.height = rect.height + "px";
  } catch (error) {
    console.error("XPath Finder: Error updating highlight overlay:", error);
    highlightOverlay.style.display = "none";
  }
}

// Update tooltip position and content
function updateTooltip(event, element) {
  if (!element || !tooltipElement) return;

  // Get element tag name and truncated XPath
  const tagName = element.tagName.toLowerCase();
  const shortXPath = getShortXPath(element);

  // Set tooltip content
  tooltipElement.textContent = `${tagName} - ${shortXPath}`;

  // Position tooltip near the cursor
  tooltipElement.style.display = "block";
  tooltipElement.style.top = event.clientY + 15 + "px";
  tooltipElement.style.left = event.clientX + 10 + "px";

  // Ensure tooltip stays within viewport
  const tooltipRect = tooltipElement.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth) {
    tooltipElement.style.left = event.clientX - tooltipRect.width - 10 + "px";
  }
  if (tooltipRect.bottom > window.innerHeight) {
    tooltipElement.style.top = event.clientY - tooltipRect.height - 10 + "px";
  }
}

// Get a short version of XPath for the tooltip
function getShortXPath(element) {
  // Try to get a short, readable XPath for the tooltip
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  // Get a short path with tag names and positions
  let path = "";
  let current = element;
  let parent = current.parentElement;
  let depth = 0;

  while (current && parent && depth < 2) {
    let position = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        position++;
      }
      sibling = sibling.previousElementSibling;
    }

    path = `/${current.tagName.toLowerCase()}[${position}]${path}`;
    current = parent;
    parent = current.parentElement;
    depth++;
  }

  return `...${path}`;
}

// Handle element click event
function handleElementClick(event) {
  if (!isActive) return;

  // Prevent default click behavior
  event.preventDefault();
  event.stopPropagation();

  // Generate XPaths for the clicked element
  const element = event.target;
  const xpaths = generateXPaths(element);

  // Store the data in a variable that can be accessed by the popup when it opens
  window.lastSelectedElementData = {
    xpaths: xpaths,
    timestamp: Date.now(),
  };

  // Send message to popup or background script
  try {
    console.log("XPath Finder: Sending element selected message");
    chrome.runtime.sendMessage(
      {
        action: "elementSelected",
        xpaths: xpaths,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          // This is expected if the popup is not open
          console.log(
            "XPath Finder: Message response error (this is normal if popup is closed):",
            chrome.runtime.lastError.message
          );
        } else if (response) {
          console.log("XPath Finder: Message sent successfully", response);
        }
      }
    );
  } catch (error) {
    console.error("XPath Finder: Error sending message:", error);
  }

  return false;
}

// Get element attributes as string
function getElementAttributes(element) {
  let attributes = "";
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes += ` ${attr.name}="${attr.value}"`;
  }
  return attributes;
}

// Generate multiple XPath expressions for an element
function generateXPaths(element) {
  const xpaths = [];

  // 1. Absolute XPath
  const absoluteXPath = getAbsoluteXPath(element);
  xpaths.push({
    type: "Absolute",
    xpath: absoluteXPath,
    description: "Complete path from the root of the document",
  });

  // 2. ID-based XPaths
  const idXPaths = getXPathsWithId(element);
  idXPaths.forEach((xpath) => {
    xpaths.push({
      type: "ID-based",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  // 3. Class-based XPaths
  const classXPaths = getXPathsWithClass(element);
  classXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Class-based",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  // 4. Attribute-based XPaths
  const attrXPaths = getXPathsWithAttributes(element);
  attrXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Attribute-based",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  // 5. Text-based XPaths
  const textXPaths = getXPathsWithText(element);
  textXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Text-based",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  // 6. Position-based XPaths
  const positionXPaths = getXPathsWithPosition(element);
  positionXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Position-based",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  // 7. Optimized XPaths
  const optimizedXPaths = getOptimizedXPaths(element);
  optimizedXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Optimized",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  return xpaths;
}

// Get absolute XPath
function getAbsoluteXPath(element) {
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  if (element === document.body) {
    return "/html/body";
  }

  let xpath = "";
  let parent = element;

  while (parent && parent !== document.body) {
    let index = 1;
    let sibling = parent.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === parent.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    xpath = `/${parent.tagName.toLowerCase()}[${index}]${xpath}`;
    parent = parent.parentElement;
  }

  return `/html/body${xpath}`;
}

// Get XPaths with ID
function getXPathsWithId(element) {
  const results = [];

  // Direct ID
  if (element.id) {
    results.push({
      xpath: `//*[@id="${element.id}"]`,
      description: "Using element's direct ID attribute",
    });

    // More specific with tag name
    results.push({
      xpath: `//${element.tagName.toLowerCase()}[@id="${element.id}"]`,
      description: "Using element's tag name and ID attribute",
    });
  }

  // Parent with ID
  let parent = element.parentElement;
  let path = "";
  let depth = 0;

  while (parent && parent !== document.body && depth < 3) {
    if (parent.id) {
      const tagPath = getRelativePathToParent(element, parent);
      results.push({
        xpath: `//*[@id="${parent.id}"]${tagPath}`,
        description: `Relative to parent with ID "${parent.id}"`,
      });
      break;
    }
    parent = parent.parentElement;
    depth++;
  }

  return results;
}

// Get XPaths with class
function getXPathsWithClass(element) {
  const results = [];

  if (element.className && typeof element.className === "string") {
    const classes = element.className.trim().split(/\s+/);

    if (classes.length > 0) {
      // Try with each individual class
      for (const cls of classes) {
        if (cls.length > 0) {
          // Check uniqueness
          const sameClassElements = document.getElementsByClassName(cls);

          results.push({
            xpath: `//*[contains(@class, "${cls}")]`,
            description: `Using class "${cls}" (matches ${sameClassElements.length} elements)`,
          });

          // More specific with tag name
          results.push({
            xpath: `//${element.tagName.toLowerCase()}[contains(@class, "${cls}")]`,
            description: `Using tag name and class "${cls}"`,
          });
        }
      }

      // Try with full class string if it has multiple classes
      if (classes.length > 1) {
        results.push({
          xpath: `//*[@class="${element.className}"]`,
          description: "Using exact class attribute match",
        });
      }
    }
  }

  return results;
}

// Get XPaths with attributes
function getXPathsWithAttributes(element) {
  const results = [];

  // Check all attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];

    // Skip id and class as they're handled separately
    if (attr.name === "id" || attr.name === "class") continue;

    if (attr.value) {
      // Exact match
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[@${attr.name}="${
          attr.value
        }"]`,
        description: `Using exact "${attr.name}" attribute`,
      });

      // Contains match for longer attributes
      if (attr.value.length > 10) {
        results.push({
          xpath: `//${element.tagName.toLowerCase()}[contains(@${
            attr.name
          }, "${attr.value.substring(0, 10)}")]`,
          description: `Using partial "${attr.name}" attribute`,
        });
      }
    }
  }

  // Special handling for common attributes

  // Name attribute
  if (element.name) {
    results.push({
      xpath: `//${element.tagName.toLowerCase()}[@name="${element.name}"]`,
      description: "Using name attribute",
    });
  }

  // Placeholder for input elements
  if (element.placeholder) {
    results.push({
      xpath: `//${element.tagName.toLowerCase()}[@placeholder="${
        element.placeholder
      }"]`,
      description: "Using placeholder attribute",
    });
  }

  // Title attribute
  if (element.title) {
    results.push({
      xpath: `//${element.tagName.toLowerCase()}[@title="${element.title}"]`,
      description: "Using title attribute",
    });
  }

  // Href for anchor tags
  if (element.tagName.toLowerCase() === "a" && element.href) {
    const hrefValue = element.getAttribute("href");
    if (hrefValue && !hrefValue.includes("javascript:")) {
      results.push({
        xpath: `//a[@href="${hrefValue}"]`,
        description: "Using href attribute",
      });

      // Partial href for long URLs
      if (hrefValue.length > 20) {
        const urlPart =
          hrefValue.split("/").pop() || hrefValue.substring(0, 15);
        results.push({
          xpath: `//a[contains(@href, "${urlPart}")]`,
          description: "Using partial href attribute",
        });
      }
    }
  }

  // Src for images
  if (element.tagName.toLowerCase() === "img" && element.src) {
    const srcValue = element.getAttribute("src");
    if (srcValue) {
      // Use the filename part of the src
      const filename = srcValue.split("/").pop().split("?")[0];
      results.push({
        xpath: `//img[contains(@src, "${filename}")]`,
        description: "Using image filename in src attribute",
      });
    }
  }

  // Type for input elements
  if (element.tagName.toLowerCase() === "input" && element.type) {
    results.push({
      xpath: `//input[@type="${element.type}"]`,
      description: "Using input type attribute",
    });
  }

  // Data attributes which are often used for testing
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (attr.name.startsWith("data-")) {
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[@${attr.name}="${
          attr.value
        }"]`,
        description: `Using "${attr.name}" data attribute`,
      });
    }
  }

  return results;
}

// Get XPaths with text content
function getXPathsWithText(element) {
  const results = [];

  // Check if element has text content
  const text = element.textContent.trim();
  if (text) {
    // For short text, use exact match
    if (text.length < 50) {
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[text()="${text}"]`,
        description: "Using exact text content match",
      });

      // Any element with this text
      results.push({
        xpath: `//*[text()="${text}"]`,
        description: "Using exact text content match (any element)",
      });
    }

    // For any length text, use contains
    if (text.length > 0) {
      // Get first few words for partial match
      const firstWords = text.split(/\s+/).slice(0, 3).join(" ");

      if (firstWords.length > 0) {
        results.push({
          xpath: `//${element.tagName.toLowerCase()}[contains(text(), "${firstWords}")]`,
          description: "Using partial text content match",
        });
      }
    }

    // For elements that might have nested elements, use normalize-space
    if (element.children.length > 0) {
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[normalize-space()="${text}"]`,
        description: "Using normalized text content (handles nested elements)",
      });
    }
  }

  return results;
}

// Get XPaths with position
function getXPathsWithPosition(element) {
  const results = [];

  // Get a relative path with position indices
  let path = "";
  let current = element;
  let parent = current.parentElement;

  // Simple position among siblings
  let position = 1;
  let sibling = element.previousElementSibling;

  while (sibling) {
    position++;
    sibling = sibling.previousElementSibling;
  }

  results.push({
    xpath: `//${element.tagName.toLowerCase()}[${position}]`,
    description: `${position}${getOrdinalSuffix(
      position
    )} ${element.tagName.toLowerCase()} child of its parent`,
  });

  // Position among siblings with same tag
  position = 1;
  sibling = element.previousElementSibling;

  while (sibling) {
    if (sibling.tagName === element.tagName) {
      position++;
    }
    sibling = sibling.previousElementSibling;
  }

  if (position > 1 || element.nextElementSibling) {
    results.push({
      xpath: `//${element.tagName.toLowerCase()}[${position}]`,
      description: `${position}${getOrdinalSuffix(
        position
      )} ${element.tagName.toLowerCase()} element among siblings`,
    });
  }

  // Relative path from parent
  if (parent && parent !== document.body) {
    const parentTag = parent.tagName.toLowerCase();

    // Position within parent
    results.push({
      xpath: `//${parentTag}/${element.tagName.toLowerCase()}[${position}]`,
      description: `Direct child of ${parentTag} element`,
    });

    // Try with parent's position too
    let parentPosition = 1;
    let parentSibling = parent.previousElementSibling;

    while (parentSibling) {
      if (parentSibling.tagName === parent.tagName) {
        parentPosition++;
      }
      parentSibling = parentSibling.previousElementSibling;
    }

    if (parentPosition > 1 || parent.nextElementSibling) {
      results.push({
        xpath: `//${parentTag}[${parentPosition}]/${element.tagName.toLowerCase()}[${position}]`,
        description: `Child of the ${parentPosition}${getOrdinalSuffix(
          parentPosition
        )} ${parentTag} element`,
      });
    }
  }

  // Go up to 3 levels for a relative path
  path = "";
  current = element;
  parent = current.parentElement;

  for (let i = 0; i < 3; i++) {
    if (!parent || parent === document.body) break;

    // Find position among siblings with same tag
    let position = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        position++;
      }
      sibling = sibling.previousElementSibling;
    }

    path = `/${current.tagName.toLowerCase()}[${position}]${path}`;
    current = parent;
    parent = current.parentElement;

    // If we've reached an element with ID, use that as anchor
    if (current.id) {
      results.push({
        xpath: `//*[@id="${current.id}"]${path}`,
        description: `Relative to ancestor with ID "${current.id}"`,
      });
      break;
    }
  }

  // If we didn't find an ID anchor, use a relative path from a unique parent
  if (path && parent && parent !== document.body) {
    results.push({
      xpath: `//body${path}`,
      description: "Relative path from body element",
    });
  }

  return results;
}

// Get optimized XPaths (shortest unique paths)
function getOptimizedXPaths(element) {
  const results = [];

  // Try to find unique combinations

  // 1. Tag + attribute combinations
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (attr.name !== "id" && attr.name !== "class") {
      const xpath = `//${element.tagName.toLowerCase()}[@${attr.name}="${
        attr.value
      }"]`;
      try {
        if (
          document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength === 1
        ) {
          results.push({
            xpath: xpath,
            description: `Unique combination of tag and ${attr.name} attribute`,
          });
        }
      } catch (e) {
        // Skip invalid XPath expressions
      }
    }
  }

  // 2. Tag + class combinations for each class
  if (element.className && typeof element.className === "string") {
    const classes = element.className.trim().split(/\s+/);
    for (const cls of classes) {
      if (cls.length > 0) {
        const xpath = `//${element.tagName.toLowerCase()}[contains(@class, "${cls}")]`;
        try {
          if (
            document.evaluate(
              xpath,
              document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            ).snapshotLength === 1
          ) {
            results.push({
              xpath: xpath,
              description: `Unique combination of tag and class "${cls}"`,
            });
          }
        } catch (e) {
          // Skip invalid XPath expressions
        }
      }
    }
  }

  // 3. Tag + text for elements with short text
  if (element.textContent && element.textContent.trim()) {
    const text = element.textContent.trim();
    if (text.length < 30) {
      const xpath = `//${element.tagName.toLowerCase()}[contains(text(), "${text}")]`;
      try {
        if (
          document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength === 1
        ) {
          results.push({
            xpath: xpath,
            description: "Unique combination of tag and text content",
          });
        }
      } catch (e) {
        // Skip invalid XPath expressions
      }
    }
  }

  // 4. Try with parent context for more uniqueness
  if (element.parentElement && element.parentElement !== document.body) {
    const parent = element.parentElement;
    const parentTag = parent.tagName.toLowerCase();

    // Position within parent
    let position = 1;
    let sibling = element.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === element.tagName) {
        position++;
      }
      sibling = sibling.previousElementSibling;
    }

    // Parent with class + child with position
    if (parent.className && typeof parent.className === "string") {
      const classes = parent.className.trim().split(/\s+/);
      for (const cls of classes) {
        if (cls.length > 0) {
          const xpath = `//${parentTag}[contains(@class, "${cls}")]/${element.tagName.toLowerCase()}[${position}]`;
          try {
            if (
              document.evaluate(
                xpath,
                document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              ).snapshotLength === 1
            ) {
              results.push({
                xpath: xpath,
                description: `Unique path using parent's class "${cls}" and position`,
              });
            }
          } catch (e) {
            // Skip invalid XPath expressions
          }
        }
      }
    }
  }

  return results;
}

// Get relative path from element to parent
function getRelativePathToParent(element, parent) {
  let path = "";
  let current = element;

  while (current && current !== parent) {
    let position = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        position++;
      }
      sibling = sibling.previousElementSibling;
    }

    path = `/${current.tagName.toLowerCase()}[${position}]${path}`;
    current = current.parentElement;
  }

  return path;
}

// Helper function to get ordinal suffix
function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
