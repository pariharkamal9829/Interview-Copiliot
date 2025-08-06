const axios = require('axios');
require('dotenv').config();

/**
 * Call OpenAI API using axios and return answer
 * @param {string} prompt - The user prompt/question
 * @param {string} systemMessage - System role message (optional)
 * @param {string} model - GPT model to use (default: gpt-4)
 * @param {number} maxTokens - Maximum tokens in response (default: 1000)
 * @param {number} temperature - Response creativity (0-1, default: 0.7)
 * @returns {Promise<string>} - AI response text
 */
async function callOpenAI(prompt, systemMessage = "You are a helpful assistant.", model = "gpt-4", maxTokens = 1000, temperature = 0.7) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: model,
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: maxTokens,
                temperature: temperature
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.choices[0].message.content;
        
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.data || error.message);
        throw new Error(`OpenAI API call failed: ${error.response?.data?.error?.message || error.message}`);
    }
}

/**
 * Generate interview questions using OpenAI
 */
async function generateQuestions(position, level, category, count = 5) {
    const prompt = `Generate ${count} ${category} interview questions for a ${level} level ${position} position. Return as JSON array.`;
    const systemMessage = "You are an expert technical interviewer. Generate relevant, challenging questions.";
    
    const response = await callOpenAI(prompt, systemMessage);
    
    try {
        return JSON.parse(response);
    } catch (error) {
        return { error: "Failed to parse JSON", raw_response: response };
    }
}

/**
 * Analyze candidate answer using OpenAI
 */
async function analyzeAnswer(question, answer, expectedSkills = []) {
    const prompt = `Analyze this interview answer:
    Question: "${question}"
    Answer: "${answer}"
    Expected Skills: ${expectedSkills.join(', ')}
    
    Provide detailed analysis with scoring (0-10) and feedback. Return as JSON.`;
    
    const systemMessage = "You are an expert interviewer analyzing candidate responses. Be fair and constructive.";
    
    const response = await callOpenAI(prompt, systemMessage, "gpt-4", 1200, 0.3);
    
    try {
        return JSON.parse(response);
    } catch (error) {
        return { error: "Failed to parse JSON", raw_response: response };
    }
}

/**
 * Get interview feedback using OpenAI
 */
async function getInterviewFeedback(transcript, questions, position) {
    const prompt = `Provide comprehensive interview feedback:
    Position: ${position}
    Transcript: ${transcript}
    Questions: ${questions.join('\n')}
    
    Return detailed assessment as JSON with overall score, recommendation, and detailed feedback.`;
    
    const systemMessage = "You are a senior interviewer providing comprehensive candidate assessment.";
    
    const response = await callOpenAI(prompt, systemMessage, "gpt-4", 2000, 0.3);
    
    try {
        return JSON.parse(response);
    } catch (error) {
        return { error: "Failed to parse JSON", raw_response: response };
    }
}

/**
 * Improve transcription text using OpenAI
 */
async function improveTranscription(text, context = '') {
    const prompt = `Improve this transcribed text for clarity and grammar while preserving meaning:
    Original: "${text}"
    Context: ${context}`;
    
    const systemMessage = "You are an expert at improving transcribed text while preserving original meaning.";
    
    return await callOpenAI(prompt, systemMessage, "gpt-4", 500, 0.3);
}

/**
 * Suggest follow-up question using OpenAI
 */
async function suggestFollowup(previousQuestion, answer, context = '') {
    const prompt = `Suggest a good follow-up question based on:
    Previous Question: "${previousQuestion}"
    Answer: "${answer}"
    Context: ${context}
    
    Return as JSON with question, reasoning, and category.`;
    
    const systemMessage = "You are an expert at asking insightful follow-up questions.";
    
    const response = await callOpenAI(prompt, systemMessage, "gpt-4", 400, 0.6);
    
    try {
        return JSON.parse(response);
    } catch (error) {
        return { error: "Failed to parse JSON", raw_response: response };
    }
}

// Example usage
async function examples() {
    try {
        // Basic OpenAI call
        const answer1 = await callOpenAI("What is React?", "You are a technical expert.");
        console.log("Basic answer:", answer1);
        
        // Generate questions
        const questions = await generateQuestions("Frontend Developer", "senior", "technical", 3);
        console.log("Generated questions:", questions);
        
        // Analyze answer
        const analysis = await analyzeAnswer(
            "What is the difference between let and var?",
            "Let is block-scoped while var is function-scoped. Let prevents hoisting issues.",
            ["JavaScript", "ES6"]
        );
        console.log("Answer analysis:", analysis);
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

module.exports = {
    callOpenAI,
    generateQuestions,
    analyzeAnswer,
    getInterviewFeedback,
    improveTranscription,
    suggestFollowup,
    examples
};
