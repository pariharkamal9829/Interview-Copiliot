#!/usr/bin/env node

// Quick Setup and Test Script for Interview Copilot
// This script will install dependencies, configure environment, and run tests

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class QuickSetup {
    constructor() {
        this.logStep = 1;
    }

    log(message, status = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const statusIcon = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : status === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${statusIcon} Step ${this.logStep}: ${message}`);
        this.logStep++;
    }

    async runCommand(command, description) {
        return new Promise((resolve, reject) => {
            this.log(`${description}...`);
            
            const process = exec(command, { cwd: __dirname });
            
            process.stdout.on('data', (data) => {
                // Only show important output
                const output = data.toString().trim();
                if (output.includes('added') || output.includes('installed') || output.includes('success')) {
                    console.log(`    ${output}`);
                }
            });
            
            process.stderr.on('data', (data) => {
                const error = data.toString().trim();
                if (!error.includes('npm WARN')) {
                    console.log(`    ${error}`);
                }
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    this.log(`${description} completed`, 'SUCCESS');
                    resolve();
                } else {
                    this.log(`${description} failed with code ${code}`, 'ERROR');
                    reject(new Error(`Command failed: ${command}`));
                }
            });
        });
    }

    async checkNodeModules() {
        try {
            const nodeModulesExists = fs.existsSync('node_modules');
            if (nodeModulesExists) {
                this.log('Dependencies already installed', 'SUCCESS');
                return true;
            } else {
                this.log('Dependencies need to be installed', 'WARNING');
                return false;
            }
        } catch (error) {
            this.log('Error checking dependencies', 'ERROR');
            return false;
        }
    }

    async checkEnvironment() {
        try {
            const envExists = fs.existsSync('.env');
            if (envExists) {
                const envContent = fs.readFileSync('.env', 'utf8');
                if (envContent.includes('OPENAI_API_KEY=your-openai-api-key-here')) {
                    this.log('.env file exists but needs OpenAI API key configuration', 'WARNING');
                    return false;
                } else {
                    this.log('.env file configured', 'SUCCESS');
                    return true;
                }
            } else {
                this.log('.env file missing', 'ERROR');
                return false;
            }
        } catch (error) {
            this.log('Error checking environment', 'ERROR');
            return false;
        }
    }

    async setup() {
        console.log('🚀 Interview Copilot Quick Setup\n');
        
        try {
            // Step 1: Check Node.js version
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
            
            if (majorVersion >= 16) {
                this.log(`Node.js ${nodeVersion} is compatible`, 'SUCCESS');
            } else {
                this.log(`Node.js ${nodeVersion} is too old. Please upgrade to v16+`, 'ERROR');
                return;
            }

            // Step 2: Check/Install dependencies
            const dependenciesReady = await this.checkNodeModules();
            if (!dependenciesReady) {
                await this.runCommand('npm install', 'Installing dependencies');
            }

            // Step 3: Install additional packages if needed
            const additionalPackages = ['node-fetch'];
            for (const pkg of additionalPackages) {
                try {
                    require.resolve(pkg);
                    this.log(`${pkg} already available`);
                } catch (error) {
                    await this.runCommand(`npm install ${pkg}`, `Installing ${pkg}`);
                }
            }

            // Step 4: Check environment
            const envReady = await this.checkEnvironment();
            
            // Step 5: Show API key instructions if needed
            if (!envReady) {
                this.log('OpenAI API key configuration needed', 'WARNING');
                console.log('\n📋 TO COMPLETE SETUP:');
                console.log('1. Visit: https://platform.openai.com/api-keys');
                console.log('2. Create a new API key');
                console.log('3. Replace "your-openai-api-key-here" in .env file with your key');
                console.log('4. Your key should start with "sk-"');
                console.log('\n💡 You can still test other components without the API key!\n');
            }

            // Step 6: Run tests
            this.log('Running comprehensive test suite...');
            
            // Import and run the test system
            const TestSystem = require('./test-system.js');
            // The test system will run automatically when imported
            
        } catch (error) {
            this.log(`Setup failed: ${error.message}`, 'ERROR');
            console.log('\n🔧 MANUAL SETUP STEPS:');
            console.log('1. npm install');
            console.log('2. Configure .env file with OpenAI API key');
            console.log('3. node test-system.js');
        }
    }

    async quickStart() {
        console.log('\n🎯 QUICK START COMMANDS:\n');
        console.log('📦 Install dependencies:');
        console.log('   npm install\n');
        
        console.log('🔧 Configure environment:');
        console.log('   Edit .env file and add your OpenAI API key\n');
        
        console.log('🧪 Test everything:');
        console.log('   node test-system.js\n');
        
        console.log('🚀 Start server:');
        console.log('   npm start\n');
        
        console.log('🌐 Test in browser:');
        console.log('   Open: http://localhost:3000/injection-guide.html\n');
        
        console.log('🔌 Install browser extension:');
        console.log('   1. Open Chrome Extensions (chrome://extensions/)');
        console.log('   2. Enable Developer Mode');
        console.log('   3. Click "Load unpacked"');
        console.log('   4. Select the "extension" folder\n');
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new QuickSetup();
    setup.setup().then(() => {
        setup.quickStart();
    }).catch(console.error);
}

module.exports = QuickSetup;
