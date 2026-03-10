// Store enabled state per tab
const tabStates = new Map();

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'classCopied') {
        // Get tab ID from sender
        const tabId = sender.tab?.id;

        // Save to history with tab info
        chrome.storage.local.get(['classHistory'], (result) => {
            let history = result.classHistory || [];

            // Always add new entry (even if duplicate)
            const entry = {
                className: request.className,
                timestamp: Date.now(),
                tabId: tabId
            };

            history.unshift(entry);

            // Keep only last 100 entries
            if (history.length > 100) {
                history = history.slice(0, 100);
            }

            // Save to storage
            chrome.storage.local.set({ classHistory: history });

            console.log('Class saved to history:', request.className);
        });

        // Forward message to popup if it's open
        chrome.runtime.sendMessage(request).catch(() => {
            // Popup not open, that's fine
        });

        sendResponse({ success: true });
    }
    else if (request.action === 'getTabState') {
        // Return enabled state for this tab
        const tabId = request.tabId;
        const enabled = tabStates.get(tabId) === true; // Default to false (OFF)
        sendResponse({ enabled: enabled });
    }
    else if (request.action === 'setTabState') {
        // Set enabled state for this tab
        const tabId = request.tabId;
        tabStates.set(tabId, request.enabled);
        console.log(`Tab ${tabId} state:`, request.enabled ? 'ON' : 'OFF');
        sendResponse({ success: true });
    }

    return true; // Keep channel open for async response
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    tabStates.delete(tabId);
    console.log(`Tab ${tabId} closed, state cleared`);
});

console.log('🔍 CSS Klašu Meklētājs background script loaded!');
