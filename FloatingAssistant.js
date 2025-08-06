// FloatingAssistant.js - React component for floating AI assistant panel
import React, { useState, useEffect, useRef } from 'react';

const FloatingAssistant = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0 });

  // Minimal CSS styles
  const styles = {
    panel: {
      position: 'fixed',
      top: `${position.y}px`,
      right: `${position.x}px`,
      width: isMinimized ? '60px' : '320px',
      height: isMinimized ? '60px' : '400px',
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999,
      transition: 'all 0.3s ease',
      cursor: isDragging ? 'grabbing' : 'default',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      padding: '12px',
      backgroundColor: '#007bff',
      color: 'white',
      borderRadius: '11px 11px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'grab',
      fontSize: '14px',
      fontWeight: '600'
    },
    content: {
      padding: '16px',
      height: 'calc(100% - 48px)',
      overflow: 'hidden',
      display: isMinimized ? 'none' : 'flex',
      flexDirection: 'column'
    },
    button: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    recordButton: {
      backgroundColor: isRecording ? '#dc3545' : '#28a745',
      color: 'white',
      width: '100%',
      marginBottom: '12px'
    },
    textArea: {
      width: '100%',
      height: '80px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '8px',
      fontSize: '12px',
      resize: 'none',
      marginBottom: '12px'
    },
    responseArea: {
      flex: 1,
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
      padding: '12px',
      fontSize: '12px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap'
    },
    minimizeBtn: {
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '16px',
      cursor: 'pointer',
      padding: '4px'
    },
    minimizedIcon: {
      display: isMinimized ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      fontSize: '24px',
      color: '#007bff'
    }
  };

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      });
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
  }, [isDragging]);

  // Start/stop recording
  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      // In a real implementation, stop recording here
      console.log('Stopping recording...');
    } else {
      setIsRecording(true);
      // In a real implementation, start recording here
      console.log('Starting recording...');
      
      // Simulate recording for demo
      setTimeout(() => {
        setIsRecording(false);
        setTranscription('This is a sample transcription from the microphone.');
      }, 3000);
    }
  };

  // Send to AI for processing
  const sendToAI = async () => {
    if (!transcription.trim()) return;
    
    setIsLoading(true);
    try {
      // Mock AI response - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAiResponse(`AI Analysis of: "${transcription}"\n\nThis appears to be a technical discussion. Here are some suggested follow-up questions:\n\n1. Can you elaborate on the implementation details?\n2. What challenges did you face?\n3. How would you optimize this solution?`);
    } catch (error) {
      setAiResponse('Error processing request: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all content
  const clearAll = () => {
    setTranscription('');
    setAiResponse('');
  };

  return (
    <div ref={panelRef} style={styles.panel}>
      {/* Minimized state */}
      <div style={styles.minimizedIcon} onClick={() => setIsMinimized(false)}>
        🤖
      </div>

      {/* Header */}
      <div style={styles.header} onMouseDown={handleMouseDown}>
        <span>🎤 AI Assistant</span>
        <button 
          style={styles.minimizeBtn}
          onClick={() => setIsMinimized(!isMinimized)}
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
          {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
        </button>

        {/* Transcription Area */}
        <textarea
          style={styles.textArea}
          placeholder="Transcribed text will appear here..."
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
        />

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button 
            style={{...styles.button, backgroundColor: '#007bff', color: 'white', flex: 1}}
            onClick={sendToAI}
            disabled={!transcription.trim() || isLoading}
          >
            {isLoading ? '⏳ Processing...' : '🧠 Analyze'}
          </button>
          <button 
            style={{...styles.button, backgroundColor: '#6c757d', color: 'white'}}
            onClick={clearAll}
          >
            🗑️
          </button>
        </div>

        {/* AI Response Area */}
        <div style={styles.responseArea}>
          {aiResponse || 'AI responses will appear here...'}
        </div>
      </div>
    </div>
  );
};

export default FloatingAssistant;
