// Options page script for Interview Audio Capture extension
class OptionsManager {
    constructor() {
        this.defaultSettings = {
            backendUrl: 'http://localhost:3000',
            wsUrl: 'ws://localhost:3000',
            captureInterval: 3000,
            audioQuality: 'medium',
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
            autoInject: true,
            showNotifications: true,
            persistentUI: false,
            uiPosition: 'top-right'
        };
        
        this.init();
    }

    async init() {
        console.log('Options page initialized');
        await this.loadSettings();
        await this.loadStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auto-save on input changes
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.markUnsaved());
        });

        // WebSocket URL auto-update when backend URL changes
        const backendUrlInput = document.getElementById('backend-url');
        backendUrlInput.addEventListener('input', (e) => {
            const wsUrl = e.target.value.replace('http', 'ws');
            document.getElementById('websocket-url').value = wsUrl;
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || this.defaultSettings;
            
            this.populateForm(settings);
            console.log('Settings loaded:', settings);
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showNotification('Failed to load settings', 'error');
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['stats']);
            const stats = result.stats || {
                totalSessions: 0,
                totalDuration: 0,
                lastSession: null,
                firstUse: Date.now()
            };
            
            this.updateStatsDisplay(stats);
            
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    populateForm(settings) {
        // Backend configuration
        document.getElementById('backend-url').value = settings.backendUrl || this.defaultSettings.backendUrl;
        document.getElementById('websocket-url').value = settings.wsUrl || this.defaultSettings.wsUrl;
        
        // Audio settings
        document.getElementById('capture-interval').value = settings.captureInterval || this.defaultSettings.captureInterval;
        document.getElementById('audio-quality').value = settings.audioQuality || this.defaultSettings.audioQuality;
        document.getElementById('noise-suppression').checked = settings.noiseSuppression !== false;
        document.getElementById('echo-cancellation').checked = settings.echoCancellation !== false;
        document.getElementById('auto-gain-control').checked = settings.autoGainControl !== false;
        
        // Extension behavior
        document.getElementById('auto-inject').checked = settings.autoInject !== false;
        document.getElementById('show-notifications').checked = settings.showNotifications !== false;
        document.getElementById('persistent-ui').checked = settings.persistentUI === true;
        document.getElementById('ui-position').value = settings.uiPosition || this.defaultSettings.uiPosition;
    }

    getFormSettings() {
        return {
            backendUrl: document.getElementById('backend-url').value.trim(),
            wsUrl: document.getElementById('websocket-url').value.trim(),
            captureInterval: parseInt(document.getElementById('capture-interval').value),
            audioQuality: document.getElementById('audio-quality').value,
            noiseSuppression: document.getElementById('noise-suppression').checked,
            echoCancellation: document.getElementById('echo-cancellation').checked,
            autoGainControl: document.getElementById('auto-gain-control').checked,
            autoInject: document.getElementById('auto-inject').checked,
            showNotifications: document.getElementById('show-notifications').checked,
            persistentUI: document.getElementById('persistent-ui').checked,
            uiPosition: document.getElementById('ui-position').value
        };
    }

    async saveSettings() {
        try {
            const settings = this.getFormSettings();
            
            // Validate settings
            const validation = this.validateSettings(settings);
            if (!validation.isValid) {
                this.showNotification(validation.message, 'error');
                return;
            }
            
            // Save to storage
            await chrome.storage.local.set({ settings });
            
            // Notify background script
            chrome.runtime.sendMessage({
                type: 'update-settings',
                settings: settings
            });
            
            this.showNotification('Settings saved successfully!', 'success');
            this.markSaved();
            
            console.log('Settings saved:', settings);
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    validateSettings(settings) {
        // Validate backend URL
        try {
            new URL(settings.backendUrl);
        } catch (error) {
            return { isValid: false, message: 'Invalid backend URL format' };
        }
        
        // Validate WebSocket URL
        if (!settings.wsUrl.startsWith('ws://') && !settings.wsUrl.startsWith('wss://')) {
            return { isValid: false, message: 'WebSocket URL must start with ws:// or wss://' };
        }
        
        // Validate capture interval
        if (settings.captureInterval < 1000 || settings.captureInterval > 10000) {
            return { isValid: false, message: 'Capture interval must be between 1000 and 10000 milliseconds' };
        }
        
        return { isValid: true };
    }

    async testConnection() {
        const settings = this.getFormSettings();
        const statusEl = document.getElementById('connection-status');
        const resultsEl = document.getElementById('test-results');
        
        statusEl.innerHTML = '<span class="status-indicator status-info">🔄 Testing connection...</span>';
        resultsEl.style.display = 'block';
        resultsEl.textContent = 'Starting connection tests...\n';
        
        // Test HTTP connection
        try {
            this.appendTestResult('Testing HTTP connection to backend...');
            
            const response = await fetch(settings.backendUrl + '/api/health', {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                this.appendTestResult(`✅ HTTP connection successful - Status: ${data.status || 'OK'}`);
            } else {
                this.appendTestResult(`❌ HTTP connection failed - Status: ${response.status}`);
            }
            
        } catch (error) {
            this.appendTestResult(`❌ HTTP connection error: ${error.message}`);
        }
        
        // Test WebSocket connection
        try {
            this.appendTestResult('\nTesting WebSocket connection...');
            
            const ws = new WebSocket(settings.wsUrl);
            
            const wsPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 5000);
                
                ws.onopen = () => {
                    clearTimeout(timeout);
                    this.appendTestResult('✅ WebSocket connection established');
                    
                    // Send test message
                    ws.send(JSON.stringify({
                        type: 'test-connection',
                        timestamp: Date.now()
                    }));
                    
                    setTimeout(() => {
                        ws.close();
                        resolve();
                    }, 1000);
                };
                
                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.appendTestResult(`📨 Received response: ${JSON.stringify(message)}`);
                    } catch (error) {
                        this.appendTestResult(`📨 Received: ${event.data}`);
                    }
                };
                
                ws.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('WebSocket connection failed'));
                };
                
                ws.onclose = () => {
                    this.appendTestResult('🔌 WebSocket connection closed');
                };
            });
            
            await wsPromise;
            this.appendTestResult('✅ WebSocket test completed successfully');
            
        } catch (error) {
            this.appendTestResult(`❌ WebSocket error: ${error.message}`);
        }
        
        // Test microphone access
        try {
            this.appendTestResult('\nTesting microphone access...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.appendTestResult('✅ Microphone access granted');
            
            // Stop the stream immediately
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            this.appendTestResult(`❌ Microphone access error: ${error.message}`);
        }
        
        this.appendTestResult('\n--- Connection test completed ---');
        statusEl.innerHTML = '<span class="status-indicator status-success">✅ Connection test completed</span>';
    }

    appendTestResult(message) {
        const resultsEl = document.getElementById('test-results');
        const timestamp = new Date().toLocaleTimeString();
        resultsEl.textContent += `[${timestamp}] ${message}\n`;
        resultsEl.scrollTop = resultsEl.scrollHeight;
    }

    updateStatsDisplay(stats) {
        document.getElementById('total-sessions').textContent = stats.totalSessions || 0;
        
        const duration = stats.totalDuration || 0;
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('total-duration').textContent = `${hours}h ${minutes}m`;
        
        const lastSession = stats.lastSession ? new Date(stats.lastSession).toLocaleDateString() : 'Never';
        document.getElementById('last-session').textContent = lastSession;
    }

    async clearStats() {
        if (confirm('Are you sure you want to clear all usage statistics? This action cannot be undone.')) {
            try {
                await chrome.storage.local.set({
                    stats: {
                        totalSessions: 0,
                        totalDuration: 0,
                        lastSession: null,
                        firstUse: Date.now()
                    }
                });
                
                this.loadStats();
                this.showNotification('Statistics cleared', 'success');
                
            } catch (error) {
                console.error('Failed to clear stats:', error);
                this.showNotification('Failed to clear statistics', 'error');
            }
        }
    }

    async resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to their default values?')) {
            this.populateForm(this.defaultSettings);
            await this.saveSettings();
            this.showNotification('Settings reset to defaults', 'success');
        }
    }

    async exportSettings() {
        try {
            const result = await chrome.storage.local.get(['settings', 'stats']);
            const exportData = {
                settings: result.settings || this.defaultSettings,
                stats: result.stats || {},
                exportDate: new Date().toISOString(),
                version: chrome.runtime.getManifest().version
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `interview-capture-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Settings exported successfully', 'success');
            
        } catch (error) {
            console.error('Failed to export settings:', error);
            this.showNotification('Failed to export settings', 'error');
        }
    }

    importSettings() {
        document.getElementById('import-file').click();
    }

    async handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (importData.settings) {
                this.populateForm(importData.settings);
                await this.saveSettings();
                this.showNotification('Settings imported successfully', 'success');
            } else {
                this.showNotification('Invalid settings file format', 'error');
            }
            
        } catch (error) {
            console.error('Failed to import settings:', error);
            this.showNotification('Failed to import settings', 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }

    async exportData() {
        try {
            const result = await chrome.storage.local.get();
            const exportData = {
                ...result,
                exportDate: new Date().toISOString(),
                version: chrome.runtime.getManifest().version
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `interview-capture-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showNotification('Failed to export data', 'error');
        }
    }

    markUnsaved() {
        const saveBtn = document.querySelector('.btn-primary');
        if (saveBtn && !saveBtn.textContent.includes('*')) {
            saveBtn.textContent = '💾 Save Settings *';
            saveBtn.style.background = '#f59e0b';
        }
    }

    markSaved() {
        const saveBtn = document.querySelector('.btn-primary');
        if (saveBtn) {
            saveBtn.textContent = '💾 Save Settings';
            saveBtn.style.background = '#667eea';
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Global functions for button clicks
let optionsManager;

function saveSettings() {
    optionsManager.saveSettings();
}

function testConnection() {
    optionsManager.testConnection();
}

function resetToDefaults() {
    optionsManager.resetToDefaults();
}

function exportSettings() {
    optionsManager.exportSettings();
}

function importSettings() {
    optionsManager.importSettings();
}

function handleImportFile(event) {
    optionsManager.handleImportFile(event);
}

function exportData() {
    optionsManager.exportData();
}

function clearStats() {
    optionsManager.clearStats();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    optionsManager = new OptionsManager();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key) {
            case 'S':
                e.preventDefault();
                saveSettings();
                break;
            case 'R':
                e.preventDefault();
                resetToDefaults();
                break;
            case 'T':
                e.preventDefault();
                testConnection();
                break;
        }
    }
});
