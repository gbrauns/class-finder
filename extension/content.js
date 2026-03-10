let tooltip = null;
let currentElement = null;
let extensionEnabled = false; // Default to disabled (OFF)
let currentTabId = null;
let currentMode = 'content'; // 'copy' or 'content' - Default to Mark Content
let contentClasses = new Set(); // Classes marked as content
let markedElements = []; // Elements marked as content
let disableLinks = true; // Default to true (links disabled)

// Get current tab ID and load saved mode
chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
    console.log('Content script loaded');
});

// Try to load saved mode for this tab (if available)
// Note: We can't get our own tab ID directly, so we'll wait for messages from popup
setTimeout(() => {
    // This is a fallback - actual mode will be set when popup opens
    console.log('Current mode:', currentMode);
}, 100);

// Create tooltip element
function createTooltip() {
    if (tooltip) return;

    tooltip = document.createElement('div');
    tooltip.id = 'css-class-finder-tooltip';
    document.body.appendChild(tooltip);
}

// Show tooltip with copy feedback
function showTooltip(element, x, y) {
    if (!tooltip) return;

    const classes = getClosestClasses(element);

    if (classes) {
        // Copy to clipboard
        copyToClipboard(classes);

        // Notify popup about copied class
        chrome.runtime.sendMessage({
            action: 'classCopied',
            className: classes
        }).catch(() => {
            // Popup might not be open, that's okay
        });

        // Show tooltip with copied confirmation
        tooltip.innerHTML = `
            <div style="margin-bottom: 4px;">
                <strong style="color: #4CAF50;">✓ Nokopēts!</strong>
            </div>
            <div style="font-family: 'Courier New', monospace; word-break: break-all;">
                ${classes}
            </div>
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = x + 10 + 'px';
        tooltip.style.top = y + 10 + 'px';

        // Hide after 2 seconds
        setTimeout(() => {
            tooltip.style.display = 'none';
        }, 2000);
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    // Create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        console.log('✓ Copied to clipboard:', text);
    } catch (err) {
        console.error('Failed to copy:', err);
    }

    document.body.removeChild(textarea);
}

// Get closest element with classes (starting from clicked element)
function getClosestClasses(element) {
    let current = element;

    while (current && current !== document.body) {
        if (current.className && typeof current.className === 'string' && current.className.trim()) {
            // Return first match (closest to clicked element)
            return current.className.trim();
        }
        current = current.parentElement;
    }

    return null;
}

// Highlight element temporarily (copy mode)
function highlightElement(element) {
    // Remove previous highlight
    if (currentElement) {
        currentElement.style.outline = '';
        currentElement.style.backgroundColor = '';
    }

    // Add new highlight
    element.style.outline = '3px solid #667eea';
    element.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
    currentElement = element;

    // Remove highlight after 2 seconds
    setTimeout(() => {
        if (currentElement === element) {
            element.style.outline = '';
            element.style.backgroundColor = '';
            currentElement = null;
        }
    }, 2000);
}

// Mark element as content (content mode)
function markAsContent(element, classes) {
    // Add permanent green highlight with !important to prevent override
    element.style.setProperty('outline', '3px solid #4CAF50', 'important');
    element.style.setProperty('background-color', 'rgba(76, 175, 80, 0.15)', 'important');
    element.setAttribute('data-content-marked', 'true');

    // Store element and its classes
    markedElements.push(element);
    if (classes) {
        classes.split(' ').forEach(cls => {
            if (cls.trim()) {
                contentClasses.add(cls.trim());
            }
        });
    }

    console.log('Marked as content:', classes);
    console.log('Total content classes:', contentClasses.size);

    // Save marked elements to session storage
    saveMarkedElements();
}

// Save marked elements to storage
function saveMarkedElements() {
    const markedData = markedElements.map(el => {
        return {
            xpath: getXPath(el),
            classes: el.className
        };
    });

    chrome.storage.local.set({
        [`marked_${window.location.href}`]: markedData
    });

    console.log('Saved', markedData.length, 'marked elements');
}

// Get XPath for element
function getXPath(element) {
    if (element.id !== '') {
        return 'id("' + element.id + '")';
    }
    if (element === document.body) {
        return element.tagName;
    }

    let ix = 0;
    const siblings = element.parentNode.childNodes;
    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
            return getXPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }
}

// Restore marked elements from storage
function restoreMarkedElements() {
    chrome.storage.local.get([`marked_${window.location.href}`], (result) => {
        const markedData = result[`marked_${window.location.href}`];
        if (!markedData || markedData.length === 0) {
            console.log('No marked elements to restore');
            return;
        }

        console.log('Restoring', markedData.length, 'marked elements');

        markedData.forEach(data => {
            try {
                const el = document.evaluate(data.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (el) {
                    el.style.setProperty('outline', '3px solid #4CAF50', 'important');
                    el.style.setProperty('background-color', 'rgba(76, 175, 80, 0.15)', 'important');
                    el.setAttribute('data-content-marked', 'true');
                    markedElements.push(el);

                    // Restore classes
                    if (data.classes) {
                        data.classes.split(' ').forEach(cls => {
                            if (cls.trim()) {
                                contentClasses.add(cls.trim());
                            }
                        });
                    }
                }
            } catch (e) {
                console.error('Failed to restore element:', e);
            }
        });

        console.log('Restored', markedElements.length, 'elements');
    });
}

// Clear all marked content
function clearMarkedContent() {
    markedElements.forEach(el => {
        el.style.removeProperty('outline');
        el.style.removeProperty('background-color');
        el.removeAttribute('data-content-marked');
    });
    markedElements = [];
    contentClasses.clear();

    // Clear from storage
    chrome.storage.local.remove([`marked_${window.location.href}`]);

    console.log('Cleared all marked content');
}

// Generate ignore list as CSS selectors
function generateIgnoreList() {
    // Recalculate content classes from currently marked elements AND their ancestors
    contentClasses.clear();

    markedElements.forEach(el => {
        // Add classes from marked element
        if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(cls => {
                if (cls.trim()) {
                    contentClasses.add(cls.trim());
                }
            });
        }

        // Add classes from ALL parent elements (ancestors) up to body
        let parent = el.parentElement;
        while (parent && parent !== document.body && parent !== document.documentElement) {
            if (parent.className && typeof parent.className === 'string') {
                parent.className.split(' ').forEach(cls => {
                    if (cls.trim()) {
                        contentClasses.add(cls.trim());
                    }
                });
            }
            parent = parent.parentElement;
        }
    });

    const selectors = [];

    // Add common HTML tags to ignore
    const commonTags = ['style', 'script', 'noscript', 'header', 'footer', 'nav', 'aside', 'iframe'];
    selectors.push(...commonTags);

    // Keywords for unwanted sections
    const ignoreKeywords = [
        'menu', 'nav', 'navigation', 'navbar',
        'header', 'footer', 'sidebar', 'aside',
        'social', 'share', 'newsletter', 'subscribe',
        'cookie', 'consent', 'banner', 'popup',
        'breadcrumb', 'pagination', 'carousel',
        'modal', 'overlay', 'tooltip',
        'cart', 'checkout', 'search',
        'widget', 'advertisement', 'ad-'
    ];

    // Find all classes on the page
    const allClasses = new Set();
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(cls => {
                if (cls.trim()) {
                    allClasses.add(cls.trim());
                }
            });
        }
        // Also collect IDs
        if (el.id && el.id.trim()) {
            allClasses.add('#' + el.id.trim());
        }
    });

    // Filter classes: include only if NOT in contentClasses AND matches ignore keywords
    allClasses.forEach(cls => {
        const isId = cls.startsWith('#');
        const classNameToCheck = isId ? cls.substring(1).toLowerCase() : cls.toLowerCase();

        // Skip if this is a content class
        if (!isId && contentClasses.has(cls)) {
            return;
        }

        // Check if class matches any ignore keyword
        const matchesKeyword = ignoreKeywords.some(keyword =>
            classNameToCheck.includes(keyword)
        );

        if (matchesKeyword) {
            selectors.push(isId ? cls : `.${cls}`);
        }
    });

    // Sort and deduplicate
    const uniqueSelectors = [...new Set(selectors)].sort();

    console.log('Generated CSS selectors:', uniqueSelectors.length);
    console.log('Content classes excluded (including ancestors):', contentClasses.size);
    console.log('Marked elements:', markedElements.length);

    return uniqueSelectors;
}

// Click functionality
document.addEventListener('click', (e) => {
    console.log('🔵 CLICK DETECTED:', {
        extensionEnabled,
        disableLinks,
        target: e.target.tagName,
        href: e.target.href || 'no href'
    });

    // Skip if extension is disabled
    if (!extensionEnabled) {
        console.log('❌ Extension disabled - ignoring click');
        return;
    }

    console.log(disableLinks ? '🔴 Disable Links ON - will prevent default' : '✅ Disable Links OFF - links work, but marking still active');

    // Ignore clicks on the tooltip itself
    if (e.target.id === 'css-class-finder-tooltip' || e.target.closest('#css-class-finder-tooltip')) {
        return;
    }

    // Get the clicked element
    const clickedElement = e.target;

    // Find closest element with classes
    let elementToHighlight = clickedElement;
    let current = clickedElement;

    while (current && current !== document.body) {
        if (current.className && typeof current.className === 'string' && current.className.trim()) {
            elementToHighlight = current;
            break; // Use first match (closest)
        }
        current = current.parentElement;
    }

    if (currentMode === 'copy') {
        // Copy Classes mode
        showTooltip(clickedElement, e.pageX, e.pageY);

        if (elementToHighlight && elementToHighlight.className) {
            highlightElement(elementToHighlight);
        }
    } else if (currentMode === 'content') {
        // Mark Content mode
        if (elementToHighlight && elementToHighlight.className) {
            const classes = getClosestClasses(clickedElement);

            // Check if Shift key is held - unmark if already marked
            if (e.shiftKey && elementToHighlight.hasAttribute('data-content-marked')) {
                // Unmark element
                elementToHighlight.style.removeProperty('outline');
                elementToHighlight.style.removeProperty('background-color');
                elementToHighlight.removeAttribute('data-content-marked');

                // Remove from arrays
                const index = markedElements.indexOf(elementToHighlight);
                if (index > -1) {
                    markedElements.splice(index, 1);
                }

                // Save updated list
                saveMarkedElements();

                // Show red tooltip
                if (tooltip) {
                    tooltip.innerHTML = `
                        <div style="margin-bottom: 4px;">
                            <strong style="color: #f44336;">✗ Noņemts!</strong>
                        </div>
                        <div style="font-family: 'Courier New', monospace; word-break: break-all;">
                            ${classes}
                        </div>
                    `;
                    tooltip.style.display = 'block';
                    tooltip.style.left = e.pageX + 10 + 'px';
                    tooltip.style.top = e.pageY + 10 + 'px';
                    tooltip.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';

                    setTimeout(() => {
                        tooltip.style.display = 'none';
                        tooltip.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    }, 1500);
                }
            } else {
                // Mark element
                markAsContent(elementToHighlight, classes);

                // Show green tooltip
                if (tooltip) {
                    tooltip.innerHTML = `
                        <div style="margin-bottom: 4px;">
                            <strong style="color: #4CAF50;">✓ Atzīmēts! (Shift+Click = noņemt)</strong>
                        </div>
                        <div style="font-family: 'Courier New', monospace; word-break: break-all;">
                            ${classes}
                        </div>
                    `;
                    tooltip.style.display = 'block';
                    tooltip.style.left = e.pageX + 10 + 'px';
                    tooltip.style.top = e.pageY + 10 + 'px';
                    tooltip.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';

                    setTimeout(() => {
                        tooltip.style.display = 'none';
                        tooltip.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    }, 1500);
                }
            }
        }
    }

    // Prevent default action only if disableLinks is true
    if (disableLinks) {
        e.preventDefault();
        e.stopPropagation();
    }
}, true); // Use capture phase

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({ status: 'ready', enabled: extensionEnabled });
    } else if (request.action === 'setTabState') {
        extensionEnabled = request.enabled;
        console.log('Extension toggled:', extensionEnabled ? 'ON' : 'OFF');

        // Clear marked content when disabling
        if (!extensionEnabled) {
            if (tooltip) {
                tooltip.style.display = 'none';
            }
            clearMarkedContent();
        }

        sendResponse({ status: 'toggled', enabled: extensionEnabled });
    } else if (request.action === 'getState') {
        sendResponse({ enabled: extensionEnabled });
    } else if (request.action === 'setMode') {
        const oldMode = currentMode;
        currentMode = request.mode;
        console.log('Mode changed from', oldMode, 'to:', currentMode);

        // Only clear marked content when switching FROM content mode TO copy mode
        if (oldMode === 'content' && currentMode === 'copy') {
            clearMarkedContent();
        }

        sendResponse({ status: 'mode_changed', mode: currentMode });
    } else if (request.action === 'generateIgnoreList') {
        const ignoreList = generateIgnoreList();
        sendResponse({
            ignoreList: ignoreList,
            markedCount: markedElements.length
        });
    } else if (request.action === 'clearMarked') {
        clearMarkedContent();
        sendResponse({ status: 'cleared' });
    } else if (request.action === 'setDisableLinks') {
        disableLinks = request.disableLinks;
        console.log('🔧 DISABLE LINKS CHANGED:', {
            oldValue: !disableLinks,
            newValue: disableLinks,
            message: disableLinks ? 'Links will be DISABLED' : 'Links will WORK normally'
        });
        sendResponse({ status: 'updated', disableLinks: disableLinks });
    }
    return true;
});

// Initialize
createTooltip();

// Restore marked elements after page load
setTimeout(() => {
    restoreMarkedElements();
}, 500);

// Debug: Log to console when extension loads
console.log('🔍 CSS Klašu Meklētājs extension loaded!');
