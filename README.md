# Interview Copilot WebSocket Server

A real-time WebSocket server for handling transcribed text during interview sessions. This server enables seamless communication between interviewers and candidates, handling speech-to-text transcriptions, questions, answers, and notes.

## Features

- **Real-time WebSocket Communication**: Instant message broadcasting between connected clients
- **Role-based System**: Supports both interviewers and candidates with different permissions
- **Transcription Handling**: Processes speech-to-text data with confidence levels and finalization status
- **Interview Management**: Handles questions, answers, and interviewer notes
- **REST API Endpoints**: Health checks and client management
- **Test Client**: Built-in web interface for testing WebSocket functionality

## Message Types

### 1. Registration
```json
{
  "type": "register",
  "name": "John Doe",
  "role": "interviewer" // or "candidate"
}
```

### 2. Transcription
```json
{
  "type": "transcription",
  "text": "This is the transcribed speech text",
  "confidence": 0.95,
  "isFinal": true,
  "language": "en"
}
```

### 3. Question
```json
{
  "type": "question",
  "question": "What is your experience with JavaScript?",
  "category": "technical",
  "difficulty": "medium"
}
```

### 4. Answer
```json
{
  "type": "answer",
  "answer": "I have 5 years of experience with JavaScript...",
  "questionId": "optional-question-id"
}
```

### 5. Note (Interviewer only)
```json
{
  "type": "note",
  "note": "Candidate shows strong problem-solving skills",
  "category": "technical"
}
```

### 6. Ping/Pong
```json
{
  "type": "ping"
}
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. For development with auto-restart:
```bash
npm run dev
```

## Usage

### Starting the Server
The server runs on port 3000 by default (configurable via PORT environment variable):

```bash
# Default port 3000
npm start

# Custom port
PORT=8080 npm start
```

### WebSocket Connection
Connect to the WebSocket server at:
```
ws://localhost:3000
```

### REST API Endpoints

#### Health Check
```bash
GET /health
```
Returns server status and connected client count.

#### Client List
```bash
GET /clients
```
Returns list of currently connected clients with their roles and connection info.

#### Test Interface
```bash
GET /
```
Access the built-in test client at `http://localhost:3000`

## Testing

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Use the test interface to:
   - Connect to the WebSocket server
   - Register as an interviewer or candidate
   - Send different types of messages
   - View real-time message logs

## Architecture

### Client Management
- Each client gets a unique ID upon connection
- Clients can register as either "interviewer" or "candidate"
- Connection state is tracked and managed

### Message Broadcasting
- **All clients**: Transcriptions, questions, answers
- **Role-specific**: Notes are only sent to interviewers
- **Excluding sender**: User join/leave notifications

### Error Handling
- Invalid JSON messages are caught and reported
- Unknown message types return error responses
- WebSocket connection errors are logged

## Environment Variables

- `PORT`: Server port (default: 3000)

## Dependencies

- **ws**: WebSocket server implementation
- **express**: HTTP server and REST API
- **cors**: Cross-origin resource sharing
- **nodemon**: Development auto-restart (dev dependency)

## Use Cases

1. **Live Interview Transcription**: Real-time speech-to-text during video interviews
2. **Interview Management**: Question tracking and answer recording
3. **Collaborative Note-taking**: Interviewer notes and feedback
4. **Multi-participant Interviews**: Support for multiple interviewers
5. **Interview Analytics**: Message logging for post-interview analysis

## Security Considerations

- Notes are only visible to interviewers for candidate privacy
- All messages include timestamps for audit trails
- Connection and disconnection events are logged
- Consider adding authentication for production use

## Future Enhancements

- Authentication and authorization
- Message persistence and database integration
- Interview session management
- File upload support for resumes/documents
- Integration with calendar systems
- Audio/video call integration
- AI-powered interview insights
