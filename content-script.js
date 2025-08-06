// Content Script for Audio Capture and Backend Communication
// This script can be injected into web pages to capture audio and send to backend

class InterviewAudioCapture {
    constructor(options = {}) {
        this.backendUrl = options.backendUrl || 'http://localhost:3000';
        this.wsUrl = options.wsUrl || 'ws://localhost:3000';
        this.captureInterval = options.captureInterval || 3000; // 3 seconds
        this.mediaRecorder = null;
        this.audioStream = null;
        this.socket = null;
        this.isRecording = false;
        this.audioChunks = [];
        this.sessionId = this.generateSessionId();
        
        // UI elements
        this.controlPanel = null;
        this.statusIndicator = null;
        
        this.init();
    }

    // Initialize the audio capture system
    async init() {
        console.log('🎤 Initializing Interview Audio Capture...');
        this.createControlPanel();
        this.connectWebSocket();
        this.setupMessageListeners();
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Create floating control panel
    createControlPanel() {
        // Remove existing panel if any
        const existing = document.getElementById('interview-audio-capture');
        if (existing) existing.remove();

        this.controlPanel = document.createElement('div');
        this.controlPanel.id = 'interview-audio-capture';
        this.controlPanel.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                width: 280px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: system-ui, -apple-system, sans-serif;
                color: white;
                font-size: 14px;
                overflow: hidden;
            ">
                <div style="
                    padding: 12px 16px;
                    background: rgba(0,0,0,0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                " id="capture-header">
                    <span style="font-weight: 600;">🎤 Interview Capture</span>
                    <button id="minimize-btn" style="
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                    ">−</button>
                </div>
                
                <div id="capture-body" style="padding: 16px;">
                    <div style="margin-bottom: 12px;">
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            margin-bottom: 8px;
                        ">
                            <div id="status-indicator" style="
                                width: 12px;
                                height: 12px;
                                border-radius: 50%;
                                background: #ef4444;
                            "></div>
                            <span id="status-text">Disconnected</span>
                        </div>
                        <div style="font-size: 12px; opacity: 0.8;" id="session-info">
                            Session: ${this.sessionId}
                        </div>
                    </div>
                    
                    <div style="
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    ">
                        <button id="start-capture" style="
                            padding: 10px;
                            background: #10b981;
                            border: none;
                            border-radius: 6px;
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                        ">🎙️ Start Recording</button>
                        
                        <button id="stop-capture" style="
                            padding: 10px;
                            background: #ef4444;
                            border: none;
                            border-radius: 6px;
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                            display: none;
                        ">⏹️ Stop Recording</button>
                        
                        <div style="
                            display: flex;
                            gap: 8px;
                        ">
                            <button id="test-connection" style="
                                flex: 1;
                                padding: 8px;
                                background: rgba(255,255,255,0.2);
                                border: none;
                                border-radius: 4px;
                                color: white;
                                cursor: pointer;
                                font-size: 12px;
                            ">🔄 Test</button>
                            
                            <button id="capture-settings" style="
                                flex: 1;
                                padding: 8px;
                                background: rgba(255,255,255,0.2);
                                border: none;
                                border-radius: 4px;
                                color: white;
                                cursor: pointer;
                                font-size: 12px;
                            ">⚙️ Settings</button>
                        </div>
                    </div>
                    
                    <div id="audio-levels" style="
                        margin-top: 12px;
                        height: 6px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 3px;
                        overflow: hidden;
                        display: none;
                    ">
                        <div id="level-bar" style="
                            height: 100%;
                            background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
                            width: 0%;
                            transition: width 0.1s ease;
                        "></div>
                    </div>
                    
                    <div id="transcription-preview" style="
                        margin-top: 12px;
                        padding: 8px;
                        background: rgba(0,0,0,0.3);
                        border-radius: 6px;
                        font-size: 12px;
                        max-height: 80px;
                        overflow-y: auto;
                        display: none;
                    ">
                        <div style="opacity: 0.7; margin-bottom: 4px;">Latest transcription:</div>
                        <div id="transcription-text">No transcription yet...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.controlPanel);
        this.addEventListeners();
        this.makeDraggable();
    }

    // Add event listeners to control panel
    addEventListeners() {
        const startBtn = document.getElementById('start-capture');
        const stopBtn = document.getElementById('stop-capture');
        const testBtn = document.getElementById('test-connection');
        const settingsBtn = document.getElementById('capture-settings');
        const minimizeBtn = document.getElementById('minimize-btn');

        if (startBtn) startBtn.onclick = () => this.startRecording();
        if (stopBtn) stopBtn.onclick = () => this.stopRecording();
        if (testBtn) testBtn.onclick = () => this.testConnection();
        if (settingsBtn) settingsBtn.onclick = () => this.showSettings();
        if (minimizeBtn) minimizeBtn.onclick = () => this.toggleMinimize();
    }

    // Make control panel draggable
    makeDraggable() {
        const header = document.getElementById('capture-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === header || e.target.parentElement === header) {
                isDragging = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                this.controlPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // Connect to WebSocket server
    connectWebSocket() {
        try {
            this.socket = new WebSocket(this.wsUrl);
            
            this.socket.onopen = () => {
                console.log('✅ WebSocket connected');
                this.updateStatus('Connected', '#10b981');
                
                // Send session info
                this.socket.send(JSON.stringify({
                    type: 'session-start',
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                }));
            };

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.socket.onclose = () => {
                console.log('❌ WebSocket disconnected');
                this.updateStatus('Disconnected', '#ef4444');
                
                // Auto-reconnect after 3 seconds
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('Error', '#f59e0b');
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateStatus('Failed', '#ef4444');
        }
    }

    // Handle WebSocket messages
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'transcription-result':
                this.displayTranscription(message.data);
                break;
            case 'ai-suggestion':
                this.showAISuggestion(message.data);
                break;
            case 'session-info':
                console.log('Session info:', message.data);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    // Start audio recording
    async startRecording() {
        try {
            // Request microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                }
            });

            // Create MediaRecorder
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

            // Start recording in chunks
            this.mediaRecorder.start();
            this.scheduleNextChunk();

            // Update UI
            this.updateRecordingUI(true);
            this.startAudioLevelMonitoring();
            
            console.log('🎙️ Recording started');

        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Error accessing microphone: ' + error.message);
        }
    }

    // Stop audio recording
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
            }

            this.updateRecordingUI(false);
            console.log('⏹️ Recording stopped');
        }
    }

    // Schedule next audio chunk
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

    // Process audio chunks and send to backend
    async processAudioChunks() {
        if (this.audioChunks.length === 0) return;

        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.audioChunks = [];

            // Send via WebSocket if connected
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const reader = new FileReader();
                reader.onload = () => {
                    const audioData = reader.result.split(',')[1]; // Remove data URL prefix
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
                // Fallback to HTTP upload
                await this.uploadAudioHTTP(audioBlob);
            }

        } catch (error) {
            console.error('Error processing audio chunks:', error);
        }
    }

    // Upload audio via HTTP
    async uploadAudioHTTP(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `audio_${Date.now()}.webm`);
            formData.append('sessionId', this.sessionId);
            formData.append('timestamp', new Date().toISOString());

            const response = await fetch(`${this.backendUrl}/api/upload-audio`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📤 Audio uploaded successfully:', result);

        } catch (error) {
            console.error('Error uploading audio:', error);
        }
    }

    // Monitor audio levels
    startAudioLevelMonitoring() {
        if (!this.audioStream) return;

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(this.audioStream);
        
        analyser.fftSize = 256;
        microphone.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevels = () => {
            if (this.isRecording) {
                analyser.getByteFrequencyData(dataArray);
                
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                const level = (average / 255) * 100;
                
                const levelBar = document.getElementById('level-bar');
                if (levelBar) {
                    levelBar.style.width = level + '%';
                }
                
                requestAnimationFrame(updateLevels);
            }
        };

        updateLevels();
    }

    // Update recording UI
    updateRecordingUI(isRecording) {
        const startBtn = document.getElementById('start-capture');
        const stopBtn = document.getElementById('stop-capture');
        const audioLevels = document.getElementById('audio-levels');
        const transcriptionPreview = document.getElementById('transcription-preview');

        if (startBtn) startBtn.style.display = isRecording ? 'none' : 'block';
        if (stopBtn) stopBtn.style.display = isRecording ? 'block' : 'none';
        if (audioLevels) audioLevels.style.display = isRecording ? 'block' : 'none';
        if (transcriptionPreview) transcriptionPreview.style.display = isRecording ? 'block' : 'none';

        this.updateStatus(isRecording ? 'Recording' : 'Ready', isRecording ? '#f59e0b' : '#10b981');
    }

    // Update status indicator
    updateStatus(text, color) {
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('status-indicator');
        
        if (statusText) statusText.textContent = text;
        if (statusIndicator) statusIndicator.style.background = color;
    }

    // Display transcription result
    displayTranscription(transcription) {
        const transcriptionText = document.getElementById('transcription-text');
        if (transcriptionText) {
            transcriptionText.textContent = transcription.text || 'Processing...';
        }
    }

    // Show AI suggestion
    showAISuggestion(suggestion) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 80px;
                right: 20px;
                width: 280px;
                background: #10b981;
                color: white;
                padding: 12px;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                z-index: 1000000;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 12px;
            ">
                <div style="font-weight: 600; margin-bottom: 4px;">💡 AI Suggestion</div>
                <div>${suggestion.text || suggestion}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Test connection
    async testConnection() {
        try {
            const response = await fetch(`${this.backendUrl}/api/health`);
            const result = await response.json();
            
            alert(`Connection test successful!\nServer: ${result.status}\nTime: ${result.timestamp}`);
        } catch (error) {
            alert(`Connection test failed: ${error.message}`);
        }
    }

    // Show settings
    showSettings() {
        const settings = prompt(`Interview Audio Capture Settings:

Current Backend URL: ${this.backendUrl}
Current WebSocket URL: ${this.wsUrl}
Capture Interval: ${this.captureInterval}ms

Enter new backend URL (or press Cancel to keep current):`);

        if (settings) {
            this.backendUrl = settings;
            this.wsUrl = settings.replace('http', 'ws');
            this.connectWebSocket();
        }
    }

    // Toggle minimize
    toggleMinimize() {
        const body = document.getElementById('capture-body');
        const minimizeBtn = document.getElementById('minimize-btn');
        
        if (body && minimizeBtn) {
            const isMinimized = body.style.display === 'none';
            body.style.display = isMinimized ? 'block' : 'none';
            minimizeBtn.textContent = isMinimized ? '−' : '+';
        }
    }

    // Setup message listeners for page communication
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

    // Cleanup
    destroy() {
        this.stopRecording();
        if (this.socket) {
            this.socket.close();
        }
        if (this.controlPanel) {
            this.controlPanel.remove();
        }
    }
}

// Auto-initialize if not in iframe
if (window.self === window.top) {
    let interviewCapture = null;

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            interviewCapture = new InterviewAudioCapture();
        });
    } else {
        interviewCapture = new InterviewAudioCapture();
    }

    // Expose to global scope for manual control
    window.InterviewAudioCapture = InterviewAudioCapture;
    window.interviewCapture = interviewCapture;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterviewAudioCapture;
}
