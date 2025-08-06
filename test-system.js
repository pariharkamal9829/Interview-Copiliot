#!/usr/bin/env node

// Comprehensive Test Suite for Interview Copilot
// This script tests all components: environment, dependencies, server, WebSocket, OpenAI, and audio capture

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class InterviewCopilotTester {
    constructor() {
        this.results = {
            environment: { passed: 0, failed: 0, tests: [] },
            dependencies: { passed: 0, failed: 0, tests: [] },
            server: { passed: 0, failed: 0, tests: [] },
            websocket: { passed: 0, failed: 0, tests: [] },
            openai: { passed: 0, failed: 0, tests: [] },
            audio: { passed: 0, failed: 0, tests: [] }
        };
        this.serverProcess = null;
    }

    log(category, test, status, message, details = '') {
        const timestamp = new Date().toLocaleTimeString();
        const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
        
        console.log(`[${timestamp}] ${statusIcon} ${category.toUpperCase()}: ${test} - ${message}`);
        if (details) console.log(`    ${details}`);
        
        this.results[category].tests.push({
            test,
            status,
            message,
            details,
            timestamp
        });
        
        if (status === 'PASS') this.results[category].passed++;
        if (status === 'FAIL') this.results[category].failed++;
    }

    async runAllTests() {
        console.log('🚀 Starting Interview Copilot Test Suite\n');
        
        try {
            await this.testEnvironment();
            await this.testDependencies();
            await this.testServerStartup();
            await this.testWebSocket();
            await this.testOpenAI();
            await this.testAudioCapture();
            
            this.printSummary();
            
        } catch (error) {
            console.error('\n❌ Test suite failed with error:', error.message);
        } finally {
            await this.cleanup();
        }
    }

    async testEnvironment() {
        console.log('\n📋 Testing Environment Configuration...\n');
        
        // Test 1: Check if .env file exists
        try {
            const envExists = fs.existsSync('.env');
            if (envExists) {
                this.log('environment', 'ENV_FILE_EXISTS', 'PASS', '.env file found');
            } else {
                this.log('environment', 'ENV_FILE_EXISTS', 'FAIL', '.env file missing');
                return;
            }
        } catch (error) {
            this.log('environment', 'ENV_FILE_EXISTS', 'FAIL', 'Error checking .env file', error.message);
        }

        // Test 2: Load and validate environment variables
        try {
            require('dotenv').config();
            
            const requiredVars = ['PORT', 'NODE_ENV', 'LOG_LEVEL'];
            const optionalVars = ['OPENAI_API_KEY', 'JWT_SECRET', 'SESSION_SECRET'];
            
            for (const varName of requiredVars) {
                if (process.env[varName]) {
                    this.log('environment', `ENV_${varName}`, 'PASS', `${varName} is set`, `Value: ${process.env[varName]}`);
                } else {
                    this.log('environment', `ENV_${varName}`, 'FAIL', `${varName} is missing`);
                }
            }
            
            for (const varName of optionalVars) {
                if (process.env[varName] && process.env[varName] !== 'your-openai-api-key-here') {
                    this.log('environment', `ENV_${varName}`, 'PASS', `${varName} is configured`);
                } else {
                    this.log('environment', `ENV_${varName}`, 'INFO', `${varName} needs configuration`, 
                        varName === 'OPENAI_API_KEY' ? 'Get from https://platform.openai.com/api-keys' : 'Should be set for production');
                }
            }
            
        } catch (error) {
            this.log('environment', 'ENV_LOAD', 'FAIL', 'Failed to load environment variables', error.message);
        }

        // Test 3: Check Node.js version
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
            
            if (majorVersion >= 16) {
                this.log('environment', 'NODE_VERSION', 'PASS', `Node.js version compatible`, `Version: ${nodeVersion}`);
            } else {
                this.log('environment', 'NODE_VERSION', 'FAIL', `Node.js version too old`, `Version: ${nodeVersion}, Required: >=16`);
            }
        } catch (error) {
            this.log('environment', 'NODE_VERSION', 'FAIL', 'Failed to check Node.js version', error.message);
        }

        // Test 4: Check required files
        const requiredFiles = [
            'package.json',
            'server-socketio.js',
            'whisper-transcription.js',
            'content-script.js',
            'public/ai-suggestions.html',
            'extension/manifest.json'
        ];

        for (const file of requiredFiles) {
            try {
                if (fs.existsSync(file)) {
                    this.log('environment', 'FILE_EXISTS', 'PASS', `${file} found`);
                } else {
                    this.log('environment', 'FILE_EXISTS', 'FAIL', `${file} missing`);
                }
            } catch (error) {
                this.log('environment', 'FILE_EXISTS', 'FAIL', `Error checking ${file}`, error.message);
            }
        }
    }

    async testDependencies() {
        console.log('\n📦 Testing Dependencies...\n');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            for (const [dep, version] of Object.entries(dependencies)) {
                try {
                    require.resolve(dep);
                    this.log('dependencies', 'PACKAGE_INSTALLED', 'PASS', `${dep} is installed`);
                } catch (error) {
                    this.log('dependencies', 'PACKAGE_INSTALLED', 'FAIL', `${dep} is missing`, `Run: npm install ${dep}`);
                }
            }
            
        } catch (error) {
            this.log('dependencies', 'PACKAGE_CHECK', 'FAIL', 'Failed to check dependencies', error.message);
        }

        // Test specific critical modules
        const criticalModules = ['express', 'socket.io', 'ws', 'openai', 'multer', 'cors'];
        
        for (const module of criticalModules) {
            try {
                const moduleInfo = require(`${module}/package.json`);
                this.log('dependencies', 'CRITICAL_MODULE', 'PASS', `${module} v${moduleInfo.version} loaded`);
            } catch (error) {
                this.log('dependencies', 'CRITICAL_MODULE', 'FAIL', `Failed to load ${module}`, error.message);
            }
        }
    }

    async testServerStartup() {
        console.log('\n🌐 Testing Server Startup...\n');
        
        return new Promise((resolve) => {
            try {
                // Start the server as a child process
                this.serverProcess = spawn('node', ['server-socketio.js'], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: { ...process.env }
                });

                let serverOutput = '';
                let serverStarted = false;
                let healthCheckPassed = false;

                this.serverProcess.stdout.on('data', (data) => {
                    serverOutput += data.toString();
                    
                    if (data.toString().includes('Server running on port') || data.toString().includes('listening on')) {
                        serverStarted = true;
                        this.log('server', 'SERVER_START', 'PASS', 'Server started successfully');
                        
                        // Test HTTP health check
                        setTimeout(async () => {
                            try {
                                const response = await fetch('http://localhost:3000/api/health');
                                if (response.ok) {
                                    const data = await response.json();
                                    this.log('server', 'HEALTH_CHECK', 'PASS', 'Health endpoint responding', `Status: ${data.status}`);
                                    healthCheckPassed = true;
                                } else {
                                    this.log('server', 'HEALTH_CHECK', 'FAIL', 'Health endpoint error', `Status: ${response.status}`);
                                }
                            } catch (error) {
                                this.log('server', 'HEALTH_CHECK', 'FAIL', 'Health endpoint unreachable', error.message);
                            }
                            resolve();
                        }, 2000);
                    }
                });

                this.serverProcess.stderr.on('data', (data) => {
                    const errorOutput = data.toString();
                    if (errorOutput.includes('Error') || errorOutput.includes('error')) {
                        this.log('server', 'SERVER_ERROR', 'FAIL', 'Server error detected', errorOutput.trim());
                    }
                });

                this.serverProcess.on('error', (error) => {
                    this.log('server', 'SERVER_SPAWN', 'FAIL', 'Failed to start server process', error.message);
                    resolve();
                });

                // Timeout if server doesn't start in 10 seconds
                setTimeout(() => {
                    if (!serverStarted) {
                        this.log('server', 'SERVER_TIMEOUT', 'FAIL', 'Server startup timeout');
                    }
                    resolve();
                }, 10000);

            } catch (error) {
                this.log('server', 'SERVER_TEST', 'FAIL', 'Failed to test server startup', error.message);
                resolve();
            }
        });
    }

    async testWebSocket() {
        console.log('\n🔌 Testing WebSocket Connection...\n');
        
        return new Promise((resolve) => {
            try {
                const WebSocket = require('ws');
                const ws = new WebSocket('ws://localhost:3000');
                
                let connectionEstablished = false;
                let messageReceived = false;

                ws.on('open', () => {
                    connectionEstablished = true;
                    this.log('websocket', 'WS_CONNECTION', 'PASS', 'WebSocket connection established');
                    
                    // Test sending a message
                    const testMessage = {
                        type: 'test-connection',
                        timestamp: Date.now(),
                        data: 'Test message from automated test'
                    };
                    
                    ws.send(JSON.stringify(testMessage));
                    this.log('websocket', 'WS_SEND', 'PASS', 'Test message sent');
                });

                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        messageReceived = true;
                        this.log('websocket', 'WS_RECEIVE', 'PASS', 'Message received from server', `Type: ${message.type}`);
                    } catch (error) {
                        this.log('websocket', 'WS_RECEIVE', 'INFO', 'Non-JSON message received', data.toString());
                    }
                });

                ws.on('error', (error) => {
                    this.log('websocket', 'WS_ERROR', 'FAIL', 'WebSocket error', error.message);
                });

                ws.on('close', () => {
                    this.log('websocket', 'WS_CLOSE', 'INFO', 'WebSocket connection closed');
                });

                // Close connection and resolve after 3 seconds
                setTimeout(() => {
                    if (connectionEstablished) {
                        ws.close();
                        if (!messageReceived) {
                            this.log('websocket', 'WS_ECHO', 'INFO', 'No echo response received (this is okay)');
                        }
                    } else {
                        this.log('websocket', 'WS_TIMEOUT', 'FAIL', 'WebSocket connection timeout');
                    }
                    resolve();
                }, 3000);

            } catch (error) {
                this.log('websocket', 'WS_TEST', 'FAIL', 'Failed to test WebSocket', error.message);
                resolve();
            }
        });
    }

    async testOpenAI() {
        console.log('\n🤖 Testing OpenAI Integration...\n');
        
        try {
            const openai = require('openai');
            
            // Test 1: Check if OpenAI is importable
            this.log('openai', 'OPENAI_IMPORT', 'PASS', 'OpenAI library imported successfully');
            
            // Test 2: Check API key configuration
            const apiKey = process.env.OPENAI_API_KEY;
            if (apiKey && apiKey !== 'your-openai-api-key-here') {
                this.log('openai', 'OPENAI_API_KEY', 'PASS', 'OpenAI API key is configured');
                
                // Test 3: Try to create OpenAI client
                try {
                    const client = new openai.OpenAI({
                        apiKey: apiKey
                    });
                    this.log('openai', 'OPENAI_CLIENT', 'PASS', 'OpenAI client created successfully');
                    
                    // Test 4: Try a simple API call (if API key is valid)
                    if (apiKey.startsWith('sk-')) {
                        try {
                            const response = await client.chat.completions.create({
                                model: "gpt-3.5-turbo",
                                messages: [{ role: "user", content: "Test message - please respond with 'OK'" }],
                                max_tokens: 10
                            });
                            
                            if (response.choices && response.choices.length > 0) {
                                this.log('openai', 'OPENAI_API_CALL', 'PASS', 'OpenAI API call successful', 
                                    `Response: ${response.choices[0].message.content}`);
                            } else {
                                this.log('openai', 'OPENAI_API_CALL', 'FAIL', 'OpenAI API returned no response');
                            }
                        } catch (apiError) {
                            this.log('openai', 'OPENAI_API_CALL', 'FAIL', 'OpenAI API call failed', apiError.message);
                        }
                    } else {
                        this.log('openai', 'OPENAI_API_CALL', 'INFO', 'Skipping API test - invalid key format');
                    }
                    
                } catch (error) {
                    this.log('openai', 'OPENAI_CLIENT', 'FAIL', 'Failed to create OpenAI client', error.message);
                }
                
            } else {
                this.log('openai', 'OPENAI_API_KEY', 'FAIL', 'OpenAI API key not configured', 
                    'Set OPENAI_API_KEY in .env file. Get key from: https://platform.openai.com/api-keys');
            }
            
        } catch (error) {
            this.log('openai', 'OPENAI_TEST', 'FAIL', 'Failed to test OpenAI integration', error.message);
        }
    }

    async testAudioCapture() {
        console.log('\n🎤 Testing Audio Capture Components...\n');
        
        try {
            // Test 1: Check if content script exists and is valid
            if (fs.existsSync('content-script.js')) {
                const contentScript = fs.readFileSync('content-script.js', 'utf8');
                if (contentScript.includes('getUserMedia') && contentScript.includes('MediaRecorder')) {
                    this.log('audio', 'CONTENT_SCRIPT', 'PASS', 'Content script has audio capture functionality');
                } else {
                    this.log('audio', 'CONTENT_SCRIPT', 'FAIL', 'Content script missing audio capture code');
                }
            } else {
                this.log('audio', 'CONTENT_SCRIPT', 'FAIL', 'Content script file missing');
            }

            // Test 2: Check whisper transcription module
            if (fs.existsSync('whisper-transcription.js')) {
                const whisperScript = fs.readFileSync('whisper-transcription.js', 'utf8');
                if (whisperScript.includes('whisper') || whisperScript.includes('transcribe')) {
                    this.log('audio', 'WHISPER_SCRIPT', 'PASS', 'Whisper transcription script found');
                } else {
                    this.log('audio', 'WHISPER_SCRIPT', 'FAIL', 'Whisper transcription script incomplete');
                }
            } else {
                this.log('audio', 'WHISPER_SCRIPT', 'FAIL', 'Whisper transcription script missing');
            }

            // Test 3: Check injection scripts
            const injectionFiles = ['inject-audio-capture.js', 'bookmarklet.js'];
            for (const file of injectionFiles) {
                if (fs.existsSync(file)) {
                    this.log('audio', 'INJECTION_SCRIPT', 'PASS', `${file} exists`);
                } else {
                    this.log('audio', 'INJECTION_SCRIPT', 'FAIL', `${file} missing`);
                }
            }

            // Test 4: Check public demo files
            const demoFiles = [
                'public/ai-suggestions.html',
                'public/injection-guide.html',
                'public/floating-assistant.html'
            ];
            
            for (const file of demoFiles) {
                if (fs.existsSync(file)) {
                    this.log('audio', 'DEMO_FILE', 'PASS', `${file} exists`);
                } else {
                    this.log('audio', 'DEMO_FILE', 'FAIL', `${file} missing`);
                }
            }

            // Test 5: Test browser extension structure
            const extensionFiles = [
                'extension/manifest.json',
                'extension/background.js',
                'extension/popup.html',
                'extension/options.html'
            ];
            
            let extensionComplete = true;
            for (const file of extensionFiles) {
                if (fs.existsSync(file)) {
                    this.log('audio', 'EXTENSION_FILE', 'PASS', `${file} exists`);
                } else {
                    this.log('audio', 'EXTENSION_FILE', 'FAIL', `${file} missing`);
                    extensionComplete = false;
                }
            }
            
            if (extensionComplete) {
                this.log('audio', 'EXTENSION_COMPLETE', 'PASS', 'Browser extension structure complete');
            } else {
                this.log('audio', 'EXTENSION_COMPLETE', 'FAIL', 'Browser extension incomplete');
            }

        } catch (error) {
            this.log('audio', 'AUDIO_TEST', 'FAIL', 'Failed to test audio capture', error.message);
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        
        let totalPassed = 0;
        let totalFailed = 0;
        let totalInfo = 0;
        
        for (const [category, results] of Object.entries(this.results)) {
            const passed = results.passed;
            const failed = results.failed;
            const info = results.tests.filter(t => t.status === 'INFO').length;
            
            totalPassed += passed;
            totalFailed += failed;
            totalInfo += info;
            
            const status = failed === 0 ? '✅' : passed > failed ? '⚠️' : '❌';
            
            console.log(`${status} ${category.toUpperCase()}: ${passed} passed, ${failed} failed, ${info} info`);
        }
        
        console.log('-'.repeat(60));
        const overallStatus = totalFailed === 0 ? '✅ ALL TESTS PASSED' : totalPassed > totalFailed ? '⚠️ SOME ISSUES FOUND' : '❌ MAJOR ISSUES FOUND';
        console.log(`${overallStatus}: ${totalPassed} passed, ${totalFailed} failed, ${totalInfo} info`);
        
        if (totalFailed > 0) {
            console.log('\n🔧 ISSUES TO FIX:');
            for (const [category, results] of Object.entries(this.results)) {
                const failedTests = results.tests.filter(t => t.status === 'FAIL');
                if (failedTests.length > 0) {
                    console.log(`\n${category.toUpperCase()}:`);
                    failedTests.forEach(test => {
                        console.log(`  ❌ ${test.test}: ${test.message}`);
                        if (test.details) console.log(`     ${test.details}`);
                    });
                }
            }
        }
        
        console.log('\n🚀 NEXT STEPS:');
        if (process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
            console.log('  1. Get OpenAI API key: https://platform.openai.com/api-keys');
            console.log('  2. Update .env file with your API key');
        }
        console.log('  3. Start the server: npm start');
        console.log('  4. Open http://localhost:3000/injection-guide.html');
        console.log('  5. Test audio capture on video conferencing sites');
        console.log('  6. Load browser extension from extension/ folder');
        
        console.log('\n' + '='.repeat(60));
    }

    async cleanup() {
        if (this.serverProcess) {
            console.log('\n🧹 Cleaning up server process...');
            this.serverProcess.kill('SIGTERM');
            
            // Wait for process to exit
            await new Promise((resolve) => {
                this.serverProcess.on('exit', resolve);
                setTimeout(resolve, 3000); // Force cleanup after 3 seconds
            });
        }
    }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Run the test suite
const tester = new InterviewCopilotTester();
tester.runAllTests().catch(console.error);
