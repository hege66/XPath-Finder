// Global variables
let isActive = false;
let highlightedElement = null;
let highlightOverlay = null;
let tooltipElement = null;
const excludedAttributes = [
  "id",
  "class",
  "style",
  "href",
  "target",
  "onclick",
];

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

  // Check if we're in an iframe
  const isInIframe = window !== window.top;

  // If we're in the main document, create the UI elements
  if (!isInIframe) {
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

  // If we're in an iframe, we don't need to create UI elements
  // as they will be created in the main document
  if (isInIframe) {
    console.log("XPath Finder: Initialized in iframe");
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
  if (isActive) return;
  isActive = true;

  // Add crosshair cursor to body
  document.body.classList.add("xpath-finder-active");

  console.log("XPath Finder: Element selection activated");

  // Add event listeners to the document
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleElementClick, true);

  // Add event listeners to all accessible iframes
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    try {
      // This will throw an error for cross-origin iframes
      const iframeDoc = iframe.contentDocument;

      // Add event listeners to the iframe document
      iframeDoc.addEventListener("mouseover", handleMouseOver, true);
      iframeDoc.addEventListener("mouseout", handleMouseOut, true);
      iframeDoc.addEventListener("click", handleElementClick, true);

      console.log("XPath Finder: Added event listeners to iframe", iframe.src);
    } catch (error) {
      // Cross-origin iframe, can't access contentDocument
      console.log("XPath Finder: Cannot access iframe", iframe.src);
    }
  });

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
}

// Deactivate element selection mode
function deactivateElementSelection() {
  if (!isActive) return;
  isActive = false;

  // Remove crosshair cursor from body
  document.body.classList.remove("xpath-finder-active");

  console.log("XPath Finder: Element selection deactivated");

  // Remove event listeners from the document
  document.removeEventListener("mouseover", handleMouseOver, true);
  document.removeEventListener("mouseout", handleMouseOut, true);
  document.removeEventListener("click", handleElementClick, true);

  // Remove event listeners from all accessible iframes
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    try {
      // This will throw an error for cross-origin iframes
      const iframeDoc = iframe.contentDocument;

      // Remove event listeners from the iframe document
      iframeDoc.removeEventListener("mouseover", handleMouseOver, true);
      iframeDoc.removeEventListener("mouseout", handleMouseOut, true);
      iframeDoc.removeEventListener("click", handleElementClick, true);
    } catch (error) {
      // Cross-origin iframe, can't access contentDocument
    }
  });

  // Hide the highlight overlay and tooltip
  if (highlightOverlay) {
    highlightOverlay.style.display = "none";
  }

  // Hide tooltip
  if (tooltipElement) {
    tooltipElement.style.display = "none";
  }

  // Clear the highlighted element
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

    // For elements in iframes, we need to adjust the position
    if (isElementInIframe(element)) {
      // Find the iframe that contains this element
      const elementDocument = element.ownerDocument;
      const iframes = document.querySelectorAll("iframe");

      for (let i = 0; i < iframes.length; i++) {
        try {
          if (iframes[i].contentDocument === elementDocument) {
            // Found the iframe, now adjust the position
            const iframeRect = iframes[i].getBoundingClientRect();

            highlightOverlay.style.display = "block";
            highlightOverlay.style.top =
              window.scrollY + iframeRect.top + rect.top + "px";
            highlightOverlay.style.left =
              window.scrollX + iframeRect.left + rect.left + "px";
            highlightOverlay.style.width = rect.width + "px";
            highlightOverlay.style.height = rect.height + "px";
            return;
          }
        } catch (e) {
          // Cross-origin iframe, can't access contentDocument
          continue;
        }
      }

      // If we can't find the iframe, hide the overlay
      highlightOverlay.style.display = "none";
      return;
    }

    // Regular handling for elements in the main document
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

  // For elements in iframes, we need to adjust the position
  if (isElementInIframe(element)) {
    // Find the iframe that contains this element
    const elementDocument = element.ownerDocument;
    const iframes = document.querySelectorAll("iframe");

    for (let i = 0; i < iframes.length; i++) {
      try {
        if (iframes[i].contentDocument === elementDocument) {
          // Found the iframe, now adjust the position
          const iframeRect = iframes[i].getBoundingClientRect();

          tooltipElement.style.top = iframeRect.top + event.clientY + 15 + "px";
          tooltipElement.style.left =
            iframeRect.left + event.clientX + 10 + "px";
          break;
        }
      } catch (e) {
        // Cross-origin iframe, can't access contentDocument
        continue;
      }
    }
  } else {
    // Regular handling for elements in the main document
    tooltipElement.style.top = event.clientY + 15 + "px";
    tooltipElement.style.left = event.clientX + 10 + "px";
  }

  // Ensure tooltip stays within viewport
  const tooltipRect = tooltipElement.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth) {
    tooltipElement.style.left =
      window.innerWidth - tooltipRect.width - 10 + "px";
  }
  if (tooltipRect.bottom > window.innerHeight) {
    tooltipElement.style.top = event.clientY - tooltipRect.height - 10 + "px";
  }
}

// Get a short version of XPath for the tooltip
function getShortXPath(element) {
  // Check if element is inside an iframe
  const isInIframe = isElementInIframe(element);

  // Try to get a short, readable XPath for the tooltip
  if (element.id) {
    if (isInIframe) {
      // For elements with ID inside iframe, include a simplified iframe indicator
      return `iframe → //*[@id="${element.id}"]`;
    }
    return `//*[@id="${element.id}"]`;
  }

  // Check for direct text content
  const directText = getDirectTextContent(element);
  if (directText && directText.length > 0 && directText.length < 30) {
    // Use direct text content if it's short enough
    if (isInIframe) {
      return `iframe → //${element.tagName.toLowerCase()}[text()="${directText}"]`;
    }
    return `//${element.tagName.toLowerCase()}[text()="${directText}"]`;
  }

  // Special handling for SELECT elements
  if (element.tagName === "SELECT") {
    // If it has a name attribute, use that
    if (element.name) {
      if (isInIframe) {
        return `iframe → //select[@name="${element.name}"]`;
      }
      return `//select[@name="${element.name}"]`;
    }

    // If it has a first option with text, use that
    if (
      element.options &&
      element.options.length > 0 &&
      element.options[0].text
    ) {
      if (isInIframe) {
        return `iframe → //option[text()="${element.options[0].text}"]/parent::select`;
      }
      return `//option[text()="${element.options[0].text}"]/parent::select`;
    }
  }

  // Get a short path with tag names and positions
  let path = "";
  let current = element;
  let parent = current.parentElement;
  let depth = 0;

  // Get the document that contains this element
  const elementDocument = element.ownerDocument;

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

  if (isInIframe) {
    return `iframe → ...${path}`;
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

  // Get the count of XPath expressions
  const xpathCount = xpaths.length;

  // Log if no XPaths were generated
  if (xpathCount === 0) {
    console.warn(
      "XPath Finder: No XPaths were generated for the element",
      element
    );
  }

  // Send message to popup or background script
  try {
    console.log("XPath Finder: Sending element selected message");
    chrome.runtime.sendMessage(
      {
        action: "elementSelected",
        xpaths: xpaths,
        xpathCount: xpathCount,
        elementTag: element.tagName.toLowerCase(),
        elementHasEmptyXPaths: xpathCount === 0,
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

  // 5. Optimized XPaths (moved up from position 7 to position 5)
  const optimizedXPaths = getOptimizedXPaths(element);
  optimizedXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Optimized",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  // 6. Text-based XPaths
  const textXPaths = getXPathsWithText(element);
  textXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Text-based",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  // 7. Position-based XPaths
  const positionXPaths = getXPathsWithPosition(element);
  positionXPaths.forEach((xpath) => {
    xpaths.push({
      type: "Position-based",
      xpath: xpath.xpath,
      description: xpath.description,
    });
  });

  return xpaths;
}

// Check if element is inside an iframe
function isElementInIframe(element) {
  try {
    return element.ownerDocument !== document;
  } catch (e) {
    return false;
  }
}

// Get iframe path for an element
function getIframePath(element) {
  try {
    // Find the iframe that contains this element
    const elementDocument = element.ownerDocument;
    const iframes = document.querySelectorAll("iframe");

    for (let i = 0; i < iframes.length; i++) {
      try {
        if (iframes[i].contentDocument === elementDocument) {
          // Found the iframe, now get its XPath
          const iframeXPath = getAbsoluteXPath(iframes[i]);
          return iframeXPath;
        }
      } catch (e) {
        // Cross-origin iframe, can't access contentDocument
        continue;
      }
    }

    // If we can't find the iframe (might be nested), return a placeholder
    return "//iframe";
  } catch (e) {
    console.error("Error getting iframe path:", e);
    return "//iframe";
  }
}

// Get absolute XPath
function getAbsoluteXPath(element) {
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  // Check if element is inside an iframe
  const isInIframe = isElementInIframe(element);

  // If in iframe, we need to handle differently
  if (isInIframe) {
    // Get the document that contains this element
    const elementDocument = element.ownerDocument;

    if (element === elementDocument.body) {
      // If it's the body of the iframe document
      return getIframePath(element) + "/html/body";
    }

    let xpath = "";
    let parent = element;

    while (parent && parent !== elementDocument.body) {
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

    // Combine iframe path with element path
    return getIframePath(element) + "/html/body" + xpath;
  }

  // Regular handling for elements in the main document
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

    // Skip id, class, style, href, target, and onclick as they're handled separately or unstable
    if (excludedAttributes.includes(attr.name)) continue;

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

  // Special handling for SELECT elements
  if (element.tagName === "SELECT") {
    // Try to find a good option-based XPath
    if (element.options && element.options.length > 0) {
      // Use the first option text which is often a placeholder like "Select country"
      const firstOption = element.options[0];
      if (firstOption && firstOption.text) {
        results.push({
          xpath: `//option[text()="${firstOption.text}"]/parent::select`,
          description: "Using first option text",
        });
      }

      // Count the number of options
      results.push({
        xpath: `//select[count(option)=${element.options.length}]`,
        description: `Using count of options (${element.options.length})`,
      });
    }

    // Try to find a label that's associated with this select
    if (element.id) {
      results.push({
        xpath: `//select[@id="${element.id}"]`,
        description: "Using select ID attribute",
      });

      results.push({
        xpath: `//label[@for="${element.id}"]/following-sibling::select`,
        description: "Using associated label element",
      });
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
      if (attr.name !== "data-target") {
        results.push({
          xpath: `//${element.tagName.toLowerCase()}[@${attr.name}="${
            attr.value
          }"]`,
          description: `Using "${attr.name}" data attribute`,
        });
      }
    }
  }

  return results;
}

// Get direct text content of an element (excluding child element text)
function getDirectTextContent(element) {
  let text = "";

  // Iterate through child nodes
  for (let i = 0; i < element.childNodes.length; i++) {
    // Only include text nodes (nodeType 3)
    if (element.childNodes[i].nodeType === 3) {
      text += element.childNodes[i].textContent;
    }
  }

  return text.trim();
}

// Get XPaths with text content
function getXPathsWithText(element) {
  const results = [];

  // Special handling for SELECT elements - don't use their option text
  if (element.tagName === "SELECT") {
    // For select elements, we can use the label or placeholder text if available
    const labelText =
      element.getAttribute("aria-label") || element.getAttribute("placeholder");

    if (labelText) {
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[@aria-label="${labelText}"]`,
        description: "Using select element's aria-label",
      });

      results.push({
        xpath: `//${element.tagName.toLowerCase()}[@placeholder="${labelText}"]`,
        description: "Using select element's placeholder",
      });
    }

    // We can also try to find a label element that references this select
    if (element.id) {
      results.push({
        xpath: `//label[@for="${element.id}"]/following-sibling::select`,
        description: "Using associated label element",
      });
    }

    // Use the first option text if available
    if (
      element.options &&
      element.options.length > 0 &&
      element.options[0].text
    ) {
      results.push({
        xpath: `//option[text()="${element.options[0].text}"]/parent::select`,
        description: "Using first option text",
      });
    }

    return results;
  }

  // For non-select elements, proceed with normal text-based XPath generation
  // Get only the direct text content (excluding child elements)
  const directText = getDirectTextContent(element);

  if (directText && directText.length > 0) {
    // For short text, use exact match
    if (directText.length < 50) {
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[text()="${directText}"]`,
        description: "Using exact direct text content match",
      });
    }

    // For any length text, use contains
    // Get first few words for partial match
    const firstWords = directText.split(/\s+/).slice(0, 3).join(" ");

    if (firstWords.length > 0) {
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[contains(text(), "${firstWords}")]`,
        description: "Using partial direct text content match",
      });
    }
  }

  // If no direct text was found but the element has text in child elements,
  // add a comment to explain why no text-based XPaths were generated
  if (directText.length === 0 && element.textContent.trim().length > 0) {
    console.log(
      "XPath Finder: Element has text in child elements but no direct text content"
    );
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
    if (!excludedAttributes.includes(attr.name)) {
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
  const directText = getDirectTextContent(element);
  if (directText && directText.length > 0) {
    if (directText.length < 30) {
      const xpath = `//${element.tagName.toLowerCase()}[text()="${directText}"]`;
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
            description: "Unique combination of tag and direct text content",
          });
        }
      } catch (e) {
        // Skip invalid XPath expressions
      }

      // Also try with contains for more flexibility
      const containsXpath = `//${element.tagName.toLowerCase()}[contains(text(), "${directText}")]`;
      try {
        if (
          document.evaluate(
            containsXpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          ).snapshotLength === 1 &&
          !results.some((r) => r.xpath === xpath) // Don't add if exact match already added
        ) {
          results.push({
            xpath: containsXpath,
            description:
              "Unique combination of tag and partial direct text content",
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
