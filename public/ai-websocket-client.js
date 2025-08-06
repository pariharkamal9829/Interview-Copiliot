// WebSocket AI Suggestions Component
class AIWebSocketClient {
    constructor(options = {}) {
        this.wsUrl = options.wsUrl || 'ws://localhost:3000';
        this.container = options.container || document.body;
        this.socket = null;
        this.isConnected = false;
        this.suggestions = [];
        this.onSuggestion = options.onSuggestion || this.defaultSuggestionHandler;
        this.onConnection = options.onConnection || (() => {});
        this.onError = options.onError || console.error;
        
        this.init();
    }

    // Initialize WebSocket connection and UI
    init() {
        this.createUI();
        this.connect();
    }

    // Connect to Socket.IO server
    connect() {
        try {
            // Use Socket.IO if available, fallback to WebSocket
            if (typeof io !== 'undefined') {
                this.socket = io(this.wsUrl.replace('ws://', 'http://'));
                
                this.socket.on('connect', () => {
                    this.isConnected = true;
                    this.updateConnectionStatus('Connected', 'success');
                    console.log('✅ Socket.IO connected');
                    this.onConnection(true);
                });

                this.socket.on('disconnect', () => {
                    this.isConnected = false;
                    this.updateConnectionStatus('Disconnected', 'error');
                    console.log('❌ Socket.IO disconnected');
                    this.onConnection(false);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Socket.IO error:', error);
                    this.onError(error);
                    this.updateConnectionStatus('Connection Error', 'error');
                });

                // Listen for AI suggestions
                this.socket.on('ai-suggestion', (data) => {
                    this.handleMessage(data);
                });

                // Listen for transcriptions
                this.socket.on('transcription', (data) => {
                    this.handleMessage(data);
                });
                
                // Listen for all messages
                this.socket.onAny((eventName, data) => {
                    console.log('📨 Socket.IO event:', eventName, data);
                    if (typeof data === 'object' && data.type) {
                        this.handleMessage(data);
                    }
                });

            } else {
                // Fallback to raw WebSocket
                this.socket = new WebSocket(this.wsUrl);
                
                this.socket.onopen = () => {
                    this.isConnected = true;
                    this.updateConnectionStatus('Connected', 'success');
                    console.log('✅ WebSocket connected');
                    this.onConnection(true);
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.socket.onclose = () => {
                    this.isConnected = false;
                    this.updateConnectionStatus('Disconnected', 'error');
                    console.log('❌ WebSocket disconnected');
                    this.onConnection(false);
                    
                    // Auto-reconnect after 3 seconds
                    setTimeout(() => this.connect(), 3000);
                };

                this.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.onError(error);
                    this.updateConnectionStatus('Connection Error', 'error');
                };
            }

        } catch (error) {
            console.error('Failed to connect:', error);
            this.onError(error);
        }
    }

    // Handle incoming WebSocket messages
    handleMessage(message) {
        console.log('📨 Received message:', message);

        switch (message.type) {
            case 'ai-response':
                this.handleAIResponse(message);
                break;
            case 'transcription':
                this.handleTranscription(message);
                break;
            case 'question':
                this.handleQuestion(message);
                break;
            case 'answer':
                this.handleAnswer(message);
                break;
            case 'suggestion':
                this.handleSuggestion(message);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    // Handle AI response messages
    handleAIResponse(message) {
        const suggestion = {
            id: Date.now(),
            type: 'ai-response',
            title: '🤖 AI Analysis',
            content: this.formatAIResponse(message.data),
            timestamp: new Date(),
            source: 'AI Assistant'
        };
        
        this.addSuggestion(suggestion);
        this.onSuggestion(suggestion);
    }

    // Handle transcription messages
    handleTranscription(message) {
        if (message.isFinal) {
            const suggestion = {
                id: Date.now(),
                type: 'transcription',
                title: '🎤 Speech Detected',
                content: `"${message.text}"`,
                timestamp: new Date(),
                source: message.speaker || 'Unknown Speaker',
                confidence: message.confidence
            };
            
            this.addSuggestion(suggestion);
        }
    }

    // Handle question messages
    handleQuestion(message) {
        const suggestion = {
            id: Date.now(),
            type: 'question',
            title: '❓ Interview Question',
            content: message.question,
            timestamp: new Date(),
            source: message.interviewer || 'Interviewer',
            category: message.category,
            difficulty: message.difficulty
        };
        
        this.addSuggestion(suggestion);
        this.requestQuestionAnalysis(message.question);
    }

    // Handle answer messages
    handleAnswer(message) {
        const suggestion = {
            id: Date.now(),
            type: 'answer',
            title: '💬 Candidate Response',
            content: message.answer,
            timestamp: new Date(),
            source: message.candidate || 'Candidate'
        };
        
        this.addSuggestion(suggestion);
        this.requestAnswerAnalysis(message.answer);
    }

    // Handle suggestion messages
    handleSuggestion(message) {
        const suggestion = {
            id: Date.now(),
            type: 'suggestion',
            title: '💡 AI Suggestion',
            content: message.suggestion,
            timestamp: new Date(),
            source: 'AI Assistant'
        };
        
        this.addSuggestion(suggestion);
    }

    // Format AI response for display
    formatAIResponse(data) {
        if (typeof data === 'string') return data;
        
        let formatted = '';
        
        if (data.overall_score) {
            formatted += `📊 Overall Score: ${data.overall_score}/10\n\n`;
        }
        
        if (data.strengths && data.strengths.length > 0) {
            formatted += `💪 Strengths:\n${data.strengths.map(s => `• ${s}`).join('\n')}\n\n`;
        }
        
        if (data.weaknesses && data.weaknesses.length > 0) {
            formatted += `🔧 Areas for Improvement:\n${data.weaknesses.map(w => `• ${w}`).join('\n')}\n\n`;
        }
        
        if (data.recommendations && data.recommendations.length > 0) {
            formatted += `📋 Recommendations:\n${data.recommendations.map(r => `• ${r}`).join('\n')}\n\n`;
        }
        
        if (data.followup_questions && data.followup_questions.length > 0) {
            formatted += `❓ Follow-up Questions:\n${data.followup_questions.map(q => `• ${q}`).join('\n')}`;
        }
        
        return formatted || JSON.stringify(data, null, 2);
    }

    // Add suggestion to the list
    addSuggestion(suggestion) {
        this.suggestions.unshift(suggestion);
        
        // Keep only last 20 suggestions
        if (this.suggestions.length > 20) {
            this.suggestions = this.suggestions.slice(0, 20);
        }
        
        this.updateSuggestionsDisplay();
    }

    // Request AI analysis for a question
    requestQuestionAnalysis(question) {
        if (this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'ai-request',
                requestType: 'suggest-followup',
                requestData: {
                    previousQuestion: question,
                    answer: 'Question asked, awaiting response',
                    context: 'Live interview session'
                }
            }));
        }
    }

    // Request AI analysis for an answer
    requestAnswerAnalysis(answer) {
        if (this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'ai-request',
                requestType: 'analyze-answer',
                requestData: {
                    question: 'General interview response',
                    answer: answer,
                    expectedSkills: ['Communication', 'Technical Knowledge']
                }
            }));
        }
    }

    // Create the UI elements
    createUI() {
        // Main container
        this.container.innerHTML = `
            <div id="ai-suggestions-panel" style="
                position: fixed;
                top: 20px;
                left: 20px;
                width: 350px;
                height: 500px;
                background: white;
                border: 1px solid #e1e5e9;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                z-index: 10000;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
            ">
                <div id="suggestions-header" style="
                    padding: 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 11px 11px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                    font-size: 14px;
                ">
                    <span>🤖 AI Suggestions</span>
                    <div id="connection-status" style="
                        padding: 4px 8px;
                        border-radius: 12px;
                        background: rgba(255,255,255,0.2);
                        font-size: 12px;
                    ">Connecting...</div>
                </div>
                
                <div id="suggestions-controls" style="
                    padding: 12px 16px;
                    border-bottom: 1px solid #e1e5e9;
                    display: flex;
                    gap: 8px;
                ">
                    <button id="clear-suggestions" style="
                        padding: 6px 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        background: white;
                        cursor: pointer;
                        font-size: 12px;
                    ">🗑️ Clear</button>
                    <button id="reconnect-ws" style="
                        padding: 6px 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        background: white;
                        cursor: pointer;
                        font-size: 12px;
                    ">🔄 Reconnect</button>
                </div>
                
                <div id="suggestions-list" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                ">
                    <div style="
                        text-align: center;
                        color: #6b7280;
                        font-size: 14px;
                        margin-top: 50px;
                    ">
                        💭 Waiting for AI suggestions...<br>
                        <small>Connect to the interview session to see real-time insights</small>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('clear-suggestions').onclick = () => this.clearSuggestions();
        document.getElementById('reconnect-ws').onclick = () => this.reconnect();
    }

    // Update connection status display
    updateConnectionStatus(status, type) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.style.background = type === 'success' 
                ? 'rgba(16, 185, 129, 0.2)' 
                : 'rgba(239, 68, 68, 0.2)';
        }
    }

    // Update suggestions display
    updateSuggestionsDisplay() {
        const listEl = document.getElementById('suggestions-list');
        if (!listEl) return;

        if (this.suggestions.length === 0) {
            listEl.innerHTML = `
                <div style="
                    text-align: center;
                    color: #6b7280;
                    font-size: 14px;
                    margin-top: 50px;
                ">
                    💭 No suggestions yet...<br>
                    <small>AI suggestions will appear here in real-time</small>
                </div>
            `;
            return;
        }

        listEl.innerHTML = this.suggestions.map(suggestion => `
            <div style="
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                border-left: 4px solid ${this.getSuggestionColor(suggestion.type)};
            ">
                <div style="
                    font-weight: 600;
                    font-size: 13px;
                    color: #374151;
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>${suggestion.title}</span>
                    <span style="
                        font-size: 11px;
                        color: #6b7280;
                        font-weight: normal;
                    ">${this.formatTime(suggestion.timestamp)}</span>
                </div>
                <div style="
                    font-size: 12px;
                    color: #4b5563;
                    line-height: 1.4;
                    white-space: pre-wrap;
                ">${suggestion.content}</div>
                <div style="
                    font-size: 11px;
                    color: #9ca3af;
                    margin-top: 8px;
                    font-style: italic;
                ">Source: ${suggestion.source}</div>
            </div>
        `).join('');
    }

    // Get color for suggestion type
    getSuggestionColor(type) {
        const colors = {
            'ai-response': '#667eea',
            'transcription': '#10b981',
            'question': '#f59e0b',
            'answer': '#3b82f6',
            'suggestion': '#8b5cf6'
        };
        return colors[type] || '#6b7280';
    }

    // Format timestamp
    formatTime(timestamp) {
        return timestamp.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Clear all suggestions
    clearSuggestions() {
        this.suggestions = [];
        this.updateSuggestionsDisplay();
    }

    // Reconnect WebSocket
    reconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.connect();
    }

    // Default suggestion handler
    defaultSuggestionHandler(suggestion) {
        console.log('📝 New suggestion:', suggestion);
    }

    // Send message to WebSocket
    send(message) {
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected');
        }
    }

    // Cleanup
    destroy() {
        if (this.socket) {
            this.socket.close();
        }
        const panel = document.getElementById('ai-suggestions-panel');
        if (panel) {
            panel.remove();
        }
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    window.aiClient = new AIWebSocketClient({
        wsUrl: 'ws://localhost:3000',
        container: document.body,
        onSuggestion: (suggestion) => {
            console.log('🎯 AI Suggestion received:', suggestion);
            
            // Optional: Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(suggestion.title, {
                    body: suggestion.content.substring(0, 100) + '...',
                    icon: '🤖'
                });
            }
        },
        onConnection: (connected) => {
            console.log(connected ? '🟢 WebSocket connected' : '🔴 WebSocket disconnected');
        }
    });
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIWebSocketClient;
}
