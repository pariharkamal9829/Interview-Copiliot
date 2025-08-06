const OpenAI = require('openai');
require('dotenv').config();

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Generate interview questions based on role and experience level
     */
    async generateInterviewQuestions(jobRole, experienceLevel, skillsRequired = [], count = 5) {
        try {
            const prompt = `Generate ${count} interview questions for a ${jobRole} position with ${experienceLevel} experience level.
            
Required skills: ${skillsRequired.join(', ')}

Please provide questions that cover:
1. Technical skills relevant to the role
2. Problem-solving abilities
3. Communication and teamwork
4. Role-specific scenarios

Format the response as a JSON array with objects containing:
- question: the interview question
- category: technical/behavioral/situational
- difficulty: easy/medium/hard
- expectedAnswerPoints: key points a good answer should cover

Example format:
[
  {
    "question": "...",
    "category": "technical",
    "difficulty": "medium",
    "expectedAnswerPoints": ["point1", "point2", "point3"]
  }
]`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an experienced technical interviewer and HR professional. Generate relevant, fair, and insightful interview questions."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('Error generating interview questions:', error);
            throw new Error('Failed to generate interview questions');
        }
    }

    /**
     * Analyze candidate's answer and provide feedback
     */
    async analyzeAnswer(question, answer, jobRole, expectedPoints = []) {
        try {
            const prompt = `Analyze this interview answer for a ${jobRole} position:

Question: "${question}"
Answer: "${answer}"
Expected key points: ${expectedPoints.join(', ')}

Please provide analysis in the following JSON format:
{
  "score": 8.5,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "feedback": "Detailed feedback for the interviewer",
  "suggestions": ["suggestion1", "suggestion2"],
  "coverageScore": 0.8,
  "communicationScore": 0.9,
  "technicalAccuracy": 0.85
}

Scoring criteria:
- score: Overall answer quality (0-10)
- coverageScore: How well the answer covers expected points (0-1)
- communicationScore: Clarity and structure of communication (0-1)
- technicalAccuracy: Technical correctness if applicable (0-1)`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert interviewer and technical assessor. Provide fair, constructive, and detailed analysis of interview answers."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1500
            });

            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('Error analyzing answer:', error);
            throw new Error('Failed to analyze answer');
        }
    }

    /**
     * Generate follow-up questions based on the candidate's answer
     */
    async generateFollowUpQuestions(originalQuestion, candidateAnswer, count = 3) {
        try {
            const prompt = `Based on this interview exchange, generate ${count} relevant follow-up questions:

Original Question: "${originalQuestion}"
Candidate's Answer: "${candidateAnswer}"

Generate follow-up questions that:
1. Probe deeper into technical details mentioned
2. Explore practical experience
3. Assess problem-solving approach
4. Clarify or expand on interesting points

Format as JSON array:
[
  {
    "question": "...",
    "purpose": "clarification/technical-depth/experience-validation",
    "difficulty": "easy/medium/hard"
  }
]`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an experienced interviewer skilled at asking insightful follow-up questions."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('Error generating follow-up questions:', error);
            throw new Error('Failed to generate follow-up questions');
        }
    }

    /**
     * Summarize interview session and provide overall assessment
     */
    async generateInterviewSummary(candidateName, jobRole, questionsAndAnswers, notes = []) {
        try {
            const qa_text = questionsAndAnswers.map(qa => 
                `Q: ${qa.question}\nA: ${qa.answer}\n`
            ).join('\n');

            const notes_text = notes.length > 0 ? `\nInterviewer Notes:\n${notes.join('\n')}` : '';

            const prompt = `Generate a comprehensive interview summary for:

Candidate: ${candidateName}
Position: ${jobRole}

Interview Q&A:
${qa_text}
${notes_text}

Please provide a detailed assessment in JSON format:
{
  "overallScore": 8.2,
  "recommendation": "hire/hire-with-reservations/reject",
  "strengths": ["strength1", "strength2", "strength3"],
  "concerns": ["concern1", "concern2"],
  "technicalSkills": {
    "score": 8.5,
    "assessment": "Strong technical foundation..."
  },
  "communicationSkills": {
    "score": 7.8,
    "assessment": "Clear communicator..."
  },
  "problemSolving": {
    "score": 8.0,
    "assessment": "Demonstrates good analytical thinking..."
  },
  "culturalFit": {
    "score": 8.5,
    "assessment": "Shows alignment with team values..."
  },
  "nextSteps": ["suggestion1", "suggestion2"],
  "detailedFeedback": "Comprehensive summary of the candidate's performance..."
}`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a senior hiring manager with extensive experience in candidate assessment. Provide thorough, fair, and actionable interview summaries."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2500
            });

            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('Error generating interview summary:', error);
            throw new Error('Failed to generate interview summary');
        }
    }

    /**
     * Improve transcription quality and fix speech-to-text errors
     */
    async improveTranscription(rawTranscription, context = '') {
        try {
            const prompt = `Improve this speech-to-text transcription by fixing errors, adding proper punctuation, and making it more readable while preserving the original meaning and tone:

Raw transcription: "${rawTranscription}"
Context: ${context}

Please return only the improved text without additional formatting or explanations.`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert in speech-to-text correction. Fix transcription errors while preserving the speaker's original meaning and tone."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error improving transcription:', error);
            throw new Error('Failed to improve transcription');
        }
    }

    /**
     * Generate insights and recommendations based on conversation flow
     */
    async generateInterviewInsights(conversationHistory, jobRole) {
        try {
            const prompt = `Analyze this interview conversation and provide real-time insights:

Job Role: ${jobRole}
Conversation History:
${conversationHistory}

Provide insights in JSON format:
{
  "currentAssessment": "Brief assessment of how the interview is progressing",
  "suggestedQuestions": ["question1", "question2"],
  "redFlags": ["flag1", "flag2"],
  "positiveSignals": ["signal1", "signal2"],
  "areasToExplore": ["area1", "area2"],
  "interviewerTips": ["tip1", "tip2"]
}`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI interview coach providing real-time insights to help interviewers conduct better interviews."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 1500
            });

            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('Error generating interview insights:', error);
            throw new Error('Failed to generate interview insights');
        }
    }
}

module.exports = OpenAIService;
