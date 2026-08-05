import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your Student Academic Assistant. I can answer questions about students, marks, CGPAs, ranks, and toppers in our database.\n\nTry asking me something like: *"Who is the college topper?"* or *"Show ECE students with CGPA above 8.5"*.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextRegNo, setContextRegNo] = useState(null);

  const messagesEndRef = useRef(null);

  const presetQueries = [
    'Who is the college topper?',
    'Show his marks.',
    'Who is the ECE topper?',
    'Show ECE students with CGPA above 8.5',
    'How many girls are in IT?',
    'Show students with arrears.',
    'Show all students with distinction.',
    'Show department pass percentage statistics',
    'Who has 0 arrears?'
  ];

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (messageText) => {
    if (!messageText.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: messageText }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat', {
        message: messageText,
        contextRegNo
      });

      // Add bot message and update context
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: response.data.responseText }
      ]);
      if (response.data.contextRegNo) {
        setContextRegNo(response.data.contextRegNo);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: err.response?.data?.message || 'Sorry, I encountered an error connecting to the chatbot service.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  // Convert markdown-style response from chatbot service into formatted HTML safely
  const formatMarkdownToHtml = (text) => {
    if (!text) return '';
    
    // Basic escaping to prevent raw tag issues
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings (e.g. ### Header)
    html = html.replace(/^### (.*$)/gim, '<h3 style="margin-top: 0.75rem; margin-bottom: 0.5rem; font-family: var(--font-title); font-size: 1.1rem; color: var(--primary);">$1</h3>');

    // Bold text (e.g. **bold**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #60a5fa; font-weight: 600;">$1</strong>');

    // Inline Highlights (e.g. `code`)
    html = html.replace(/`(.*?)`/g, '<code style="background-color: rgba(255,255,255,0.06); padding: 0.1rem 0.35rem; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #fbbf24;">$1</code>');

    // Process lines for lists and paragraphs
    const lines = html.split('\n');
    const formattedLines = lines.map(line => {
      // Bullet list items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li style="margin-left: 1.25rem; margin-bottom: 0.25rem; list-style-type: disc;">${line.substring(2)}</li>`;
      }
      
      // Numbered list items
      const numberedMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numberedMatch) {
        return `<li style="margin-left: 1.25rem; margin-bottom: 0.25rem; list-style-type: decimal;">${numberedMatch[2]}</li>`;
      }

      // Paragraph / line break
      return line.trim() ? `<p style="margin-bottom: 0.5rem;">${line}</p>` : '<br/>';
    });

    return formattedLines.join('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div className="dashboard-header">
        <h1>Academic NLQ Chatbot</h1>
        <p>
          {user?.role === 'student'
            ? 'Ask academic questions and view your chatbot workspace.'
            : 'Query the student database using conversational English. Only academic queries are allowed.'}
        </p>
      </div>

      <div className="chat-container">
        {/* Messages List */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-bubble-wrapper ${msg.sender}`}>
              <div className="chat-sender-name">
                {msg.sender === 'user' ? 'You' : 'EduBot Assistant'}
              </div>
              <div
                className="chat-bubble"
                dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(msg.text) }}
              />
            </div>
          ))}

          {loading && (
            <div className="chat-bubble-wrapper bot">
              <div className="chat-sender-name">EduBot Assistant</div>
              <div className="chat-bubble" style={{ display: 'inline-flex', padding: '0.75rem 1rem' }}>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset suggestions & input bar */}
        <div className="chat-input-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div>
            <div className="preset-queries-header">Suggested Test Queries</div>
            <div className="preset-queries-grid">
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  className="preset-query-btn"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask an academic question (e.g. Who is the college topper?)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
          {contextRegNo && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', alignSelf: 'flex-start' }}>
              Active Query Context (Student): <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{contextRegNo}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
