# XPath Finder Chrome Extension

A Chrome extension that helps you select HTML elements on a webpage and generate XPath expressions for them. This is particularly useful for web automation testing, where you need to identify elements with unique and reliable XPath selectors.

## Features

- 🔍 Select any element on a webpage with a simple click
- 🌟 Highlight selected elements visually
- 🧩 Generate multiple XPath expressions for each element
- 📋 Copy XPath expressions to clipboard with one click
- 🔄 Focus on generating relative and unique XPath expressions for reliable automation testing
- 🎨 Beautiful UI with Tailwind CSS

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store (link will be provided when published)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing this extension
5. The extension should now appear in your Chrome toolbar

## How to Use

1. Click on the XPath Finder icon in your Chrome toolbar
2. Toggle the switch to activate element selection mode
3. Hover over elements on the webpage to see them highlighted
4. Click on an element to generate XPath expressions
5. View the generated XPaths in the popup
6. Click the "Copy" button next to any XPath to copy it to your clipboard
7. Toggle the switch off to deactivate element selection mode

## XPath Types Generated

The extension generates several types of XPath expressions:

1. **Absolute XPath**: Complete path from the root of the document
2. **ID-based XPath**: Uses element IDs for shorter, more reliable paths
3. **Class-based XPath**: Uses CSS classes to identify elements
4. **Attribute-based XPath**: Uses various attributes like name, placeholder, href, etc.
5. **Position-based XPath**: Uses element positions relative to siblings
6. **Optimized XPath**: Shortest unique path to the element

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `popup.html`: User interface for the extension popup
- `popup.js`: JavaScript for the popup functionality
- `content.js`: Content script that runs on webpages
- `content.css`: Styles for the element highlighting
- `images/`: Icons for the extension

### Building from Source

No build step is required. The extension uses vanilla JavaScript.

## License

MIT License

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Acknowledgements

- [Tailwind CSS](https://tailwindcss.com/) for the UI styling
