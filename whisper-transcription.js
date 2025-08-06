const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

/**
 * Transcribe audio file using OpenAI Whisper API
 * @param {string} audioFilePath - Path to audio file
 * @param {string} language - Language code (optional)
 * @param {string} prompt - Context prompt (optional)
 * @returns {Promise<Object>} - Transcription result
 */
async function transcribeAudio(audioFilePath, language = null, prompt = null) {
    try {
        // Check if file exists
        if (!fs.existsSync(audioFilePath)) {
            throw new Error(`Audio file not found: ${audioFilePath}`);
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFilePath));
        formData.append('model', 'whisper-1');
        
        if (language) {
            formData.append('language', language);
        }
        
        if (prompt) {
            formData.append('prompt', prompt);
        }

        // Make API request
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            }
        );

        return {
            success: true,
            text: response.data.text,
            language: response.data.language || language,
            duration: response.data.duration,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Whisper API Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Transcribe audio with timestamps using Whisper API
 */
async function transcribeWithTimestamps(audioFilePath, language = null) {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFilePath));
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'word');
        
        if (language) {
            formData.append('language', language);
        }

        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            }
        );

        return {
            success: true,
            text: response.data.text,
            words: response.data.words,
            segments: response.data.segments,
            language: response.data.language,
            duration: response.data.duration,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Real-time transcription handler for audio chunks
 */
class AudioTranscriber {
    constructor(options = {}) {
        this.language = options.language || null;
        this.prompt = options.prompt || null;
        this.tempDir = options.tempDir || './temp';
        this.onTranscription = options.onTranscription || console.log;
        this.onError = options.onError || console.error;
        
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Transcribe audio buffer
     */
    async transcribeBuffer(audioBuffer, filename = null) {
        try {
            // Generate unique filename
            const tempFileName = filename || `audio_${Date.now()}.wav`;
            const tempFilePath = path.join(this.tempDir, tempFileName);

            // Write buffer to temporary file
            fs.writeFileSync(tempFilePath, audioBuffer);

            // Transcribe the file
            const result = await transcribeAudio(tempFilePath, this.language, this.prompt);

            // Clean up temporary file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            if (result.success) {
                this.onTranscription(result);
            } else {
                this.onError(result.error);
            }

            return result;

        } catch (error) {
            this.onError(error.message);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Process audio file
     */
    async transcribeFile(filePath) {
        const result = await transcribeAudio(filePath, this.language, this.prompt);
        
        if (result.success) {
            this.onTranscription(result);
        } else {
            this.onError(result.error);
        }

        return result;
    }

    /**
     * Clean up temp directory
     */
    cleanup() {
        if (fs.existsSync(this.tempDir)) {
            const files = fs.readdirSync(this.tempDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(this.tempDir, file));
            });
        }
    }
}

/**
 * Live transcription with WebSocket integration
 */
class LiveTranscriber extends AudioTranscriber {
    constructor(socket, options = {}) {
        super(options);
        this.socket = socket;
        this.isActive = false;
        this.sessionId = options.sessionId || null;
    }

    start() {
        this.isActive = true;
        console.log('Live transcription started');
        
        // Notify socket clients
        if (this.socket) {
            this.socket.emit('transcription-started', {
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            });
        }
    }

    stop() {
        this.isActive = false;
        this.cleanup();
        console.log('Live transcription stopped');
        
        // Notify socket clients
        if (this.socket) {
            this.socket.emit('transcription-stopped', {
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            });
        }
    }

    async processAudioChunk(audioData, isFinal = false) {
        if (!this.isActive) return;

        try {
            const result = await this.transcribeBuffer(audioData);
            
            if (result.success && this.socket) {
                // Emit transcription via socket
                this.socket.emit('live-transcription', {
                    text: result.text,
                    isFinal: isFinal,
                    confidence: 0.95, // Whisper doesn't provide confidence, use default
                    language: result.language,
                    sessionId: this.sessionId,
                    timestamp: result.timestamp
                });
            }

            return result;

        } catch (error) {
            this.onError(error.message);
            return { success: false, error: error.message };
        }
    }
}

// Example usage functions
async function exampleBasicTranscription() {
    console.log('🎤 Basic Audio Transcription Example\n');
    
    // Example with a sample audio file
    const audioFile = './sample-audio.wav'; // You need to provide this
    
    if (fs.existsSync(audioFile)) {
        const result = await transcribeAudio(audioFile, 'en');
        console.log('Transcription Result:', result);
    } else {
        console.log('Sample audio file not found. Please provide an audio file to test.');
    }
}

async function exampleRealtimeTranscription() {
    console.log('🔴 Real-time Transcription Example\n');
    
    // Create transcriber instance
    const transcriber = new AudioTranscriber({
        language: 'en',
        onTranscription: (result) => {
            console.log('📝 Transcription:', result.text);
        },
        onError: (error) => {
            console.error('❌ Error:', error);
        }
    });

    // Simulate audio buffer processing
    console.log('Transcriber ready. In a real app, you would:');
    console.log('1. Capture audio from microphone');
    console.log('2. Convert to audio buffer');
    console.log('3. Call transcriber.transcribeBuffer(audioBuffer)');
}

module.exports = {
    transcribeAudio,
    transcribeWithTimestamps,
    AudioTranscriber,
    LiveTranscriber,
    exampleBasicTranscription,
    exampleRealtimeTranscription
};
