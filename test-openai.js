// Quick test of OpenAI API functions
const { callOpenAI, generateQuestions, analyzeAnswer } = require('./openai-axios');

async function testOpenAI() {
    try {
        console.log('🤖 Testing OpenAI API with axios...\n');
        
        // Test 1: Basic call
        console.log('1. Basic OpenAI call:');
        const basicAnswer = await callOpenAI("Explain JavaScript closures in one sentence.");
        console.log('Answer:', basicAnswer);
        console.log('');
        
        // Test 2: Generate questions
        console.log('2. Generate interview questions:');
        const questions = await generateQuestions("React Developer", "mid", "technical", 2);
        console.log('Questions:', JSON.stringify(questions, null, 2));
        console.log('');
        
        // Test 3: Analyze answer
        console.log('3. Analyze answer:');
        const analysis = await analyzeAnswer(
            "What is a closure in JavaScript?",
            "A closure is when a function has access to variables from its outer scope even after the outer function returns.",
            ["JavaScript", "Closures", "Scope"]
        );
        console.log('Analysis:', JSON.stringify(analysis, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Make sure to set OPENAI_API_KEY in your .env file');
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testOpenAI();
}

module.exports = { testOpenAI };
