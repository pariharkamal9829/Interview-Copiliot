const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();
const OpenAI = require('openai');
const OpenAIService = require('./openai-service');
require('dotenv').config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

// Initialize OpenAI service
const openaiService = new OpenAIService();

// Store interview sessions
const interviewSessions = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    clients.set(clientId, {
        ws: ws,
        id: clientId,
        connectedAt: new Date(),
        isInterviewer: false,
        isCandidate: false
    });

    console.log(`Client ${clientId} connected. Total clients: ${clients.size}`);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Interview Copilot WebSocket server',
        clientId: clientId,
        timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(clientId, message);
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid JSON format',
                timestamp: new Date().toISOString()
            }));
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected. Total clients: ${clients.size}`);
        
        // Notify other clients about disconnection
        broadcastToOthers(clientId, {
            type: 'user_disconnected',
            clientId: clientId,
            timestamp: new Date().toISOString()
        });
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    });
});

// Message handler
function handleMessage(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    console.log(`Message from ${clientId}:`, message);

    switch (message.type) {
        case 'register':
            handleRegistration(clientId, message);
            break;
        
        case 'transcription':
            handleTranscription(clientId, message);
            break;
        
        case 'question':
            handleQuestion(clientId, message);
            break;
        
        case 'answer':
            handleAnswer(clientId, message);
            break;
        
        case 'note':
            handleNote(clientId, message);
            break;
        
        case 'ai_generate_questions':
            handleAIGenerateQuestions(clientId, message);
            break;
        
        case 'ai_analyze_answer':
            handleAIAnalyzeAnswer(clientId, message);
            break;
        
        case 'ai_generate_followup':
            handleAIGenerateFollowup(clientId, message);
            break;
        
        case 'ai_improve_transcription':
            handleAIImproveTranscription(clientId, message);
            break;
        
        case 'ai_interview_summary':
            handleAIInterviewSummary(clientId, message);
            break;
        
        case 'ai_interview_insights':
            handleAIInterviewInsights(clientId, message);
            break;
        
        case 'ping':
            client.ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
            }));
            break;
        
        case 'ai_request':
            handleAIRequest(clientId, message);
            break;
        
        default:
            client.ws.send(JSON.stringify({
                type: 'error',
                message: `Unknown message type: ${message.type}`,
                timestamp: new Date().toISOString()
            }));
    }
}

// Handle user registration (interviewer or candidate)
function handleRegistration(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    const { role, name } = message;
    
    if (role === 'interviewer' || role === 'candidate') {
        client.isInterviewer = role === 'interviewer';
        client.isCandidate = role === 'candidate';
        client.name = name || 'Anonymous';
        
        // Confirm registration
        client.ws.send(JSON.stringify({
            type: 'registration_confirmed',
            role: role,
            name: client.name,
            timestamp: new Date().toISOString()
        }));

        // Notify other clients
        broadcastToOthers(clientId, {
            type: 'user_joined',
            clientId: clientId,
            role: role,
            name: client.name,
            timestamp: new Date().toISOString()
        });

        console.log(`Client ${clientId} registered as ${role} (${client.name})`);
    } else {
        client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid role. Must be "interviewer" or "candidate"',
            timestamp: new Date().toISOString()
        }));
    }
}

// Handle transcribed text
function handleTranscription(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    const { text, confidence, isFinal, language } = message;
    
    // Broadcast transcription to all other clients
    const transcriptionData = {
        type: 'transcription',
        clientId: clientId,
        speaker: client.name || 'Unknown',
        role: client.isInterviewer ? 'interviewer' : (client.isCandidate ? 'candidate' : 'unknown'),
        text: text,
        confidence: confidence || 0,
        isFinal: isFinal || false,
        language: language || 'en',
        timestamp: new Date().toISOString()
    };

    broadcastToAll(transcriptionData);
    console.log(`Transcription from ${client.name}: "${text}"`);
}

// Handle interview questions
function handleQuestion(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    const questionData = {
        type: 'question',
        clientId: clientId,
        interviewer: client.name || 'Unknown',
        question: message.question,
        category: message.category || 'general',
        difficulty: message.difficulty || 'medium',
        timestamp: new Date().toISOString()
    };

    broadcastToAll(questionData);
    console.log(`Question from ${client.name}: "${message.question}"`);
}

// Handle candidate answers
function handleAnswer(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    const answerData = {
        type: 'answer',
        clientId: clientId,
        candidate: client.name || 'Unknown',
        answer: message.answer,
        questionId: message.questionId,
        timestamp: new Date().toISOString()
    };

    broadcastToAll(answerData);
    console.log(`Answer from ${client.name}: "${message.answer}"`);
}

// Handle notes
function handleNote(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    const noteData = {
        type: 'note',
        clientId: clientId,
        author: client.name || 'Unknown',
        role: client.isInterviewer ? 'interviewer' : (client.isCandidate ? 'candidate' : 'unknown'),
        note: message.note,
        category: message.category || 'general',
        timestamp: new Date().toISOString()
    };

    // Notes are only sent to interviewers for privacy
    broadcastToRole('interviewer', noteData);
    console.log(`Note from ${client.name}: "${message.note}"`);
}

// AI Handler Functions

// Generate interview questions using AI
async function handleAIGenerateQuestions(clientId, message) {
    const client = clients.get(clientId);
    if (!client || !client.isInterviewer) {
        client?.ws.send(JSON.stringify({
            type: 'error',
            message: 'Only interviewers can generate questions',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    try {
        const { jobRole, experienceLevel, skillsRequired, count } = message;
        
        client.ws.send(JSON.stringify({
            type: 'ai_processing',
            message: 'Generating interview questions...',
            timestamp: new Date().toISOString()
        }));

        const questions = await openaiService.generateInterviewQuestions(
            jobRole, 
            experienceLevel, 
            skillsRequired || [], 
            count || 5
        );

        const responseData = {
            type: 'ai_questions_generated',
            questions: questions,
            jobRole: jobRole,
            timestamp: new Date().toISOString()
        };

        client.ws.send(JSON.stringify(responseData));
        console.log(`Generated ${questions.length} questions for ${jobRole}`);

    } catch (error) {
        console.error('Error generating questions:', error);
        client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to generate questions. Please check your OpenAI API key.',
            timestamp: new Date().toISOString()
        }));
    }
}

// Analyze candidate answer using AI
async function handleAIAnalyzeAnswer(clientId, message) {
    const client = clients.get(clientId);
    if (!client || !client.isInterviewer) {
        client?.ws.send(JSON.stringify({
            type: 'error',
            message: 'Only interviewers can analyze answers',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    try {
        const { question, answer, jobRole, expectedPoints } = message;
        
        client.ws.send(JSON.stringify({
            type: 'ai_processing',
            message: 'Analyzing answer...',
            timestamp: new Date().toISOString()
        }));

        const analysis = await openaiService.analyzeAnswer(
            question, 
            answer, 
            jobRole, 
            expectedPoints || []
        );

        const responseData = {
            type: 'ai_answer_analysis',
            analysis: analysis,
            originalQuestion: question,
            originalAnswer: answer,
            timestamp: new Date().toISOString()
        };

        // Send analysis only to interviewers
        broadcastToRole('interviewer', responseData);
        console.log(`Analyzed answer for question: "${question.substring(0, 50)}..."`);

    } catch (error) {
        console.error('Error analyzing answer:', error);
        client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to analyze answer. Please check your OpenAI API key.',
            timestamp: new Date().toISOString()
        }));
    }
}

// Generate follow-up questions using AI
async function handleAIGenerateFollowup(clientId, message) {
    const client = clients.get(clientId);
    if (!client || !client.isInterviewer) {
        client?.ws.send(JSON.stringify({
            type: 'error',
            message: 'Only interviewers can generate follow-up questions',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    try {
        const { originalQuestion, candidateAnswer, count } = message;
        
        client.ws.send(JSON.stringify({
            type: 'ai_processing',
            message: 'Generating follow-up questions...',
            timestamp: new Date().toISOString()
        }));

        const followUpQuestions = await openaiService.generateFollowUpQuestions(
            originalQuestion, 
            candidateAnswer, 
            count || 3
        );

        const responseData = {
            type: 'ai_followup_questions',
            followUpQuestions: followUpQuestions,
            originalQuestion: originalQuestion,
            originalAnswer: candidateAnswer,
            timestamp: new Date().toISOString()
        };

        // Send to interviewers only
        broadcastToRole('interviewer', responseData);
        console.log(`Generated ${followUpQuestions.length} follow-up questions`);

    } catch (error) {
        console.error('Error generating follow-up questions:', error);
        client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to generate follow-up questions. Please check your OpenAI API key.',
            timestamp: new Date().toISOString()
        }));
    }
}

// Improve transcription using AI
async function handleAIImproveTranscription(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    try {
        const { rawTranscription, context } = message;
        
        const improvedText = await openaiService.improveTranscription(
            rawTranscription, 
            context || ''
        );

        const responseData = {
            type: 'ai_improved_transcription',
            originalText: rawTranscription,
            improvedText: improvedText,
            clientId: clientId,
            speaker: client.name || 'Unknown',
            timestamp: new Date().toISOString()
        };

        // Send improved transcription to all clients
        broadcastToAll(responseData);
        console.log(`Improved transcription from ${client.name}`);

    } catch (error) {
        console.error('Error improving transcription:', error);
        client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to improve transcription. Please check your OpenAI API key.',
            timestamp: new Date().toISOString()
        }));
    }
}

// Generate interview summary using AI
async function handleAIInterviewSummary(clientId, message) {
    const client = clients.get(clientId);
    if (!client || !client.isInterviewer) {
        client?.ws.send(JSON.stringify({
            type: 'error',
            message: 'Only interviewers can generate interview summaries',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    try {
        const { candidateName, jobRole, questionsAndAnswers, notes } = message;
        
        client.ws.send(JSON.stringify({
            type: 'ai_processing',
            message: 'Generating interview summary...',
            timestamp: new Date().toISOString()
        }));

        const summary = await openaiService.generateInterviewSummary(
            candidateName, 
            jobRole, 
            questionsAndAnswers, 
            notes || []
        );

        const responseData = {
            type: 'ai_interview_summary',
            summary: summary,
            candidateName: candidateName,
            jobRole: jobRole,
            timestamp: new Date().toISOString()
        };

        // Send summary only to interviewers
        broadcastToRole('interviewer', responseData);
        console.log(`Generated interview summary for ${candidateName}`);

    } catch (error) {
        console.error('Error generating interview summary:', error);
        client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to generate interview summary. Please check your OpenAI API key.',
            timestamp: new Date().toISOString()
        }));
    }
}

// Generate real-time interview insights using AI
async function handleAIInterviewInsights(clientId, message) {
    const client = clients.get(clientId);
    if (!client || !client.isInterviewer) {
        client?.ws.send(JSON.stringify({
            type: 'error',
            message: 'Only interviewers can get interview insights',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    try {
        const { conversationHistory, jobRole } = message;
        
        const insights = await openaiService.generateInterviewInsights(
            conversationHistory, 
            jobRole
        );

        const responseData = {
            type: 'ai_interview_insights',
            insights: insights,
            jobRole: jobRole,
            timestamp: new Date().toISOString()
        };

        // Send insights only to the requesting interviewer
        client.ws.send(JSON.stringify(responseData));
        console.log(`Generated interview insights for ${jobRole} position`);

    } catch (error) {
        console.error('Error generating interview insights:', error);
        client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to generate interview insights. Please check your OpenAI API key.',
            timestamp: new Date().toISOString()
        }));
    }
}

// Handle AI requests
async function handleAIRequest(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    const { requestType, data } = message;
    
    try {
        let response;
        
        switch (requestType) {
            case 'generate_questions':
                response = await generateInterviewQuestions(data);
                break;
            case 'analyze_answer':
                response = await analyzeAnswer(data);
                break;
            case 'get_feedback':
                response = await getFeedback(data);
                break;
            case 'suggest_followup':
                response = await suggestFollowupQuestion(data);
                break;
            default:
                throw new Error(`Unknown AI request type: ${requestType}`);
        }

        client.ws.send(JSON.stringify({
            type: 'ai_response',
            requestType: requestType,
            data: response,
            timestamp: new Date().toISOString()
        }));

    } catch (error) {
        console.error(`AI request error for client ${clientId}:`, error);
        client.ws.send(JSON.stringify({
            type: 'ai_error',
            requestType: requestType,
            error: error.message,
            timestamp: new Date().toISOString()
        }));
    }
}

// Generate interview questions using GPT-4
async function generateInterviewQuestions(data) {
    const { position, level, category, count = 5 } = data;
    
    const prompt = `Generate ${count} interview questions for a ${level} level ${position} position. 
    Focus on ${category} questions. 
    Return the response as a JSON array of objects with the following structure:
    [{"question": "...", "category": "${category}", "difficulty": "${level}", "expectedSkills": ["skill1", "skill2"]}]
    
    Make the questions relevant, challenging, and appropriate for the specified level.`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert technical interviewer. Generate high-quality interview questions that are relevant and insightful."
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

// Analyze candidate's answer
async function analyzeAnswer(data) {
    const { question, answer, expectedSkills = [] } = data;
    
    const prompt = `Analyze this interview answer:
    
    Question: "${question}"
    Answer: "${answer}"
    Expected Skills: ${expectedSkills.join(', ')}
    
    Provide analysis in the following JSON format:
    {
        "score": 0-10,
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "technical_accuracy": 0-10,
        "communication_clarity": 0-10,
        "completeness": 0-10,
        "suggestions": ["suggestion1", "suggestion2"],
        "followup_questions": ["followup1", "followup2"]
    }`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert interviewer analyzing candidate responses. Be fair, constructive, and detailed in your analysis."
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

// Get overall interview feedback
async function getFeedback(data) {
    const { transcript, questions, answers, position } = data;
    
    const prompt = `Provide comprehensive interview feedback based on this interview session:
    
    Position: ${position}
    Questions Asked: ${questions.length}
    
    Full Transcript: ${transcript}
    
    Provide feedback in this JSON format:
    {
        "overall_score": 0-10,
        "recommendation": "hire|maybe|no_hire",
        "summary": "Brief overall assessment",
        "technical_skills": {
            "score": 0-10,
            "comments": "detailed feedback"
        },
        "communication": {
            "score": 0-10,
            "comments": "detailed feedback"
        },
        "problem_solving": {
            "score": 0-10,
            "comments": "detailed feedback"
        },
        "strengths": ["strength1", "strength2"],
        "areas_for_improvement": ["area1", "area2"],
        "specific_feedback": ["feedback1", "feedback2"]
    }`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are a senior technical interviewer providing comprehensive candidate assessment. Be thorough, fair, and constructive."
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

// Suggest follow-up question
async function suggestFollowupQuestion(data) {
    const { previousQuestion, answer, context = '' } = data;
    
    const prompt = `Based on this interview exchange, suggest a good follow-up question:
    
    Previous Question: "${previousQuestion}"
    Candidate's Answer: "${answer}"
    Context: ${context}
    
    Provide response in this JSON format:
    {
        "followup_question": "the suggested follow-up question",
        "reasoning": "why this follow-up would be valuable",
        "category": "technical|behavioral|clarification|deeper_dive",
        "difficulty": "easy|medium|hard"
    }`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert interviewer skilled at asking insightful follow-up questions that probe deeper into candidate responses."
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

// Broadcast message to all connected clients
function broadcastToAll(data) {
    clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
        }
    });
}

// Broadcast message to all clients except the sender
function broadcastToOthers(excludeClientId, data) {
    clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
        }
    });
}

// Broadcast message to clients with specific role
function broadcastToRole(role, data) {
    clients.forEach((client) => {
        const isTargetRole = (role === 'interviewer' && client.isInterviewer) || 
                           (role === 'candidate' && client.isCandidate);
        
        if (isTargetRole && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
        }
    });
}

// Generate unique client ID
function generateClientId() {
    return Math.random().toString(36).substr(2, 9);
}

// REST API endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        connectedClients: clients.size,
        uptime: process.uptime(),
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

app.get('/clients', (req, res) => {
    const clientList = Array.from(clients.values()).map(client => ({
        id: client.id,
        name: client.name || 'Anonymous',
        role: client.isInterviewer ? 'interviewer' : (client.isCandidate ? 'candidate' : 'unknown'),
        connectedAt: client.connectedAt,
        isConnected: client.ws.readyState === WebSocket.OPEN
    }));

    res.json({
        totalClients: clients.size,
        clients: clientList,
        timestamp: new Date().toISOString()
    });
});

// AI-powered REST endpoints
app.post('/api/ai/generate-questions', async (req, res) => {
    try {
        const { position, level, category, count } = req.body;
        
        if (!position || !level || !category) {
            return res.status(400).json({
                error: 'Missing required fields: position, level, category'
            });
        }

        const questions = await generateInterviewQuestions({ position, level, category, count });
        res.json({
            success: true,
            questions: questions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({
            error: 'Failed to generate questions',
            message: error.message
        });
    }
});

app.post('/api/ai/analyze-answer', async (req, res) => {
    try {
        const { question, answer, expectedSkills } = req.body;
        
        if (!question || !answer) {
            return res.status(400).json({
                error: 'Missing required fields: question, answer'
            });
        }

        const analysis = await analyzeAnswer({ question, answer, expectedSkills });
        res.json({
            success: true,
            analysis: analysis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error analyzing answer:', error);
        res.status(500).json({
            error: 'Failed to analyze answer',
            message: error.message
        });
    }
});

app.post('/api/ai/get-feedback', async (req, res) => {
    try {
        const { transcript, questions, answers, position } = req.body;
        
        if (!transcript || !position) {
            return res.status(400).json({
                error: 'Missing required fields: transcript, position'
            });
        }

        const feedback = await getFeedback({ transcript, questions, answers, position });
        res.json({
            success: true,
            feedback: feedback,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting feedback:', error);
        res.status(500).json({
            error: 'Failed to get feedback',
            message: error.message
        });
    }
});

app.post('/api/ai/suggest-followup', async (req, res) => {
    try {
        const { previousQuestion, answer, context } = req.body;
        
        if (!previousQuestion || !answer) {
            return res.status(400).json({
                error: 'Missing required fields: previousQuestion, answer'
            });
        }

        const suggestion = await suggestFollowupQuestion({ previousQuestion, answer, context });
        res.json({
            success: true,
            suggestion: suggestion,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error suggesting follow-up:', error);
        res.status(500).json({
            error: 'Failed to suggest follow-up',
            message: error.message
        });
    }
});

// OpenAI API endpoints
app.post('/api/generate-questions', async (req, res) => {
    try {
        const { jobRole, experienceLevel, skillsRequired, count } = req.body;
        
        if (!jobRole || !experienceLevel) {
            return res.status(400).json({
                error: 'jobRole and experienceLevel are required'
            });
        }

        const questions = await openaiService.generateInterviewQuestions(
            jobRole, 
            experienceLevel, 
            skillsRequired || [], 
            count || 5
        );

        res.json({
            success: true,
            questions: questions,
            jobRole: jobRole,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/generate-questions:', error);
        res.status(500).json({
            error: 'Failed to generate questions',
            message: error.message
        });
    }
});

app.post('/api/analyze-answer', async (req, res) => {
    try {
        const { question, answer, jobRole, expectedPoints } = req.body;
        
        if (!question || !answer || !jobRole) {
            return res.status(400).json({
                error: 'question, answer, and jobRole are required'
            });
        }

        const analysis = await openaiService.analyzeAnswer(
            question, 
            answer, 
            jobRole, 
            expectedPoints || []
        );

        res.json({
            success: true,
            analysis: analysis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/analyze-answer:', error);
        res.status(500).json({
            error: 'Failed to analyze answer',
            message: error.message
        });
    }
});

app.post('/api/improve-transcription', async (req, res) => {
    try {
        const { rawTranscription, context } = req.body;
        
        if (!rawTranscription) {
            return res.status(400).json({
                error: 'rawTranscription is required'
            });
        }

        const improvedText = await openaiService.improveTranscription(
            rawTranscription, 
            context || ''
        );

        res.json({
            success: true,
            originalText: rawTranscription,
            improvedText: improvedText,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/improve-transcription:', error);
        res.status(500).json({
            error: 'Failed to improve transcription',
            message: error.message
        });
    }
});

app.post('/api/interview-summary', async (req, res) => {
    try {
        const { candidateName, jobRole, questionsAndAnswers, notes } = req.body;
        
        if (!candidateName || !jobRole || !questionsAndAnswers) {
            return res.status(400).json({
                error: 'candidateName, jobRole, and questionsAndAnswers are required'
            });
        }

        const summary = await openaiService.generateInterviewSummary(
            candidateName, 
            jobRole, 
            questionsAndAnswers, 
            notes || []
        );

        res.json({
            success: true,
            summary: summary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/interview-summary:', error);
        res.status(500).json({
            error: 'Failed to generate interview summary',
            message: error.message
        });
    }
});

// Serve static files for testing
app.use(express.static('public'));

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Interview Copilot WebSocket Server with AI Integration',
        version: '1.0.0',
        features: {
            websocket: `ws://localhost:${PORT}`,
            aiPowered: !!process.env.OPENAI_API_KEY,
            capabilities: [
                'Real-time transcription',
                'AI question generation',
                'Answer analysis',
                'Interview insights',
                'Transcription improvement'
            ]
        },
        endpoints: {
            websocket: `ws://localhost:${PORT}`,
            health: '/health',
            clients: '/clients',
            api: {
                generateQuestions: 'POST /api/generate-questions',
                analyzeAnswer: 'POST /api/analyze-answer',
                improveTranscription: 'POST /api/improve-transcription',
                interviewSummary: 'POST /api/interview-summary'
            }
        },
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Interview Copilot WebSocket server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
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
