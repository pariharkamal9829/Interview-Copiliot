// Standalone Audio Capture Injector
// This script can be injected into any web page to capture audio

(function() {
    'use strict';
    
    // Check if already injected
    if (window.interviewCaptureInjected) {
        console.log('Interview Audio Capture already injected');
        return;
    }
    
    window.interviewCaptureInjected = true;
    
    // Configuration
    const CONFIG = {
        backendUrl: 'http://localhost:3000',
        wsUrl: 'ws://localhost:3000',
        captureInterval: 3000,
        autoStart: false,
        showUI: true
    };
    
    // Load content script dynamically
    function loadContentScript() {
        return new Promise((resolve, reject) => {
            // First try to load from local file
            const script = document.createElement('script');
            script.src = '/content-script.js';
            script.onload = resolve;
            script.onerror = () => {
                // Fallback: inject script content directly
                injectScriptContent();
                resolve();
            };
            document.head.appendChild(script);
        });
    }
    
    // Inject script content directly (fallback)
    function injectScriptContent() {
        // Create script element with the content script code
        const script = document.createElement('script');
        script.textContent = `
            ${getContentScriptCode()}
        `;
        document.head.appendChild(script);
    }
    
    // Get content script code (embedded)
    function getContentScriptCode() {
        return `
            // Embedded InterviewAudioCapture class
            class InterviewAudioCapture {
                constructor(options = {}) {
                    this.backendUrl = options.backendUrl || '${CONFIG.backendUrl}';
                    this.wsUrl = options.wsUrl || '${CONFIG.wsUrl}';
                    this.captureInterval = options.captureInterval || ${CONFIG.captureInterval};
                    this.mediaRecorder = null;
                    this.audioStream = null;
                    this.socket = null;
                    this.isRecording = false;
                    this.audioChunks = [];
                    this.sessionId = this.generateSessionId();
                    
                    this.init();
                }
                
                generateSessionId() {
                    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                }
                
                async init() {
                    console.log('🎤 Interview Audio Capture initialized');
                    if (${CONFIG.showUI}) {
                        this.createControlPanel();
                    }
                    this.connectWebSocket();
                    this.setupMessageListeners();
                    
                    if (${CONFIG.autoStart}) {
                        setTimeout(() => this.startRecording(), 2000);
                    }
                }
                
                connectWebSocket() {
                    try {
                        this.socket = new WebSocket(this.wsUrl);
                        
                        this.socket.onopen = () => {
                            console.log('✅ WebSocket connected');
                            this.updateStatus && this.updateStatus('Connected', '#10b981');
                            
                            this.socket.send(JSON.stringify({
                                type: 'session-start',
                                sessionId: this.sessionId,
                                timestamp: new Date().toISOString(),
                                url: window.location.href,
                                userAgent: navigator.userAgent
                            }));
                        };
                        
                        this.socket.onmessage = (event) => {
                            const message = JSON.parse(event.data);
                            this.handleWebSocketMessage(message);
                        };
                        
                        this.socket.onclose = () => {
                            console.log('❌ WebSocket disconnected');
                            this.updateStatus && this.updateStatus('Disconnected', '#ef4444');
                            setTimeout(() => this.connectWebSocket(), 3000);
                        };
                        
                        this.socket.onerror = (error) => {
                            console.error('WebSocket error:', error);
                        };
                    } catch (error) {
                        console.error('Failed to connect WebSocket:', error);
                    }
                }
                
                handleWebSocketMessage(message) {
                    switch (message.type) {
                        case 'transcription-result':
                            console.log('📝 Transcription:', message.data);
                            break;
                        case 'ai-suggestion':
                            console.log('💡 AI Suggestion:', message.data);
                            this.showNotification('AI Suggestion', message.data.text || message.data);
                            break;
                    }
                }
                
                async startRecording() {
                    try {
                        this.audioStream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                                sampleRate: 16000
                            }
                        });
                        
                        this.mediaRecorder = new MediaRecorder(this.audioStream, {
                            mimeType: 'audio/webm;codecs=opus'
                        });
                        
                        this.audioChunks = [];
                        this.isRecording = true;
                        
                        this.mediaRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                this.audioChunks.push(event.data);
                            }
                        };
                        
                        this.mediaRecorder.onstop = () => {
                            this.processAudioChunks();
                        };
                        
                        this.mediaRecorder.start();
                        this.scheduleNextChunk();
                        
                        console.log('🎙️ Recording started');
                        this.updateRecordingUI && this.updateRecordingUI(true);
                        
                    } catch (error) {
                        console.error('Error starting recording:', error);
                        this.showNotification('Error', 'Failed to access microphone: ' + error.message);
                    }
                }
                
                stopRecording() {
                    if (this.mediaRecorder && this.isRecording) {
                        this.mediaRecorder.stop();
                        this.isRecording = false;
                        
                        if (this.audioStream) {
                            this.audioStream.getTracks().forEach(track => track.stop());
                        }
                        
                        console.log('⏹️ Recording stopped');
                        this.updateRecordingUI && this.updateRecordingUI(false);
                    }
                }
                
                scheduleNextChunk() {
                    if (this.isRecording) {
                        setTimeout(() => {
                            if (this.isRecording && this.mediaRecorder.state === 'recording') {
                                this.mediaRecorder.stop();
                                this.mediaRecorder.start();
                                this.scheduleNextChunk();
                            }
                        }, this.captureInterval);
                    }
                }
                
                async processAudioChunks() {
                    if (this.audioChunks.length === 0) return;
                    
                    try {
                        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                        this.audioChunks = [];
                        
                        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const audioData = reader.result.split(',')[1];
                                this.socket.send(JSON.stringify({
                                    type: 'audio-chunk',
                                    sessionId: this.sessionId,
                                    timestamp: new Date().toISOString(),
                                    audioData: audioData,
                                    mimeType: 'audio/webm'
                                }));
                            };
                            reader.readAsDataURL(audioBlob);
                        } else {
                            await this.uploadAudioHTTP(audioBlob);
                        }
                    } catch (error) {
                        console.error('Error processing audio chunks:', error);
                    }
                }
                
                async uploadAudioHTTP(audioBlob) {
                    try {
                        const formData = new FormData();
                        formData.append('audio', audioBlob, \`audio_$\{Date.now()}.webm\`);
                        formData.append('sessionId', this.sessionId);
                        formData.append('timestamp', new Date().toISOString());
                        
                        const response = await fetch(\`$\{this.backendUrl}/api/upload-audio\`, {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            console.log('📤 Audio uploaded successfully');
                        } else {
                            throw new Error(\`HTTP \${response.status}\`);
                        }
                    } catch (error) {
                        console.error('Error uploading audio:', error);
                    }
                }
                
                showNotification(title, message) {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(title, {
                            body: message,
                            icon: '🎤'
                        });
                    } else {
                        console.log(\`📢 $\{title}: $\{message}\`);
                    }
                }
                
                setupMessageListeners() {
                    window.addEventListener('message', (event) => {
                        if (event.data.type === 'interview-capture-command') {
                            switch (event.data.command) {
                                case 'start':
                                    this.startRecording();
                                    break;
                                case 'stop':
                                    this.stopRecording();
                                    break;
                                case 'status':
                                    event.source.postMessage({
                                        type: 'interview-capture-status',
                                        isRecording: this.isRecording,
                                        sessionId: this.sessionId
                                    }, event.origin);
                                    break;
                            }
                        }
                    });
                }
                
                createControlPanel() {
                    // Minimal UI for injected version
                    const panel = document.createElement('div');
                    panel.id = 'interview-capture-panel';
                    panel.innerHTML = \`
                        <div style="
                            position: fixed;
                            top: 10px;
                            right: 10px;
                            background: #667eea;
                            color: white;
                            padding: 8px 12px;
                            border-radius: 20px;
                            font-family: system-ui, sans-serif;
                            font-size: 12px;
                            z-index: 999999;
                            cursor: pointer;
                            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                        " onclick="window.interviewCapture.isRecording ? window.interviewCapture.stopRecording() : window.interviewCapture.startRecording()">
                            <span id="capture-status">🎤 Click to Record</span>
                        </div>
                    \`;
                    document.body.appendChild(panel);
                    
                    this.updateStatus = (status, color) => {
                        const statusEl = document.getElementById('capture-status');
                        if (statusEl) {
                            statusEl.textContent = this.isRecording ? '⏹️ Recording...' : '🎤 Click to Record';
                        }
                    };
                    
                    this.updateRecordingUI = (isRecording) => {
                        const statusEl = document.getElementById('capture-status');
                        if (statusEl) {
                            statusEl.textContent = isRecording ? '⏹️ Recording...' : '🎤 Click to Record';
                        }
                    };
                }
            }
            
            // Auto-initialize
            window.interviewCapture = new InterviewAudioCapture();
        `;
    }
    
    // Initialize injection
    async function initializeInjection() {
        try {
            console.log('🚀 Initializing Interview Audio Capture injection...');
            
            // Load and execute content script
            await injectScriptContent();
            
            console.log('✅ Interview Audio Capture injected successfully!');
            
            // Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    console.log('Notification permission:', permission);
                });
            }
            
            // Show injection notification
            showInjectionNotification();
            
        } catch (error) {
            console.error('❌ Failed to inject Interview Audio Capture:', error);
        }
    }
    
    // Show injection notification
    function showInjectionNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-family: system-ui, sans-serif;
                font-size: 14px;
                z-index: 1000000;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                animation: slideDown 0.3s ease;
            ">
                🎤 Interview Audio Capture injected! Look for the recording button in the top-right corner.
            </div>
            <style>
                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); }
                    to { transform: translate(-50%, 0); }
                }
            </style>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Expose injection functions globally
    window.injectInterviewCapture = initializeInjection;
    
    // Auto-initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeInjection);
    } else {
        initializeInjection();
    }
    
    console.log('📥 Interview Audio Capture injector loaded. Call window.injectInterviewCapture() to manually inject.');
    
})();
