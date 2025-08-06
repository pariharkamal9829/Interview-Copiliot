// Enhanced FloatingAssistant with real API integration
import React, { useState, useEffect, useRef } from 'react';

const FloatingAssistantWithAPI = ({ apiEndpoint = '/api' }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  
  const panelRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0 });

  // Minimal styles with enhanced visual feedback
  const styles = {
    panel: {
      position: 'fixed',
      top: `${position.y}px`,
      right: `${position.x}px`,
      width: isMinimized ? '60px' : '340px',
      height: isMinimized ? '60px' : '480px',
      backgroundColor: '#fff',
      border: '1px solid #e1e5e9',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      zIndex: 9999,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: isDragging ? 'grabbing' : 'default',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)'
    },
    header: {
      padding: '16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: '15px 15px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'grab',
      fontSize: '14px',
      fontWeight: '600',
      userSelect: 'none'
    },
    content: {
      padding: '20px',
      height: 'calc(100% - 64px)',
      overflow: 'hidden',
      display: isMinimized ? 'none' : 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    button: {
      padding: '10px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    recordButton: {
      backgroundColor: isRecording ? '#ef4444' : '#10b981',
      color: 'white',
      width: '100%',
      animation: isRecording ? 'pulse 2s infinite' : 'none'
    },
    textArea: {
      width: '100%',
      height: '90px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '13px',
      resize: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s ease',
      outline: 'none'
    },
    responseArea: {
      flex: 1,
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      fontSize: '13px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.5'
    },
    minimizeBtn: {
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      transition: 'background-color 0.2s ease'
    },
    minimizedIcon: {
      display: isMinimized ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      fontSize: '28px',
      cursor: 'pointer',
      transition: 'transform 0.2s ease'
    },
    statusIndicator: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: isRecording ? '#ef4444' : '#10b981',
      marginLeft: '8px',
      animation: isRecording ? 'blink 1s infinite' : 'none'
    }
  };

  // Drag functionality
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - (isMinimized ? 60 : 340), e.clientX - dragRef.current.startX));
      const newY = Math.max(0, Math.min(window.innerHeight - (isMinimized ? 60 : 480), e.clientY - dragRef.current.startY));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isMinimized]);

  // Real microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);

    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Microphone access denied. Please allow microphone access to use voice recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Transcribe audio using Whisper API
  const transcribeAudio = async (audioBlob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${apiEndpoint}/transcribe`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setTranscription(result.text);
      } else {
        setTranscription(`❌ Transcription error: ${result.error}`);
      }
    } catch (error) {
      setTranscription(`❌ Network error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Send to AI for analysis
  const analyzeWithAI = async () => {
    if (!transcription.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}/ai/analyze-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: "General interview response",
          answer: transcription,
          expectedSkills: ["Communication", "Technical Knowledge"]
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const analysis = result.analysis;
        setAiResponse(`🎯 AI Analysis (Score: ${analysis.overall_score}/10)

💪 Strengths:
${analysis.strengths?.map(s => `• ${s}`).join('\n') || '• Good response structure'}

🔧 Areas for Improvement:
${analysis.weaknesses?.map(w => `• ${w}`).join('\n') || '• Consider adding more specific examples'}

📋 Recommendations:
${analysis.recommendations?.map(r => `• ${r}`).join('\n') || '• Provide concrete examples'}

❓ Follow-up Questions:
${analysis.followup_questions?.map(q => `• ${q}`).join('\n') || '• Can you elaborate further?'}`);
      } else {
        setAiResponse(`❌ AI Analysis error: ${result.error}`);
      }
    } catch (error) {
      setAiResponse(`❌ AI service error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setTranscription('');
    setAiResponse('');
  };

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div ref={panelRef} style={styles.panel}>
      {/* Minimized state */}
      <div 
        style={styles.minimizedIcon} 
        onClick={() => setIsMinimized(false)}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        🤖
      </div>

      {/* Header */}
      <div style={styles.header} onMouseDown={handleMouseDown}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span>🎤 AI Assistant</span>
          <div style={styles.statusIndicator}></div>
        </div>
        <button 
          style={styles.minimizeBtn}
          onClick={() => setIsMinimized(!isMinimized)}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          {isMinimized ? '⬜' : '➖'}
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Recording Button */}
        <button 
          style={{...styles.button, ...styles.recordButton}}
          onClick={toggleRecording}
          disabled={isLoading}
        >
          {isRecording ? (
            <>⏹️ Stop Recording</>
          ) : (
            <>🎤 Start Recording</>
          )}
        </button>

        {/* Transcription Area */}
        <textarea
          style={styles.textArea}
          placeholder="🎙️ Transcribed speech will appear here..."
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            style={{
              ...styles.button, 
              backgroundColor: '#667eea', 
              color: 'white', 
              flex: 1
            }}
            onClick={analyzeWithAI}
            disabled={!transcription.trim() || isLoading}
            onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#5a67d8')}
            onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#667eea')}
          >
            {isLoading ? <>⏳ Processing...</> : <>🧠 Analyze</>}
          </button>
          <button 
            style={{...styles.button, backgroundColor: '#6b7280', color: 'white'}}
            onClick={clearAll}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
          >
            🗑️
          </button>
        </div>

        {/* AI Response Area */}
        <div style={styles.responseArea}>
          {aiResponse || '💭 AI analysis will appear here...\n\n1. Record your voice or type text\n2. Click "Analyze" for AI insights\n3. Get suggestions and feedback'}
        </div>
      </div>
    </div>
  );
};

export default FloatingAssistantWithAPI;
