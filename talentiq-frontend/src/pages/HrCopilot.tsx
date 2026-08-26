import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { Bot, Send, Sparkles, UserCheck, Briefcase, Settings, Sun, Moon } from 'lucide-react';
import { InteractiveGalaxyBackground } from '../components/InteractiveGalaxyBackground';
import { HrSidebar } from '../components/HrSidebar';
import '../css/hr-copilot.css';

interface ChatMessage {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export const HrCopilot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextType, setContextType] = useState<'GENERAL' | 'CANDIDATE' | 'JOB'>('GENERAL');
  const [preferredModel, setPreferredModel] = useState('gpt-4o');
  const { theme, toggleTheme, isUniverse } = useTheme();
  const [conversationId, setConversationId] = useState<number | null>(null);

  useEffect(() => {
    // Initial greeting
    setMessages([
      {
        id: 1,
        role: 'ASSISTANT',
        content: 'Hello! I am your HireMind AI Copilot. Ask me any question to analyze job requirements, synthesize candidate evaluations, or generate technical interview questions.',
        createdAt: new Date().toISOString()
      }
    ]);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt.trim();
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'USER',
      content: userText,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      let activeConvId = conversationId;
      if (!activeConvId) {
        const convRes = await apiClient.post('/copilot/conversations', {
          title: userText.slice(0, 30),
          contextType: contextType || 'GENERAL'
        });
        activeConvId = convRes.data?.data?.id;
        setConversationId(activeConvId);
      }

      if (activeConvId) {
        const res = await apiClient.post(`/copilot/conversations/${activeConvId}/messages`, {
          content: userText
        });
        const reply = res.data?.data;
        if (reply) {
          setMessages(prev => [...prev, {
            id: reply.id || Date.now() + 1,
            role: reply.role || 'ASSISTANT',
            content: reply.content || 'Analysis complete.',
            createdAt: reply.createdAt || new Date().toISOString()
          }]);
        }
      }
    } catch (err: any) {
      console.warn('AI Copilot request failed:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ASSISTANT',
        content: 'AI Copilot service is currently unavailable or generating response. Please check server logs or retry.',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <InteractiveGalaxyBackground theme={theme} />
      <HrSidebar activeNav="Copilot" />
      <div className={`copilot-container ${isUniverse ? 'theme-universe' : 'theme-light'}`} style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        {/* Context Sidebar */}
      <div className="glass-panel copilot-sidebar solar-theme-accent">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 className="copilot-sidebar-title" style={{ margin: 0 }}>
              <Bot size={18} color="var(--primary-cyan)" /> Copilot Context
            </h3>
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Toggle Light / Galaxy Theme"
            >
              {isUniverse ? <Sun size={13} color="#F59E0B" /> : <Moon size={13} color="#7C3AED" />}
            </button>
          </div>
          <p className="copilot-sidebar-subtitle">Select active RAG context mode</p>

          <div className="copilot-mode-btn-group">
            <button
              className={`btn ${contextType === 'GENERAL' ? 'btn-primary' : 'btn-secondary'} copilot-mode-btn`}
              onClick={() => setContextType('GENERAL')}
            >
              <Sparkles size={16} /> General Assistant
            </button>
            <button
              className={`btn ${contextType === 'CANDIDATE' ? 'btn-primary' : 'btn-secondary'} copilot-mode-btn`}
              onClick={() => setContextType('CANDIDATE')}
            >
              <UserCheck size={16} /> Active Candidate Context
            </button>
            <button
              className={`btn ${contextType === 'JOB' ? 'btn-primary' : 'btn-secondary'} copilot-mode-btn`}
              onClick={() => setContextType('JOB')}
            >
              <Briefcase size={16} /> Active Job Posting Context
            </button>
          </div>
        </div>

        <div className="copilot-settings-box">
          <h4 className="copilot-settings-heading">
            <Settings size={14} /> Model Settings
          </h4>
          <label className="copilot-settings-label">Preferred Model</label>
          <select className="input-field copilot-settings-select" value={preferredModel} onChange={(e) => setPreferredModel(e.target.value)}>
            <option value="gpt-4o">OpenAI GPT-4o (Default)</option>
            <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
            <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
          </select>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="glass-panel copilot-chat-panel solar-theme-accent">
        {/* Header */}
        <div className="copilot-chat-header">
          <div className="copilot-status-indicator">
            <div className="copilot-status-dot" />
            <span className="copilot-header-title">HR Copilot Active Session ({contextType} MODE)</span>
          </div>
          <span className="badge badge-cyan">{preferredModel}</span>
        </div>

        {/* Messages Stream */}
        <div className="copilot-messages-stream">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`copilot-msg-bubble ${msg.role.toLowerCase()}`}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="copilot-typing-bubble">
              AI Copilot is thinking...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="copilot-input-bar">
          <input
            type="text"
            className="input-field"
            placeholder="Ask Copilot (e.g. Compare candidate skills against Senior Java posting)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Send size={16} /> Send
          </button>
        </form>
      </div>
      </div>
    </div>
  );
};

export default HrCopilot;
