// Popup script for Interview Audio Capture extension
class ExtensionPopup {
    constructor() {
        this.currentTab = null;
        this.isInjected = false;
        this.isRecording = false;
        this.init();
    }

    async init() {
        await this.getCurrentTab();
        this.setupEventListeners();
        this.updateTabInfo();
        this.startStatusChecking();
        this.log('Extension popup initialized');
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
        } catch (error) {
            this.log('Error getting current tab: ' + error.message);
        }
    }

    setupEventListeners() {
        // Inject script button
        document.getElementById('inject-script').addEventListener('click', () => {
            this.injectContentScript();
        });

        // Start recording button
        document.getElementById('start-recording').addEventListener('click', () => {
            this.sendCommandToContentScript('start');
        });

        // Stop recording button
        document.getElementById('stop-recording').addEventListener('click', () => {
            this.sendCommandToContentScript('stop');
        });

        // Test connection button
        document.getElementById('test-connection').addEventListener('click', () => {
            this.testConnection();
        });

        // Settings inputs
        document.getElementById('backend-url').addEventListener('change', (e) => {
            this.saveSettings({ backendUrl: e.target.value });
        });

        document.getElementById('capture-interval').addEventListener('change', (e) => {
            this.saveSettings({ captureInterval: parseInt(e.target.value) });
        });
    }

    async injectContentScript() {
        if (!this.currentTab) {
            this.log('No active tab found');
            return;
        }

        try {
            this.log('Injecting content script...');
            
            await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                files: ['content-script.js']
            });

            this.isInjected = true;
            this.updateControlButtons();
            this.log('✅ Content script injected successfully');
            
            // Check status after injection
            setTimeout(() => this.checkContentScriptStatus(), 1000);

        } catch (error) {
            this.log('❌ Failed to inject content script: ' + error.message);
        }
    }

    async sendCommandToContentScript(command) {
        if (!this.currentTab || !this.isInjected) {
            this.log('Content script not available');
            return;
        }

        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: 'interview-capture-command',
                command: command
            });

            this.log(`Command "${command}" sent: ${JSON.stringify(response)}`);

            if (command === 'start') {
                this.isRecording = true;
            } else if (command === 'stop') {
                this.isRecording = false;
            }

            this.updateControlButtons();

        } catch (error) {
            this.log(`Failed to send command "${command}": ${error.message}`);
        }
    }

    async checkContentScriptStatus() {
        if (!this.currentTab) return;

        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                type: 'interview-capture-command',
                command: 'status'
            });

            if (response) {
                this.isRecording = response.isRecording;
                this.updateControlButtons();
                this.updateStatusIndicators();
                this.log(`Status check: ${JSON.stringify(response)}`);
            }

        } catch (error) {
            // Content script not available
            this.isInjected = false;
            this.updateControlButtons();
        }
    }

    async testConnection() {
        const backendUrl = document.getElementById('backend-url').value;
        
        try {
            this.log('Testing connection to ' + backendUrl + '...');
            
            const response = await fetch(backendUrl + '/api/health');
            const result = await response.json();
            
            this.updateStatusIndicator('backend-status', 'connected');
            this.log('✅ Backend connection successful: ' + result.status);

        } catch (error) {
            this.updateStatusIndicator('backend-status', 'disconnected');
            this.log('❌ Backend connection failed: ' + error.message);
        }
    }

    updateTabInfo() {
        const tabElement = document.getElementById('current-tab');
        if (this.currentTab) {
            const url = new URL(this.currentTab.url);
            tabElement.textContent = url.hostname;
            
            // Check if it's a video conferencing site
            const videoSites = ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'webex.com'];
            const isVideoSite = videoSites.some(site => url.hostname.includes(site));
            
            if (isVideoSite) {
                tabElement.textContent += ' 📹';
                this.log('Video conferencing site detected: ' + url.hostname);
            }
        } else {
            tabElement.textContent = 'No tab';
        }
    }

    updateControlButtons() {
        const injectBtn = document.getElementById('inject-script');
        const startBtn = document.getElementById('start-recording');
        const stopBtn = document.getElementById('stop-recording');

        if (this.isInjected) {
            injectBtn.textContent = '✅ Script Injected';
            injectBtn.disabled = true;
            startBtn.disabled = this.isRecording;
            stopBtn.disabled = !this.isRecording;
        } else {
            injectBtn.textContent = '📥 Inject Content Script';
            injectBtn.disabled = false;
            startBtn.disabled = true;
            stopBtn.disabled = true;
        }
    }

    updateStatusIndicators() {
        this.updateStatusIndicator('recording-status', this.isRecording ? 'recording' : 'disconnected');
    }

    updateStatusIndicator(elementId, status) {
        const indicator = document.getElementById(elementId);
        if (indicator) {
            indicator.className = 'status-indicator';
            if (status === 'connected') {
                indicator.classList.add('connected');
            } else if (status === 'recording') {
                indicator.classList.add('recording');
            }
        }
    }

    startStatusChecking() {
        // Check status every 2 seconds
        setInterval(() => {
            this.checkContentScriptStatus();
        }, 2000);
    }

    saveSettings(settings) {
        chrome.storage.local.set(settings, () => {
            this.log('Settings saved: ' + JSON.stringify(settings));
        });
    }

    async loadSettings() {
        try {
            const settings = await chrome.storage.local.get(['backendUrl', 'captureInterval']);
            
            if (settings.backendUrl) {
                document.getElementById('backend-url').value = settings.backendUrl;
            }
            
            if (settings.captureInterval) {
                document.getElementById('capture-interval').value = settings.captureInterval;
            }

        } catch (error) {
            this.log('Error loading settings: ' + error.message);
        }
    }

    log(message) {
        const logElement = document.getElementById('activity-log');
        const timestamp = new Date().toLocaleTimeString();
        logElement.textContent += `\n[${timestamp}] ${message}`;
        logElement.scrollTop = logElement.scrollHeight;
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ExtensionPopup();
});
