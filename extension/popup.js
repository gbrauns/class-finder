// WAIT FOR DOM READY
document.addEventListener('DOMContentLoaded', () => {
console.log('🟢 DOM READY - popup.js starting...');

// Toggle functionality
const toggle = document.getElementById('extensionToggle');
const toggleLabel = document.getElementById('toggleLabel');
const disableLinksToggle = document.getElementById('disableLinksToggle');
let currentTabId = null;

// Get current tab and load its state
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
        currentTabId = tabs[0].id;

        // Get state from background for this tab
        chrome.runtime.sendMessage({
            action: 'getTabState',
            tabId: currentTabId
        }, (response) => {
            const enabled = response?.enabled === true; // Default to false (OFF)
            toggle.checked = enabled;
            updateToggleLabel(enabled);

            // NOW load saved mode after we have currentTabId
            loadSavedMode();
        });
    }
});

// Handle toggle change
toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    updateToggleLabel(enabled);

    if (!currentTabId) return;

    // Save state to background for this tab
    chrome.runtime.sendMessage({
        action: 'setTabState',
        tabId: currentTabId,
        enabled: enabled
    });

    // Notify content script in this tab
    chrome.tabs.sendMessage(currentTabId, {
        action: 'setTabState',
        enabled: enabled
    });
});

function updateToggleLabel(enabled) {
    if (enabled) {
        toggleLabel.textContent = 'ON';
        toggleLabel.style.color = '#4CAF50';
        disableLinksToggle.style.display = 'block';
    } else {
        toggleLabel.textContent = 'OFF';
        toggleLabel.style.color = '#999';
        disableLinksToggle.style.display = 'none';
    }
}

// Check if extension is active on current page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
        // Send a ping to check if content script is loaded
        chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                // Content script not loaded - show warning
                document.getElementById('warningBox').style.display = 'block';
                console.error('Extension not active:', chrome.runtime.lastError.message);
            } else {
                console.log('✓ Extension is active and ready!');
            }
        });
    }
});

// Class history functionality
const classHistory = document.getElementById('classHistory');

// Load history from storage
function loadHistory() {
    chrome.storage.local.get(['classHistory'], (result) => {
        if (result.classHistory && result.classHistory.length > 0) {
            // Extract className from each entry
            const classNames = result.classHistory.map(entry =>
                typeof entry === 'string' ? entry : entry.className
            );
            classHistory.value = classNames.join('\n');
        }
    });
}

// Load initially
loadHistory();

// Listen for new copied classes from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'classCopied') {
        // Reload history from storage
        loadHistory();
    }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.classHistory) {
        loadHistory();
    }
});

// Clear history - use event delegation
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'clearHistory') {
        console.log('Clear history clicked!');

        chrome.storage.local.set({ classHistory: [] });
        const classHistoryTextarea = document.getElementById('classHistory');
        if (classHistoryTextarea) {
            classHistoryTextarea.value = '';
        }
    }
});

// Mode switching
const modeCopy = document.getElementById('modeClasses');
const modeContent = document.getElementById('modeContent');
const infoCopy = document.getElementById('infoCopy');
const infoContent = document.getElementById('infoContent');
const stepsCopy = document.getElementById('stepsCopy');
const stepsContent = document.getElementById('stepsContent');
const contentModePanel = document.getElementById('contentModePanel');
const copyModePanel = document.getElementById('copyModePanel');

// Load saved mode (called after currentTabId is set)
function loadSavedMode() {
    if (!currentTabId) return;

    chrome.storage.local.get([`mode_${currentTabId}`], (result) => {
        const savedMode = result[`mode_${currentTabId}`] || 'content'; // Default to Mark Content
        console.log('Loading saved mode:', savedMode, 'for tab', currentTabId);

        if (savedMode === 'content') {
            modeContent.checked = true;
            modeCopy.checked = false;
        } else {
            modeCopy.checked = true;
            modeContent.checked = false;
        }

        // Switch to saved mode
        switchMode(savedMode, false); // false = don't notify content script yet

        // NOW notify content script
        chrome.tabs.sendMessage(currentTabId, {
            action: 'setMode',
            mode: savedMode
        });
    });
}

function switchMode(mode, notifyContentScript = true) {
    console.log('Switching to mode:', mode);

    if (mode === 'copy') {
        infoCopy.style.display = 'block';
        infoContent.style.display = 'none';
        stepsCopy.style.display = 'block';
        stepsContent.style.display = 'none';
        contentModePanel.style.display = 'none';
        copyModePanel.style.display = 'block';
        stopAutoRefresh();
    } else {
        infoCopy.style.display = 'none';
        infoContent.style.display = 'block';
        stepsCopy.style.display = 'none';
        stepsContent.style.display = 'block';
        contentModePanel.style.display = 'block';
        copyModePanel.style.display = 'none';
        // Show ignore list panel
        document.getElementById('ignoreListPanel').style.display = 'block';
        loadIgnoreList();
        startAutoRefresh();
    }

    // Save mode per tab
    if (currentTabId) {
        chrome.storage.local.set({ [`mode_${currentTabId}`]: mode });
        console.log('Saved mode to storage:', mode, 'for tab', currentTabId);
    }

    // Notify content script about mode change
    if (notifyContentScript && currentTabId) {
        chrome.tabs.sendMessage(currentTabId, {
            action: 'setMode',
            mode: mode
        });
    }
}

modeCopy.addEventListener('change', () => {
    if (modeCopy.checked) switchMode('copy');
});

modeContent.addEventListener('change', () => {
    if (modeContent.checked) switchMode('content');
});

// Load ignore list from content script
function loadIgnoreList() {
    if (!currentTabId) return;

    chrome.tabs.sendMessage(currentTabId, {
        action: 'generateIgnoreList'
    }, (response) => {
        if (response && response.ignoreList) {
            updateIgnoreListDisplay(response.ignoreList, response.markedCount);
        }
    });
}

// Update ignore list display
function updateIgnoreListDisplay(ignoreList, markedCount) {
    const ignoreListTextarea = document.getElementById('ignoreList');
    const ignoreCount = document.getElementById('ignoreCount');

    // Format as CSS selectors (comma-separated, on new lines)
    ignoreListTextarea.value = ignoreList.join(',\n');
    ignoreCount.textContent = ignoreList.length;

    // Also show marked count
    if (markedCount !== undefined) {
        ignoreCount.textContent = `${ignoreList.length} selectors (${markedCount} content marked)`;
    }
}

// Auto-refresh ignore list every 2 seconds in content mode
let autoRefreshInterval = null;

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);

    autoRefreshInterval = setInterval(() => {
        if (modeContent.checked && currentTabId) {
            loadIgnoreList();
        }
    }, 2000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Start auto-refresh when in content mode
if (modeContent.checked) {
    startAutoRefresh();
}

// Copy ignore list - SEPARATE listener to avoid conflicts
const setupCopyButton = () => {
    const btn = document.getElementById('copyIgnoreList');
    if (btn) {
        console.log('✓ Copy button found, adding listener');
        btn.addEventListener('click', async (e) => {
            console.log('✓✓✓ COPY BUTTON CLICKED! ✓✓✓');

        const ignoreList = document.getElementById('ignoreList');
        const text = ignoreList.value;

        if (!text) {
            console.error('Ignore list is empty!');
            alert('Ignore list ir tukšs!');
            return;
        }

        try {
            // Try modern Clipboard API first
            await navigator.clipboard.writeText(text);
            console.log('✓ Copied with Clipboard API:', text.substring(0, 50) + '...');
        } catch (err) {
            console.error('Clipboard API failed:', err);
            // Fallback to old method
            try {
                ignoreList.select();
                document.execCommand('copy');
                console.log('✓ Copied with execCommand');
            } catch (e2) {
                console.error('execCommand failed:', e2);
                alert('Neizdevās nokopēt. Lūdzu, kopē manuāli (Ctrl+A, Ctrl+C)');
                return;
            }
        }

            const btn = e.target;
            const originalText = btn.textContent;
            btn.textContent = '✓ Nokopēts!';
            btn.style.background = '#4CAF50';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#667eea';
            }, 1500);
        });
    } else {
        console.warn('Copy button NOT found, will retry...');
        setTimeout(setupCopyButton, 500);
    }
};

// Try to setup copy button multiple times
setupCopyButton();
setTimeout(setupCopyButton, 1000);
setTimeout(setupCopyButton, 2000);

// Clear marked content - use event delegation
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'clearMarked') {
        console.log('Clear marked clicked!');

        // Get current tab dynamically
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                console.log('Sending clearMarked to tab:', tabs[0].id);

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'clearMarked'
                }, (response) => {
                    console.log('clearMarked response:', response);
                });

                // Clear textarea but keep panel visible
                document.getElementById('ignoreList').value = '';
                document.getElementById('ignoreCount').textContent = '0 selectors';
            } else {
                console.error('No active tab found!');
            }
        });
    }
});

// Disable links toggle - with retry
const setupDisableLinksCheckbox = () => {
    const checkbox = document.getElementById('disableLinksCheckbox');
    if (checkbox) {
        console.log('✓ Disable Links checkbox found, adding listener');

        checkbox.addEventListener('change', () => {
            const disableLinks = checkbox.checked;
            console.log('🔧🔧🔧 CHECKBOX CHANGED TO:', disableLinks);

            // Get current tab dynamically
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    console.log('Sending setDisableLinks to tab:', tabs[0].id);

                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'setDisableLinks',
                        disableLinks: disableLinks
                    }, (response) => {
                        console.log('setDisableLinks response:', response);
                    });
                } else {
                    console.error('No active tab found!');
                }
            });
        });
    } else {
        console.warn('Disable Links checkbox NOT found, will retry...');
        setTimeout(setupDisableLinksCheckbox, 500);
    }
};

// Try to setup checkbox multiple times
setupDisableLinksCheckbox();
setTimeout(setupDisableLinksCheckbox, 1000);
setTimeout(setupDisableLinksCheckbox, 2000);

console.log('🔍 CSS Klašu Meklētājs popup loaded!');

}); // End DOMContentLoaded
