const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const OpenAI = require('openai');
const { transcribeAudio, LiveTranscriber } = require('./whisper-transcription');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ 
    dest: 'temp/',
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Store connected clients and interview sessions
const connectedClients = new Map();
const interviewSessions = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Store client info
    connectedClients.set(socket.id, {
        id: socket.id,
        connectedAt: new Date(),
        name: null,
        role: null,
        sessionId: null
    });

    // Send welcome message
    socket.emit('connection-confirmed', {
        message: 'Connected to Interview Copilot Server',
        clientId: socket.id,
        timestamp: new Date().toISOString()
    });

    // Handle user registration
    socket.on('register', (data) => {
        handleUserRegistration(socket, data);
    });

    // Handle joining interview session
    socket.on('join-session', (data) => {
        handleJoinSession(socket, data);
    });

    // Handle transcription data
    socket.on('transcription', (data) => {
        handleTranscription(socket, data);
    });

    // Handle interview questions
    socket.on('question', (data) => {
        handleQuestion(socket, data);
    });

    // Handle candidate answers
    socket.on('answer', (data) => {
        handleAnswer(socket, data);
    });

    // Handle interviewer notes
    socket.on('note', (data) => {
        handleNote(socket, data);
    });

    // Handle AI requests
    socket.on('ai-request', async (data) => {
        await handleAIRequest(socket, data);
    });

    // Handle ping for connection health
    socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        handleDisconnection(socket);
    });
});

// User registration handler
function handleUserRegistration(socket, data) {
    const { name, role } = data;
    const client = connectedClients.get(socket.id);
    
    if (!client) return;

    if (!name || !['interviewer', 'candidate'].includes(role)) {
        socket.emit('error', {
            message: 'Invalid registration data. Name and role (interviewer/candidate) required.',
            timestamp: new Date().toISOString()
        });
        return;
    }

    // Update client info
    client.name = name;
    client.role = role;
    connectedClients.set(socket.id, client);

    // Confirm registration
    socket.emit('registration-confirmed', {
        name: name,
        role: role,
        clientId: socket.id,
        timestamp: new Date().toISOString()
    });

    // Notify others in the same session (if any)
    if (client.sessionId) {
        socket.to(client.sessionId).emit('user-joined', {
            clientId: socket.id,
            name: name,
            role: role,
            timestamp: new Date().toISOString()
        });
    }

    console.log(`User registered: ${name} as ${role} (${socket.id})`);
}

// Join interview session handler
function handleJoinSession(socket, data) {
    const { sessionId } = data;
    const client = connectedClients.get(socket.id);
    
    if (!client || !client.name) {
        socket.emit('error', {
            message: 'Please register first before joining a session',
            timestamp: new Date().toISOString()
        });
        return;
    }

    // Leave current session if any
    if (client.sessionId) {
        socket.leave(client.sessionId);
    }

    // Join new session
    socket.join(sessionId);
    client.sessionId = sessionId;
    connectedClients.set(socket.id, client);

    // Initialize session if it doesn't exist
    if (!interviewSessions.has(sessionId)) {
        interviewSessions.set(sessionId, {
            id: sessionId,
            createdAt: new Date(),
            participants: [],
            transcript: [],
            questions: [],
            notes: []
        });
    }

    // Add participant to session
    const session = interviewSessions.get(sessionId);
    session.participants.push({
        clientId: socket.id,
        name: client.name,
        role: client.role,
        joinedAt: new Date()
    });

    socket.emit('session-joined', {
        sessionId: sessionId,
        participants: session.participants,
        timestamp: new Date().toISOString()
    });

    // Notify others in session
    socket.to(sessionId).emit('user-joined-session', {
        clientId: socket.id,
        name: client.name,
        role: client.role,
        timestamp: new Date().toISOString()
    });

    console.log(`${client.name} joined session: ${sessionId}`);
}

// Transcription handler
function handleTranscription(socket, data) {
    const client = connectedClients.get(socket.id);
    if (!client || !client.sessionId) return;

    const transcriptionData = {
        type: 'transcription',
        clientId: socket.id,
        speaker: client.name,
        role: client.role,
        text: data.text,
        confidence: data.confidence || 0,
        isFinal: data.isFinal || false,
        language: data.language || 'en',
        timestamp: new Date().toISOString()
    };

    // Add to session transcript
    const session = interviewSessions.get(client.sessionId);
    if (session && data.isFinal) {
        session.transcript.push(transcriptionData);
    }

    // Broadcast to all in session
    io.to(client.sessionId).emit('transcription', transcriptionData);
    
    console.log(`Transcription from ${client.name}: "${data.text}"`);
}

// Question handler
function handleQuestion(socket, data) {
    const client = connectedClients.get(socket.id);
    if (!client || !client.sessionId) return;

    const questionData = {
        type: 'question',
        id: generateId(),
        clientId: socket.id,
        interviewer: client.name,
        question: data.question,
        category: data.category || 'general',
        difficulty: data.difficulty || 'medium',
        timestamp: new Date().toISOString()
    };

    // Add to session questions
    const session = interviewSessions.get(client.sessionId);
    if (session) {
        session.questions.push(questionData);
    }

    // Broadcast to all in session
    io.to(client.sessionId).emit('question', questionData);
    
    console.log(`Question from ${client.name}: "${data.question}"`);
}

// Answer handler
function handleAnswer(socket, data) {
    const client = connectedClients.get(socket.id);
    if (!client || !client.sessionId) return;

    const answerData = {
        type: 'answer',
        clientId: socket.id,
        candidate: client.name,
        answer: data.answer,
        questionId: data.questionId,
        timestamp: new Date().toISOString()
    };

    // Broadcast to all in session
    io.to(client.sessionId).emit('answer', answerData);
    
    console.log(`Answer from ${client.name}: "${data.answer}"`);
}

// Note handler
function handleNote(socket, data) {
    const client = connectedClients.get(socket.id);
    if (!client || !client.sessionId) return;

    const noteData = {
        type: 'note',
        clientId: socket.id,
        author: client.name,
        role: client.role,
        note: data.note,
        category: data.category || 'general',
        timestamp: new Date().toISOString()
    };

    // Add to session notes
    const session = interviewSessions.get(client.sessionId);
    if (session) {
        session.notes.push(noteData);
    }

    // Send only to interviewers in the session for privacy
    const sessionClients = Array.from(connectedClients.values())
        .filter(c => c.sessionId === client.sessionId && c.role === 'interviewer');
    
    sessionClients.forEach(c => {
        io.to(c.id).emit('note', noteData);
    });
    
    console.log(`Note from ${client.name}: "${data.note}"`);
}

// AI request handler
async function handleAIRequest(socket, data) {
    const client = connectedClients.get(socket.id);
    if (!client) return;

    const { requestType, requestData } = data;
    
    try {
        let response;
        
        switch (requestType) {
            case 'generate-questions':
                response = await generateInterviewQuestions(requestData);
                break;
            case 'analyze-answer':
                response = await analyzeAnswer(requestData);
                break;
            case 'get-feedback':
                response = await getInterviewFeedback(requestData);
                break;
            case 'suggest-followup':
                response = await suggestFollowupQuestion(requestData);
                break;
            case 'improve-transcription':
                response = await improveTranscription(requestData);
                break;
            default:
                throw new Error(`Unknown AI request type: ${requestType}`);
        }

        socket.emit('ai-response', {
            requestType: requestType,
            data: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`AI request error for client ${socket.id}:`, error);
        socket.emit('ai-error', {
            requestType: requestType,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Disconnection handler
function handleDisconnection(socket) {
    const client = connectedClients.get(socket.id);
    
    if (client) {
        // Notify session participants
        if (client.sessionId) {
            socket.to(client.sessionId).emit('user-left', {
                clientId: socket.id,
                name: client.name,
                role: client.role,
                timestamp: new Date().toISOString()
            });
            
            // Remove from session participants
            const session = interviewSessions.get(client.sessionId);
            if (session) {
                session.participants = session.participants.filter(p => p.clientId !== socket.id);
            }
        }
        
        console.log(`Client disconnected: ${client.name || 'Unknown'} (${socket.id})`);
    }
    
    connectedClients.delete(socket.id);
}

// AI Functions
async function generateInterviewQuestions(data) {
    const { position, level, category, count = 5 } = data;
    
    const prompt = `Generate ${count} ${category} interview questions for a ${level} level ${position} position.
    
    Return as JSON array with this structure:
    [{"question": "...", "category": "${category}", "difficulty": "${level}", "expectedSkills": ["skill1", "skill2"], "timeEstimate": "2-3 minutes"}]`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert technical interviewer. Generate relevant, insightful questions."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 1500
    });

    try {
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        return { 
            error: "Failed to parse AI response",
            raw_response: completion.choices[0].message.content 
        };
    }
}

async function analyzeAnswer(data) {
    const { question, answer, expectedSkills = [] } = data;
    
    const prompt = `Analyze this interview answer:
    
    Question: "${question}"
    Answer: "${answer}"
    Expected Skills: ${expectedSkills.join(', ')}
    
    Return JSON analysis:
    {
        "overall_score": 0-10,
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "technical_accuracy": 0-10,
        "communication_clarity": 0-10,
        "completeness": 0-10,
        "recommendations": ["rec1", "rec2"],
        "followup_questions": ["q1", "q2"]
    }`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert interviewer analyzing responses. Be fair and constructive."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.3,
        max_tokens: 1000
    });

    try {
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        return { 
            error: "Failed to parse AI response",
            raw_response: completion.choices[0].message.content 
        };
    }
}

async function getInterviewFeedback(data) {
    const { sessionId } = data;
    const session = interviewSessions.get(sessionId);
    
    if (!session) {
        throw new Error('Session not found');
    }
    
    const transcript = session.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
    const questions = session.questions.map(q => q.question).join('\n');
    
    const prompt = `Provide comprehensive interview feedback:
    
    Transcript: ${transcript}
    Questions: ${questions}
    
    Return JSON feedback:
    {
        "overall_score": 0-10,
        "recommendation": "hire|maybe|no_hire",
        "summary": "Brief assessment",
        "technical_skills": {"score": 0-10, "comments": "..."},
        "communication": {"score": 0-10, "comments": "..."},
        "problem_solving": {"score": 0-10, "comments": "..."},
        "strengths": ["strength1", "strength2"],
        "improvement_areas": ["area1", "area2"]
    }`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are a senior interviewer providing comprehensive assessment."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.3,
        max_tokens: 2000
    });

    try {
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        return { 
            error: "Failed to parse AI response",
            raw_response: completion.choices[0].message.content 
        };
    }
}

async function suggestFollowupQuestion(data) {
    const { previousQuestion, answer, context = '' } = data;
    
    const prompt = `Suggest a follow-up question:
    
    Previous Question: "${previousQuestion}"
    Answer: "${answer}"
    Context: ${context}
    
    Return JSON:
    {
        "followup_question": "...",
        "reasoning": "why this follow-up is valuable",
        "category": "technical|behavioral|clarification",
        "difficulty": "easy|medium|hard"
    }`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert at asking insightful follow-up questions."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.6,
        max_tokens: 500
    });

    try {
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        return { 
            error: "Failed to parse AI response",
            raw_response: completion.choices[0].message.content 
        };
    }
}

async function improveTranscription(data) {
    const { text, context = '' } = data;
    
    const prompt = `Improve this transcribed text for clarity and grammar while preserving the original meaning:
    
    Original: "${text}"
    Context: ${context}
    
    Return JSON:
    {
        "improved_text": "...",
        "changes_made": ["change1", "change2"],
        "confidence": 0-1
    }`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert at improving transcribed text while preserving original meaning."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.3,
        max_tokens: 500
    });

    try {
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        return { 
            error: "Failed to parse AI response",
            raw_response: completion.choices[0].message.content 
        };
    }
}

// REST API Endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        connectedClients: connectedClients.size,
        activeSessions: interviewSessions.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(interviewSessions.values()).map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        participantCount: session.participants.length,
        questionCount: session.questions.length,
        transcriptLength: session.transcript.length
    }));

    res.json({
        totalSessions: sessions.length,
        sessions: sessions,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = interviewSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
        session: session,
        timestamp: new Date().toISOString()
    });
});

// AI REST endpoints
app.post('/api/ai/generate-questions', async (req, res) => {
    try {
        const questions = await generateInterviewQuestions(req.body);
        res.json({ success: true, questions, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/analyze-answer', async (req, res) => {
    try {
        const analysis = await analyzeAnswer(req.body);
        res.json({ success: true, analysis, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/session-feedback/:sessionId', async (req, res) => {
    try {
        const feedback = await getInterviewFeedback({ sessionId: req.params.sessionId });
        res.json({ success: true, feedback, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Audio transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No audio file provided' 
            });
        }

        const { language, prompt } = req.body;
        const result = await transcribeAudio(req.file.path, language, prompt);
        
        // Clean up uploaded file
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json(result);

    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Interview Copilot Server with Socket.IO',
        version: '2.0.0',
        features: [
            'Real-time Socket.IO communication',
            'Interview session management',
            'AI-powered question generation',
            'Answer analysis and feedback',
            'Live transcription support',
            'Collaborative note-taking'
        ],
        endpoints: {
            socketio: `ws://localhost:${PORT}`,
            health: '/health',
            sessions: '/api/sessions',
            ai: {
                generateQuestions: 'POST /api/ai/generate-questions',
                analyzeAnswer: 'POST /api/ai/analyze-answer',
                sessionFeedback: 'POST /api/ai/session-feedback/:sessionId'
            }
        },
        timestamp: new Date().toISOString()
    });
});

// Helper functions
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Interview Copilot Server running on port ${PORT}`);
    console.log(`📡 Socket.IO endpoint: ws://localhost:${PORT}`);
    console.log(`🔗 Test interface: http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
