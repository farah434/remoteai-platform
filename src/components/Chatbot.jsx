import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mentorAPI } from '../services/api';
import { getCareerSuggestions } from '../utils/matching';

const localFallback = (msg, skills) => {
  const m = msg.toLowerCase();
  const suggestions = getCareerSuggestions(skills);

  if (m.includes('hello') || m.includes('hi') || m.includes('hey'))
    return "Hello! 👋 I'm your AI Career Mentor. Ask me anything about your career path, skills to learn, or salary expectations!";
  if (m.includes('skill'))
    return skills.length > 0
      ? `Your current skills: ${skills.slice(0, 5).join(', ')}${skills.length > 5 ? '…' : ''}. Head to your Profile to add more!`
      : "You haven't added any skills yet. Visit your Profile tab to get started!";
  if (m.includes('learn') || m.includes('improve') || m.includes('what should'))
    return `Based on your profile, I recommend:\n\n${suggestions.map(s => `${s.icon} ${s.skill} — ${s.reason}`).join('\n')}`;
  if (m.includes('salary') || m.includes('earn') || m.includes('pay'))
    return "Remote salary ranges:\n\n• Entry level: $12–25/hr\n• Mid-level: $40–80/hr\n• Senior: $80–150/hr\n\nYour earning potential depends on your skills and experience.";
  if (m.includes('job') || m.includes('apply') || m.includes('find'))
    return "Check the Jobs page — it shows your AI match score for every listing. Filter by type, level, or search by skill to find your best fits!";
  if (m.includes('roadmap') || m.includes('path') || m.includes('career'))
    return "Visit your Profile → Roadmap tab to see a personalized career path based on your current skills and goals!";
  return "I'm here to help with your career! Try asking:\n\n• \"What should I learn next?\"\n• \"What's the salary for my skills?\"\n• \"How do I find remote jobs?\"";
};

export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello! 👋 I'm your AI Career Mentor. Ask me anything about skills, salaries, or your career path!" }
  ]);
  const { user } = useAuth();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || thinking) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setThinking(true);

    const skills = user?.skills || [];
    try {
      const data = await mentorAPI.chat(msg, skills);
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: localFallback(msg, skills) }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <h4>🤖 AI Career Mentor</h4>
              <span>{thinking ? 'Thinking…' : 'Online — Ask anything'}</span>
            </div>
            <button className="chat-close-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`} style={{ whiteSpace: 'pre-line' }}>
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="chat-msg bot" style={{ opacity: 0.6, fontSize: 18, letterSpacing: 4 }}>…</div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-quick-btns">
            {['What should I learn?', 'Best jobs for me?', 'Salary ranges?'].map(q => (
              <button key={q} className="quick-btn" onClick={() => send(q)} disabled={thinking}>{q}</button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything…"
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={thinking}
            />
            <button className="chat-send-btn" onClick={() => send()} disabled={thinking || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}

      <button className="chat-fab" onClick={() => setOpen(o => !o)} title="AI Career Mentor">
        {open ? '✕' : '🤖'}
      </button>
    </>
  );
}
