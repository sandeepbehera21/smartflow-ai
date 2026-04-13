import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { getChatResponse } from '../engine/simulationEngine';

const QUICK_QUESTIONS = [
  'Best food now?',
  'Find restroom',
  'Quickest exit',
  'Crowd status',
  'Wait times',
];

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    text: "👋 Hi, I'm **FlowBot** — your AI stadium assistant! Ask me anything about queues, food, exits, or crowd status.",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
];

function parseMarkdown(text) {
  // Very simple **bold** parser
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, typing]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = {
      role: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate network delay for realism
    setTimeout(() => {
      const response = getChatResponse(text.trim());
      setTyping(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }, 700 + Math.random() * 500);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* FAB Button */}
      {!open && (
        <button
          className="chatbot-fab"
          onClick={() => setOpen(true)}
          title="Open FlowBot Assistant"
          aria-label="Open AI chatbot"
        >
          🤖
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="chatbot-window" role="dialog" aria-label="FlowBot Chat">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-avatar">🤖</div>
            <div>
              <div className="chatbot-title">FlowBot</div>
              <div className="chatbot-status">● Online • AI-Powered</div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div
                  className="chat-bubble"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                />
                <span className="chat-time">{msg.time}</span>
              </div>
            ))}

            {typing && (
              <div className="chat-msg bot">
                <div className="chat-bubble" style={{ padding: '10px 16px' }}>
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    {[0.1, 0.2, 0.3].map((d, i) => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--text-secondary)',
                        animation: `pulse-ring 1.2s ${d}s infinite`,
                        display: 'inline-block',
                      }} />
                    ))}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick Buttons */}
          <div className="chatbot-quick-btns">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                className="quick-btn"
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chatbot-input-row">
            <input
              className="chatbot-input"
              placeholder="Ask about queues, food, exits…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              aria-label="Chat input"
            />
            <button
              className="chatbot-send"
              onClick={() => sendMessage(input)}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
