const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Create temp directory for audio files
const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for audio uploads
const upload = multer({
    dest: tempDir,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /audio\/.*/;
        if (allowedTypes.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(audioFilePath, language = null) {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFilePath));
        formData.append('model', 'whisper-1');
        
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
                },
                timeout: 30000 // 30 seconds timeout
            }
        );

        return {
            success: true,
            text: response.data.text,
            language: response.data.language,
            duration: response.data.duration,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Whisper transcription error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Main transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided'
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'OpenAI API key not configured'
            });
        }

        console.log(`📁 Processing audio file: ${req.file.originalname} (${req.file.size} bytes)`);

        const language = req.body.language || null;
        const result = await transcribeWithWhisper(req.file.path, language);

        // Clean up the uploaded file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.log(`✅ Transcription ${result.success ? 'successful' : 'failed'}`);
        
        res.json(result);

    } catch (error) {
        console.error('Transcription endpoint error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        whisperEnabled: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Whisper Microphone Transcription Server',
        endpoints: {
            transcribe: 'POST /api/transcribe',
            health: 'GET /health',
            interface: '/microphone.html'
        },
        supportedFormats: ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/webm', 'audio/ogg'],
        maxFileSize: '25MB',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: error.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎤 Whisper Transcription Server running on port ${PORT}`);
    console.log(`🌐 Microphone interface: http://localhost:${PORT}/microphone.html`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
