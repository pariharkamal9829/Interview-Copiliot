// Interview Copilot AI Integration Examples
// This file demonstrates how to use the OpenAI GPT-4 features

const WebSocket = require('ws');

// Example 1: WebSocket AI Request for Question Generation
function generateQuestionsViaWebSocket(ws) {
    const message = {
        type: 'ai_request',
        requestType: 'generate_questions',
        data: {
            position: 'Senior Frontend Developer',
            level: 'senior',
            category: 'technical',
            count: 5
        }
    };
    
    ws.send(JSON.stringify(message));
}

// Example 2: REST API call for Answer Analysis
async function analyzeAnswerViaAPI() {
    const response = await fetch('http://localhost:3000/api/ai/analyze-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: "Explain the difference between let, const, and var in JavaScript",
            answer: "Let and const are block-scoped while var is function-scoped. Const cannot be reassigned after declaration, let can be reassigned but not redeclared in the same scope, and var can be both reassigned and redeclared.",
            expectedSkills: ["JavaScript", "ES6", "Variable Declaration"]
        })
    });
    
    const result = await response.json();
    console.log('Answer Analysis:', result);
}

// Example 3: Complete Interview Flow with AI
class InterviewCopilot {
    constructor(wsUrl = 'ws://localhost:3000') {
        this.ws = new WebSocket(wsUrl);
        this.interviewData = {
            questions: [],
            answers: [],
            transcript: '',
            position: ''
        };
        
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        this.ws.on('open', () => {
            console.log('Connected to Interview Copilot');
            this.register('interviewer', 'AI Assistant');
        });
        
        this.ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
        });
    }
    
    register(role, name) {
        this.ws.send(JSON.stringify({
            type: 'register',
            role: role,
            name: name
        }));
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'ai_response':
                this.handleAIResponse(message);
                break;
            case 'transcription':
                this.handleTranscription(message);
                break;
            case 'answer':
                this.handleAnswer(message);
                break;
        }
    }
    
    handleAIResponse(message) {
        const { requestType, data } = message;
        
        switch (requestType) {
            case 'generate_questions':
                this.interviewData.questions = data;
                console.log('Generated Questions:', data);
                break;
            case 'analyze_answer':
                console.log('Answer Analysis:', data);
                this.suggestFollowup(data);
                break;
            case 'suggest_followup':
                console.log('Suggested Follow-up:', data);
                break;
            case 'get_feedback':
                console.log('Interview Feedback:', data);
                break;
        }
    }
    
    handleTranscription(message) {
        if (message.isFinal) {
            this.interviewData.transcript += message.text + ' ';
        }
    }
    
    handleAnswer(message) {
        this.interviewData.answers.push({
            answer: message.answer,
            timestamp: message.timestamp
        });
        
        // Automatically analyze the answer
        this.analyzeLastAnswer();
    }
    
    // AI-powered methods
    generateQuestions(position, level, category, count = 5) {
        this.interviewData.position = position;
        this.ws.send(JSON.stringify({
            type: 'ai_request',
            requestType: 'generate_questions',
            data: { position, level, category, count }
        }));
    }
    
    analyzeLastAnswer() {
        const lastAnswer = this.interviewData.answers[this.interviewData.answers.length - 1];
        const currentQuestion = this.interviewData.questions[this.interviewData.answers.length - 1];
        
        if (lastAnswer && currentQuestion) {
            this.ws.send(JSON.stringify({
                type: 'ai_request',
                requestType: 'analyze_answer',
                data: {
                    question: currentQuestion.question,
                    answer: lastAnswer.answer,
                    expectedSkills: currentQuestion.expectedSkills || []
                }
            }));
        }
    }
    
    suggestFollowup(analysisData) {
        const lastAnswer = this.interviewData.answers[this.interviewData.answers.length - 1];
        const currentQuestion = this.interviewData.questions[this.interviewData.answers.length - 1];
        
        this.ws.send(JSON.stringify({
            type: 'ai_request',
            requestType: 'suggest_followup',
            data: {
                previousQuestion: currentQuestion.question,
                answer: lastAnswer.answer,
                context: `Analysis score: ${analysisData.score}/10`
            }
        }));
    }
    
    getFinalFeedback() {
        this.ws.send(JSON.stringify({
            type: 'ai_request',
            requestType: 'get_feedback',
            data: {
                transcript: this.interviewData.transcript,
                questions: this.interviewData.questions,
                answers: this.interviewData.answers,
                position: this.interviewData.position
            }
        }));
    }
}

// Example usage
const copilot = new InterviewCopilot();

// Wait for connection, then start generating questions
setTimeout(() => {
    copilot.generateQuestions('Frontend Developer', 'senior', 'technical', 3);
}, 1000);

// Example REST API calls
async function demonstrateRESTAPI() {
    try {
        // 1. Generate Questions
        const questionsResponse = await fetch('http://localhost:3000/api/ai/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                position: 'Full Stack Developer',
                level: 'mid',
                category: 'technical',
                count: 3
            })
        });
        const questions = await questionsResponse.json();
        console.log('Generated Questions:', questions);
        
        // 2. Analyze Answer
        const analysisResponse = await fetch('http://localhost:3000/api/ai/analyze-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: "What is the difference between REST and GraphQL?",
                answer: "REST uses multiple endpoints while GraphQL uses a single endpoint. GraphQL allows clients to request exactly what data they need, reducing over-fetching and under-fetching issues common in REST APIs.",
                expectedSkills: ["API Design", "REST", "GraphQL"]
            })
        });
        const analysis = await analysisResponse.json();
        console.log('Answer Analysis:', analysis);
        
        // 3. Get Follow-up Suggestion
        const followupResponse = await fetch('http://localhost:3000/api/ai/suggest-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                previousQuestion: "What is the difference between REST and GraphQL?",
                answer: "REST uses multiple endpoints while GraphQL uses a single endpoint...",
                context: "Technical interview for senior developer position"
            })
        });
        const followup = await followupResponse.json();
        console.log('Follow-up Suggestion:', followup);
        
        // 4. Get Comprehensive Feedback
        const feedbackResponse = await fetch('http://localhost:3000/api/ai/get-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: "Full interview transcript here...",
                questions: questions.questions || [],
                answers: [
                    { answer: "REST uses multiple endpoints...", timestamp: new Date().toISOString() }
                ],
                position: 'Full Stack Developer'
            })
        });
        const feedback = await feedbackResponse.json();
        console.log('Interview Feedback:', feedback);
        
    } catch (error) {
        console.error('API Error:', error);
    }
}

// Message format examples for WebSocket communication
const messageExamples = {
    // AI request to generate questions
    generateQuestions: {
        type: 'ai_request',
        requestType: 'generate_questions',
        data: {
            position: 'Senior Backend Developer',
            level: 'senior',
            category: 'technical',
            count: 5
        }
    },
    
    // AI request to analyze answer
    analyzeAnswer: {
        type: 'ai_request',
        requestType: 'analyze_answer',
        data: {
            question: "Explain microservices architecture",
            answer: "Microservices architecture breaks down applications into small, independent services...",
            expectedSkills: ["Architecture", "Microservices", "System Design"]
        }
    },
    
    // AI request for follow-up question
    suggestFollowup: {
        type: 'ai_request',
        requestType: 'suggest_followup',
        data: {
            previousQuestion: "Explain microservices architecture",
            answer: "Microservices break down applications into small services...",
            context: "Senior developer interview, focusing on system design"
        }
    },
    
    // AI request for comprehensive feedback
    getFeedback: {
        type: 'ai_request',
        requestType: 'get_feedback',
        data: {
            transcript: "Complete interview transcript...",
            questions: [
                { question: "Question 1", category: "technical", difficulty: "medium" }
            ],
            answers: [
                { answer: "Answer 1", timestamp: "2025-08-06T10:00:00Z" }
            ],
            position: 'Senior Backend Developer'
        }
    }
};

console.log('Message Examples:', messageExamples);

module.exports = {
    InterviewCopilot,
    demonstrateRESTAPI,
    messageExamples
};
