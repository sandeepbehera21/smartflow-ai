import { useState, useRef, useEffect } from 'react';
import { Send, X, Zap } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getChatResponse, getSnapshot } from '../engine/simulationEngine';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini AI Service
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// Rate limiter — max 4 requests per minute to stay within free tier
let requestTimestamps = [];
const MAX_RPM = 4;

function isRateLimited() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(t => now - t < 60000);
  return requestTimestamps.length >= MAX_RPM;
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

// Response cache to avoid duplicate API calls
const responseCache = new Map();

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
    text: `👋 Hi, I'm **FlowBot** — your AI stadium assistant${genAI ? ' powered by ✨ Google Gemini AI' : ''}! Ask me anything about queues, food, exits, or crowd status.`,
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

// Build a compact stadium context for Gemini (keep tokens LOW)
function buildSystemPrompt() {
  const snap = getSnapshot();
  const zones = snap.zones;
  const phase = snap.eventPhase;

  // Only include top 6 busiest zones to save tokens
  const topZones = Object.entries(zones)
    .filter(([id]) => id !== 'FIELD')
    .sort(([,a], [,b]) => (b.density||0) - (a.density||0))
    .slice(0, 6)
    .map(([id, z]) => `${id}:${Math.round((z.density||0)*100)}%/${z.waitTime||0}min`)
    .join(', ');

  return `You are FlowBot, AI assistant for SmartFlow AI stadium system at Arena Championship 2025.
Phase: ${phase.replace('_',' ')}. Top zones: ${topZones}.
Give short (2-3 sentence), helpful, emoji-rich answers about food, restrooms, exits, crowds, safety. Use the zone data above.`;
}

async function getGeminiResponse(userMessage) {
  if (!genAI) return null;

  // Check cache first
  const cacheKey = userMessage.toLowerCase().trim();
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }

  // Check rate limit
  if (isRateLimited()) {
    console.info('[FlowBot] Rate limited, using local engine');
    return null;
  }

  try {
    recordRequest();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: buildSystemPrompt(),
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
      },
    });
    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    // Cache the response
    responseCache.set(cacheKey, text);
    return text;
  } catch (err) {
    console.warn('[FlowBot] Gemini error:', err.message);
    // If quota exceeded, disable Gemini for 60 seconds
    if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      // Fill up rate limiter to block further requests
      for (let i = 0; i < MAX_RPM; i++) requestTimestamps.push(Date.now());
    }
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
    if (!text.trim() || typing) return;
    const userMsg = {
      role: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    let response = null;
    let usedGemini = false;

    // Try Gemini first
    if (genAI) {
      response = await getGeminiResponse(text.trim());
      if (response) usedGemini = true;
    }

    // Fallback to local engine
    if (!response) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
      response = getChatResponse(text.trim());
    }

    setTyping(false);
    setMessages(prev => [
      ...prev,
      {
        role: 'bot',
        text: response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGemini: usedGemini,
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
                        background: genAI ? '#a78bfa' : 'var(--text-secondary)',
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
                disabled={typing}
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
