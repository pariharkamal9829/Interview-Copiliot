// Manifest V3 Service Worker for Interview Audio Capture Extension
// Handles extension lifecycle, tab management, and message passing

// Extension state management
let extensionState = {
  isRecording: false,
  activeTabs: new Map(),
  settings: {
    backendUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000',
    captureInterval: 3000,
    autoInject: true
  }
};

// Install and startup handlers
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Interview Audio Capture extension installed/updated');
  
  if (details.reason === 'install') {
    // First-time installation
    setupDefaultSettings();
    showWelcomeNotification();
  } else if (details.reason === 'update') {
    // Extension updated
    migrateSettings(details.previousVersion);
  }
  
  // Create context menus
  createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  loadSettings();
});

// Setup default settings on first install
async function setupDefaultSettings() {
  try {
    await chrome.storage.local.set({
      settings: extensionState.settings,
      isFirstRun: true,
      installDate: Date.now()
    });
    console.log('Default settings configured');
  } catch (error) {
    console.error('Failed to setup default settings:', error);
  }
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    if (result.settings) {
      extensionState.settings = { ...extensionState.settings, ...result.settings };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Show welcome notification
function showWelcomeNotification() {
  chrome.notifications.create('welcome', {
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'Interview Audio Capture',
    message: 'Extension installed! Click the icon to start capturing audio from video calls.'
  });
}

// Create context menus
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'start-capture',
      title: 'Start Audio Capture',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://meet.google.com/*',
        'https://zoom.us/*',
        'https://teams.microsoft.com/*',
        'https://*.zoom.us/*',
        'https://*.webex.com/*'
      ]
    });
    
    chrome.contextMenus.create({
      id: 'stop-capture',
      title: 'Stop Audio Capture',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://meet.google.com/*',
        'https://zoom.us/*',
        'https://teams.microsoft.com/*',
        'https://*.zoom.us/*',
        'https://*.webex.com/*'
      ]
    });
    
    chrome.contextMenus.create({
      id: 'separator',
      type: 'separator',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'open-options',
      title: 'Extension Settings',
      contexts: ['page']
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'start-capture':
      await sendCommandToTab(tab.id, 'start');
      break;
    case 'stop-capture':
      await sendCommandToTab(tab.id, 'stop');
      break;
    case 'open-options':
      chrome.runtime.openOptionsPage();
      break;
  }
});

// Handle extension action (toolbar icon) clicks
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if it's a supported video conferencing site
    const supportedSites = [
      'meet.google.com',
      'zoom.us',
      'teams.microsoft.com',
      'webex.com',
      'gotomeeting.com'
    ];
    
    const url = new URL(tab.url);
    const isVideoSite = supportedSites.some(site => url.hostname.includes(site));
    
    if (isVideoSite) {
      // Auto-inject content script on video sites
      await injectContentScript(tab.id);
      
      // Show notification
      chrome.notifications.create('injected', {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'Audio Capture Ready',
        message: 'Click the floating panel to start recording audio.'
      });
    } else {
      // Open popup for non-video sites
      // Note: Popup is handled automatically by manifest action.default_popup
      console.log('Non-video site - popup will open');
    }
    
  } catch (error) {
    console.error('Failed to handle action click:', error);
    
    // Show error notification
    chrome.notifications.create('error', {
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'Injection Failed',
      message: 'Could not inject audio capture. Try using the popup interface.'
    });
  }
});

// Inject content script into tab
async function injectContentScript(tabId) {
  try {
    // Check if already injected
    const tabState = extensionState.activeTabs.get(tabId);
    if (tabState && tabState.injected) {
      console.log('Content script already injected in tab:', tabId);
      return;
    }
    
    // Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content-script.js']
    });
    
    // Update tab state
    extensionState.activeTabs.set(tabId, {
      injected: true,
      isRecording: false,
      injectTime: Date.now()
    });
    
    console.log('Content script injected successfully into tab:', tabId);
    
  } catch (error) {
    console.error('Failed to inject content script:', error);
    throw error;
  }
}

// Handle tab updates for auto-injection
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && extensionState.settings.autoInject) {
    try {
      // Check if this is a video conferencing site
      const videoConferencingSites = [
        'meet.google.com',
        'zoom.us',
        'teams.microsoft.com',
        'webex.com',
        'gotomeeting.com',
        'whereby.com',
        'discord.com'
      ];
      
      const url = new URL(tab.url);
      const isVideoSite = videoConferencingSites.some(site => url.hostname.includes(site));
      
      if (isVideoSite) {
        console.log('Video conferencing site detected:', url.hostname);
        
        // Wait a bit for page to fully load
        setTimeout(async () => {
          try {
            await injectContentScript(tabId);
          } catch (error) {
            console.log('Auto-injection failed (may already be injected):', error.message);
          }
        }, 2000);
      }
    } catch (error) {
      // Invalid URL or other error - ignore
      console.log('Tab update error (ignored):', error.message);
    }
  }
});

// Handle tab removal cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  extensionState.activeTabs.delete(tabId);
  console.log('Cleaned up state for closed tab:', tabId);
});

// Send command to content script in specific tab
async function sendCommandToTab(tabId, command, data = {}) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'interview-capture-command',
      command: command,
      data: data,
      timestamp: Date.now()
    });
    
    console.log(`Command "${command}" sent to tab ${tabId}:`, response);
    return response;
    
  } catch (error) {
    console.error(`Failed to send command "${command}" to tab ${tabId}:`, error);
    
    // Try to inject content script if message failed
    if (error.message.includes('Could not establish connection')) {
      try {
        await injectContentScript(tabId);
        // Retry the command after injection
        return await chrome.tabs.sendMessage(tabId, {
          type: 'interview-capture-command',
          command: command,
          data: data,
          timestamp: Date.now()
        });
      } catch (retryError) {
        console.error('Retry after injection also failed:', retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender);
  
  // Handle async operations
  (async () => {
    try {
      switch (message.type) {
        case 'audio-captured':
          await handleAudioCaptured(message.data, sender);
          sendResponse({ status: 'success' });
          break;
          
        case 'capture-status':
          await handleCaptureStatus(message.data, sender);
          sendResponse({ status: 'success' });
          break;
          
        case 'get-settings':
          sendResponse({ settings: extensionState.settings });
          break;
          
        case 'update-settings':
          await updateSettings(message.settings);
          sendResponse({ status: 'success' });
          break;
          
        case 'get-tab-state':
          const tabState = extensionState.activeTabs.get(sender.tab?.id);
          sendResponse({ tabState: tabState || null });
          break;
          
        case 'inject-script':
          if (message.tabId) {
            await injectContentScript(message.tabId);
            sendResponse({ status: 'injected' });
          } else {
            sendResponse({ status: 'error', message: 'No tab ID provided' });
          }
          break;
          
        case 'send-command':
          if (message.tabId && message.command) {
            const result = await sendCommandToTab(message.tabId, message.command, message.data);
            sendResponse({ status: 'success', result: result });
          } else {
            sendResponse({ status: 'error', message: 'Missing tabId or command' });
          }
          break;
          
        default:
          sendResponse({ status: 'unknown-message-type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  })();
  
  return true; // Keep message channel open for async response
});

// Handle audio captured events
async function handleAudioCaptured(data, sender) {
  const tabId = sender.tab?.id;
  if (tabId) {
    const tabState = extensionState.activeTabs.get(tabId);
    if (tabState) {
      tabState.lastAudioCapture = Date.now();
      tabState.isRecording = true;
    }
  }
  
  console.log('Audio captured from tab:', tabId, 'Size:', data.size || 'unknown');
}

// Handle capture status updates
async function handleCaptureStatus(data, sender) {
  const tabId = sender.tab?.id;
  if (tabId) {
    const tabState = extensionState.activeTabs.get(tabId) || {};
    tabState.isRecording = data.isRecording;
    tabState.lastStatusUpdate = Date.now();
    extensionState.activeTabs.set(tabId, tabState);
  }
  
  // Update extension badge
  const badgeText = data.isRecording ? 'REC' : '';
  const badgeColor = data.isRecording ? '#ef4444' : '#10b981';
  
  chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId: tabId });
}

// Update extension settings
async function updateSettings(newSettings) {
  try {
    extensionState.settings = { ...extensionState.settings, ...newSettings };
    await chrome.storage.local.set({ settings: extensionState.settings });
    console.log('Settings updated:', extensionState.settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('No active tab found');
      return;
    }
    
    switch (command) {
      case 'start-recording':
        await sendCommandToTab(tab.id, 'start');
        break;
      case 'stop-recording':
        await sendCommandToTab(tab.id, 'stop');
        break;
      case 'toggle-recording':
        await sendCommandToTab(tab.id, 'toggle');
        break;
    }
  } catch (error) {
    console.error('Keyboard shortcut error:', error);
  }
});

// Migrate settings from previous versions
function migrateSettings(previousVersion) {
  console.log('Migrating settings from version:', previousVersion);
  // Add any migration logic here for future updates
}

// Periodic cleanup of inactive tabs
chrome.alarms.create('cleanup', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    const now = Date.now();
    const inactiveThreshold = 60 * 60 * 1000; // 1 hour
    
    for (const [tabId, tabState] of extensionState.activeTabs.entries()) {
      if (now - tabState.lastStatusUpdate > inactiveThreshold) {
        extensionState.activeTabs.delete(tabId);
        console.log('Cleaned up inactive tab:', tabId);
      }
    }
  }
});

// Error handling for uncaught errors
self.addEventListener('error', (event) => {
  console.error('Uncaught error in service worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
});
