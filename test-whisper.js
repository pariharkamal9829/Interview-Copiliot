const { transcribeAudio, AudioTranscriber, exampleBasicTranscription } = require('./whisper-transcription');
const fs = require('fs');

async function testWhisperTranscription() {
    console.log('🎤 Testing Whisper Audio Transcription\n');

    // Test 1: Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
        console.log('❌ OPENAI_API_KEY not found in environment variables');
        console.log('💡 Please add your OpenAI API key to .env file');
        return;
    }

    console.log('✅ OpenAI API key found');

    // Test 2: Basic transcription setup
    console.log('📁 Setting up transcription test...');
    
    // Create a simple test (you would replace this with actual audio file)
    console.log('\n🔧 Transcription functions ready:');
    console.log('- transcribeAudio() - Basic file transcription');
    console.log('- AudioTranscriber - Real-time transcription class');
    console.log('- LiveTranscriber - Socket.IO integrated transcription');

    // Test 3: Example usage
    console.log('\n📝 Example usage:');
    console.log(`
    // Basic transcription
    const result = await transcribeAudio('audio.wav', 'en');
    
    // Real-time transcriber
    const transcriber = new AudioTranscriber({
        language: 'en',
        onTranscription: (result) => console.log(result.text)
    });
    
    // Process audio buffer
    await transcriber.transcribeBuffer(audioBuffer);
    `);

    console.log('\n🌐 Web interface available at:');
    console.log('- http://localhost:3000/microphone.html');
    console.log('\n🚀 Start server with: npm start');
}

// Run test
if (require.main === module) {
    testWhisperTranscription();
}

module.exports = { testWhisperTranscription };
