import { useState, useRef, useEffect } from 'react';
import { Send, X, Zap } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getChatResponse, getSnapshot } from '../engine/simulationEngine';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini AI Service
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Debug: log whether the key loaded (visible in browser console)
console.info('[FlowBot] Gemini key loaded:', GEMINI_KEY ? '✅ YES' : '❌ NOT FOUND');
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

const QUICK_QUESTIONS = [
  'Best food now?',
  'Find restroom',
  'Quickest exit',
  'Crowd status',
  'Wait times',
  'Is it safe?',
];

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    text: `👋 Hi, I'm **FlowBot** — your AI stadium assistant powered by ${genAI ? '✨ Google Gemini AI' : 'SmartFlow Engine'}! Ask me anything about queues, food, exits, or crowd status.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
];

function parseMarkdown(text) {
  const rawHtml = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(rawHtml);
}

// Build a stadium-aware system prompt for Gemini
function buildSystemPrompt() {
  const snap = getSnapshot();
  const zones = snap.zones;
  const phase = snap.eventPhase;

  const zoneInfo = Object.entries(zones)
    .map(([id, z]) => `${id}: density=${Math.round((z.density||0)*100)}%, waitTime=${z.waitTime||0}min`)
    .join('; ');

  return `You are FlowBot, an AI assistant for SmartFlow AI — a real-time stadium crowd management system for Arena Championship 2025.

CURRENT STADIUM STATE:
- Event Phase: ${phase.replace('_', ' ')}
- Zone Data: ${zoneInfo}

YOUR ROLE:
- Help attendees navigate the stadium intelligently
- Recommend the least crowded food courts, restrooms, and exits
- Provide crowd safety information
- Give concise, friendly, actionable answers
- Use emojis naturally to make responses feel premium
- Keep responses to 2-3 sentences max unless detailed directions are needed
- Always reference the REAL live zone data above when answering

Respond in a helpful, energetic stadium assistant tone.`;
}

async function getGeminiResponse(userMessage) {
  if (!genAI) return null;
  try {
    // systemInstruction must be set on the model, not on startChat
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: buildSystemPrompt(),
    });
    const result = await model.generateContent(userMessage);
    return result.response.text();
  } catch (err) {
    console.warn('[FlowBot] Gemini API error, falling back to local engine:', err.message);
    return null;
  }
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

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = {
      role: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Try Gemini first, fall back to local engine
    let response;
    if (genAI) {
      response = await getGeminiResponse(text.trim());
    }
    if (!response) {
      // Simulate slight delay for local responses too
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
      response = getChatResponse(text.trim());
    }

    setTyping(false);
    setMessages(prev => [
      ...prev,
      {
        role: 'bot',
        text: response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGemini: !!genAI,
      }
    ]);
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
        <div className="chatbot-window" role="dialog" aria-modal="true" aria-label="FlowBot Chat">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-avatar">🤖</div>
            <div>
              <div className="chatbot-title">FlowBot</div>
              <div className="chatbot-status">
                ● Online •{' '}
                {genAI ? (
                  <span style={{ color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Zap size={10} /> Gemini AI
                  </span>
                ) : 'SmartFlow Engine'}
              </div>
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
                <span className="chat-time">
                  {msg.time}
                  {msg.isGemini && (
                    <span style={{ marginLeft: 6, color: '#a78bfa', fontSize: '0.65rem' }}>
                      ✦ Gemini
                    </span>
                  )}
                </span>
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
                    {genAI && (
                      <span style={{ fontSize: '0.7rem', color: '#a78bfa', marginLeft: 6 }}>
                        Gemini thinking…
                      </span>
                    )}
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
              placeholder={genAI ? 'Ask anything — powered by Gemini AI…' : 'Ask about queues, food, exits…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              aria-label="Chat input"
            />
            <button
              className="chatbot-send"
              onClick={() => sendMessage(input)}
              aria-label="Send message"
              disabled={typing}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
