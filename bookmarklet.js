// Bookmarklet for Interview Audio Capture
// Copy this code and create a bookmark with it as the URL

javascript:(function(){
    // Check if already injected
    if (window.interviewCaptureInjected) {
        alert('Interview Audio Capture already active!');
        return;
    }
    
    window.interviewCaptureInjected = true;
    
    // Configuration
    const config = {
        backendUrl: 'http://localhost:3000',
        wsUrl: 'ws://localhost:3000'
    };
    
    // Create minimal capture interface
    function createCaptureInterface() {
        const panel = document.createElement('div');
        panel.id = 'interview-capture-bookmarklet';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-family: system-ui, sans-serif;
                font-size: 14px;
                z-index: 999999;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                cursor: move;
                min-width: 200px;
            " id="capture-panel">
                <div style="margin-bottom: 8px; font-weight: 600;">
                    🎤 Interview Capture
                </div>
                <div style="margin-bottom: 12px; font-size: 12px; opacity: 0.8;" id="status-text">
                    Ready to record
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="start-btn" style="
                        flex: 1;
                        padding: 8px;
                        border: none;
                        border-radius: 4px;
                        background: #10b981;
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                    ">Start</button>
                    <button id="stop-btn" style="
                        flex: 1;
                        padding: 8px;
                        border: none;
                        border-radius: 4px;
                        background: #ef4444;
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                        display: none;
                    ">Stop</button>
                    <button id="close-btn" style="
                        padding: 8px;
                        border: none;
                        border-radius: 4px;
                        background: rgba(255,255,255,0.2);
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                    ">✕</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        return panel;
    }
    
    // Simple audio capture class
    class SimpleAudioCapture {
        constructor() {
            this.mediaRecorder = null;
            this.audioStream = null;
            this.socket = null;
            this.isRecording = false;
            this.audioChunks = [];
            this.sessionId = 'session_' + Date.now();
            
            this.init();
        }
        
        async init() {
            this.panel = createCaptureInterface();
            this.setupEventListeners();
            this.connectWebSocket();
        }
        
        setupEventListeners() {
            const startBtn = document.getElementById('start-btn');
            const stopBtn = document.getElementById('stop-btn');
            const closeBtn = document.getElementById('close-btn');
            
            startBtn.onclick = () => this.startRecording();
            stopBtn.onclick = () => this.stopRecording();
            closeBtn.onclick = () => this.destroy();
            
            // Make draggable
            let isDragging = false;
            const panel = document.getElementById('capture-panel');
            
            panel.onmousedown = (e) => {
                isDragging = true;
                const rect = panel.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                
                document.onmousemove = (e) => {
                    if (isDragging) {
                        panel.style.left = (e.clientX - offsetX) + 'px';
                        panel.style.top = (e.clientY - offsetY) + 'px';
                        panel.style.right = 'auto';
                    }
                };
                
                document.onmouseup = () => {
                    isDragging = false;
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
        }
        
        connectWebSocket() {
            try {
                this.socket = new WebSocket(config.wsUrl);
                
                this.socket.onopen = () => {
                    this.updateStatus('Connected');
                    console.log('✅ WebSocket connected');
                };
                
                this.socket.onclose = () => {
                    this.updateStatus('Disconnected');
                    console.log('❌ WebSocket disconnected');
                };
                
                this.socket.onerror = () => {
                    this.updateStatus('Connection error');
                };
            } catch (error) {
                this.updateStatus('Connection failed');
                console.error('WebSocket connection failed:', error);
            }
        }
        
        async startRecording() {
            try {
                this.audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                
                this.mediaRecorder = new MediaRecorder(this.audioStream);
                this.audioChunks = [];
                this.isRecording = true;
                
                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };
                
                this.mediaRecorder.onstop = () => {
                    this.processAudio();
                };
                
                this.mediaRecorder.start(3000); // 3 second chunks
                this.updateUI(true);
                this.updateStatus('Recording...');
                
                console.log('🎙️ Recording started');
                
            } catch (error) {
                alert('Error accessing microphone: ' + error.message);
                console.error('Recording error:', error);
            }
        }
        
        stopRecording() {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.stop();
                this.isRecording = false;
                
                if (this.audioStream) {
                    this.audioStream.getTracks().forEach(track => track.stop());
                }
                
                this.updateUI(false);
                this.updateStatus('Stopped');
                console.log('⏹️ Recording stopped');
            }
        }
        
        async processAudio() {
            if (this.audioChunks.length === 0) return;
            
            try {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.audioChunks = [];
                
                // Send via WebSocket if connected
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
                    // Fallback to HTTP upload
                    await this.uploadAudioHTTP(audioBlob);
                }
                
                // Continue recording if still active
                if (this.isRecording) {
                    this.mediaRecorder.start(3000);
                }
                
            } catch (error) {
                console.error('Error processing audio:', error);
            }
        }
        
        async uploadAudioHTTP(audioBlob) {
            try {
                const formData = new FormData();
                formData.append('audio', audioBlob, `audio_${Date.now()}.webm`);
                formData.append('sessionId', this.sessionId);
                
                const response = await fetch(`${config.backendUrl}/api/upload-audio`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    console.log('📤 Audio uploaded');
                } else {
                    console.error('Upload failed:', response.status);
                }
            } catch (error) {
                console.error('Upload error:', error);
            }
        }
        
        updateStatus(status) {
            const statusEl = document.getElementById('status-text');
            if (statusEl) {
                statusEl.textContent = status;
            }
        }
        
        updateUI(isRecording) {
            const startBtn = document.getElementById('start-btn');
            const stopBtn = document.getElementById('stop-btn');
            
            if (startBtn && stopBtn) {
                startBtn.style.display = isRecording ? 'none' : 'block';
                stopBtn.style.display = isRecording ? 'block' : 'none';
            }
        }
        
        destroy() {
            this.stopRecording();
            if (this.socket) this.socket.close();
            if (this.panel) this.panel.remove();
            window.interviewCaptureInjected = false;
        }
    }
    
    // Initialize capture
    window.interviewCapture = new SimpleAudioCapture();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            font-family: system-ui, sans-serif;
            z-index: 1000000;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        ">
            🎤 Interview Audio Capture activated!<br>
            <small>Look for the control panel in the top-right corner.</small>
        </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    
})();
