let tooltip = null;
let currentElement = null;
let extensionEnabled = false; // Default to disabled (OFF)
let currentTabId = null;
let currentMode = 'content'; // 'copy' or 'content' - Default to Mark Content
let contentClasses = new Set(); // Classes marked as content
let markedElements = []; // Elements marked as content
let ignoreClasses = new Set(); // Classes manually marked to ignore (CMD+Click)
let ignoredElements = []; // Elements manually marked to ignore
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
    element.removeAttribute('data-ignore-marked'); // Remove ignore mark if present

    // Remove from ignore arrays if was there
    const ignoreIndex = ignoredElements.indexOf(element);
    if (ignoreIndex > -1) {
        ignoredElements.splice(ignoreIndex, 1);
    }

    // Add to content array if not already there
    if (!markedElements.includes(element)) {
        markedElements.push(element);
    }

    if (classes) {
        classes.split(' ').forEach(cls => {
            if (cls.trim()) {
                contentClasses.add(cls.trim());
                ignoreClasses.delete(cls.trim()); // Remove from ignore if was there
            }
        });
    }

    console.log('Marked as content:', classes);
    console.log('Total content classes:', contentClasses.size);

    // Save marked elements to session storage
    saveMarkedElements();
}

// Mark element as ignore (CMD+Click)
function markAsIgnore(element, classes) {
    // Add permanent red highlight with !important to prevent override
    element.style.setProperty('outline', '3px solid #f44336', 'important');
    element.style.setProperty('background-color', 'rgba(244, 67, 54, 0.15)', 'important');
    element.setAttribute('data-ignore-marked', 'true');
    element.removeAttribute('data-content-marked'); // Remove content mark if present

    // Remove from content arrays if was there
    const contentIndex = markedElements.indexOf(element);
    if (contentIndex > -1) {
        markedElements.splice(contentIndex, 1);
    }

    // Add to ignore array if not already there
    if (!ignoredElements.includes(element)) {
        ignoredElements.push(element);
    }

    if (classes) {
        classes.split(' ').forEach(cls => {
            if (cls.trim()) {
                ignoreClasses.add(cls.trim());
                contentClasses.delete(cls.trim()); // Remove from content if was there
            }
        });
    }

    console.log('Marked as IGNORE:', classes);
    console.log('Total ignore classes:', ignoreClasses.size);

    // Save marked elements to session storage
    saveMarkedElements();
}

// Save marked elements to storage
function saveMarkedElements() {
    const contentData = markedElements.map(el => {
        return {
            xpath: getXPath(el),
            classes: el.className,
            type: 'content'
        };
    });

    const ignoreData = ignoredElements.map(el => {
        return {
            xpath: getXPath(el),
            classes: el.className,
            type: 'ignore'
        };
    });

    chrome.storage.local.set({
        [`marked_content_${window.location.href}`]: contentData,
        [`marked_ignore_${window.location.href}`]: ignoreData
    });

    console.log('Saved', contentData.length, 'content elements and', ignoreData.length, 'ignore elements');
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
    chrome.storage.local.get([
        `marked_content_${window.location.href}`,
        `marked_ignore_${window.location.href}`
    ], (result) => {
        const contentData = result[`marked_content_${window.location.href}`] || [];
        const ignoreData = result[`marked_ignore_${window.location.href}`] || [];

        if (contentData.length === 0 && ignoreData.length === 0) {
            console.log('No marked elements to restore');
            return;
        }

        console.log('Restoring', contentData.length, 'content elements and', ignoreData.length, 'ignore elements');

        // Restore content elements (green)
        contentData.forEach(data => {
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
                console.error('Failed to restore content element:', e);
            }
        });

        // Restore ignore elements (red)
        ignoreData.forEach(data => {
            try {
                const el = document.evaluate(data.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (el) {
                    el.style.setProperty('outline', '3px solid #f44336', 'important');
                    el.style.setProperty('background-color', 'rgba(244, 67, 54, 0.15)', 'important');
                    el.setAttribute('data-ignore-marked', 'true');
                    ignoredElements.push(el);

                    // Restore classes
                    if (data.classes) {
                        data.classes.split(' ').forEach(cls => {
                            if (cls.trim()) {
                                ignoreClasses.add(cls.trim());
                            }
                        });
                    }
                }
            } catch (e) {
                console.error('Failed to restore ignore element:', e);
            }
        });

        console.log('Restored', markedElements.length, 'content elements and', ignoredElements.length, 'ignore elements');
    });
}

// Clear all marked content
function clearMarkedContent() {
    // Clear content elements (green)
    markedElements.forEach(el => {
        el.style.removeProperty('outline');
        el.style.removeProperty('background-color');
        el.removeAttribute('data-content-marked');
    });
    markedElements = [];
    contentClasses.clear();

    // Clear ignore elements (red)
    ignoredElements.forEach(el => {
        el.style.removeProperty('outline');
        el.style.removeProperty('background-color');
        el.removeAttribute('data-ignore-marked');
    });
    ignoredElements = [];
    ignoreClasses.clear();

    // Clear from storage
    chrome.storage.local.remove([
        `marked_content_${window.location.href}`,
        `marked_ignore_${window.location.href}`
    ]);

    console.log('Cleared all marked content and ignore elements');
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

    // Recalculate ignore classes from manually marked ignore elements
    ignoreClasses.clear();
    ignoredElements.forEach(el => {
        if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(cls => {
                if (cls.trim()) {
                    ignoreClasses.add(cls.trim());
                }
            });
        }
    });

    const selectors = [];

    // Add common HTML tags to ignore
    const commonTags = ['style', 'script', 'noscript', 'header', 'footer', 'nav', 'aside', 'iframe'];
    selectors.push(...commonTags);

    // Add manually marked ignore classes (from CMD+Click)
    ignoreClasses.forEach(cls => {
        // Don't add if it's in contentClasses (content takes priority)
        if (!contentClasses.has(cls)) {
            selectors.push(`.${cls}`);
        }
    });

    // Sort and deduplicate
    const uniqueSelectors = [...new Set(selectors)].sort();

    console.log('Generated CSS selectors:', uniqueSelectors.length);
    console.log('Content classes (including ancestors):', contentClasses.size);
    console.log('Manually ignored classes:', ignoreClasses.size);
    console.log('Content elements marked:', markedElements.length);
    console.log('Ignore elements marked:', ignoredElements.length);

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

            // Check if Shift key is held - REMOVE any marking (content OR ignore)
            if (e.shiftKey) {
                // Check if marked as content (green)
                if (elementToHighlight.hasAttribute('data-content-marked')) {
                    // Unmark content element
                    elementToHighlight.style.removeProperty('outline');
                    elementToHighlight.style.removeProperty('background-color');
                    elementToHighlight.removeAttribute('data-content-marked');

                    // Remove from arrays
                    const index = markedElements.indexOf(elementToHighlight);
                    if (index > -1) {
                        markedElements.splice(index, 1);
                    }

                    // Remove classes from contentClasses
                    if (classes) {
                        classes.split(' ').forEach(cls => {
                            if (cls.trim()) {
                                contentClasses.delete(cls.trim());
                            }
                        });
                    }

                    // Save updated list
                    saveMarkedElements();

                    // Show orange tooltip
                    if (tooltip) {
                        tooltip.innerHTML = `
                            <div style="margin-bottom: 4px;">
                                <strong style="color: #ff9800;">✗ Content noņemts!</strong>
                            </div>
                            <div style="font-family: 'Courier New', monospace; word-break: break-all;">
                                ${classes}
                            </div>
                        `;
                        tooltip.style.display = 'block';
                        tooltip.style.left = e.pageX + 10 + 'px';
                        tooltip.style.top = e.pageY + 10 + 'px';
                        tooltip.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';

                        setTimeout(() => {
                            tooltip.style.display = 'none';
                            tooltip.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        }, 1500);
                    }
                }
                // Check if marked as ignore (red)
                else if (elementToHighlight.hasAttribute('data-ignore-marked')) {
                    // Unmark ignore element
                    elementToHighlight.style.removeProperty('outline');
                    elementToHighlight.style.removeProperty('background-color');
                    elementToHighlight.removeAttribute('data-ignore-marked');

                    // Remove from arrays
                    const index = ignoredElements.indexOf(elementToHighlight);
                    if (index > -1) {
                        ignoredElements.splice(index, 1);
                    }

                    // Remove classes from ignoreClasses
                    if (classes) {
                        classes.split(' ').forEach(cls => {
                            if (cls.trim()) {
                                ignoreClasses.delete(cls.trim());
                            }
                        });
                    }

                    // Save updated list
                    saveMarkedElements();

                    // Show orange tooltip
                    if (tooltip) {
                        tooltip.innerHTML = `
                            <div style="margin-bottom: 4px;">
                                <strong style="color: #ff9800;">✗ Ignore noņemts!</strong>
                            </div>
                            <div style="font-family: 'Courier New', monospace; word-break: break-all;">
                                ${classes}
                            </div>
                        `;
                        tooltip.style.display = 'block';
                        tooltip.style.left = e.pageX + 10 + 'px';
                        tooltip.style.top = e.pageY + 10 + 'px';
                        tooltip.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';

                        setTimeout(() => {
                            tooltip.style.display = 'none';
                            tooltip.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        }, 1500);
                    }
                }
            }
            // Check if CMD (Mac) or Ctrl (Windows) is held - mark as IGNORE (always)
            else if (e.metaKey || e.ctrlKey) {
                // Mark as IGNORE (red) - even if already marked
                markAsIgnore(elementToHighlight, classes);

                // Show red tooltip
                if (tooltip) {
                    tooltip.innerHTML = `
                        <div style="margin-bottom: 4px;">
                            <strong style="color: #f44336;">🚫 IGNORE! (Shift = noņemt)</strong>
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
            }
            // Normal click - mark as content (green)
            else {
                markAsContent(elementToHighlight, classes);

                // Show green tooltip
                if (tooltip) {
                    tooltip.innerHTML = `
                        <div style="margin-bottom: 4px;">
                            <strong style="color: #4CAF50;">✓ CONTENT! (Shift = noņemt, CMD = ignore)</strong>
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
