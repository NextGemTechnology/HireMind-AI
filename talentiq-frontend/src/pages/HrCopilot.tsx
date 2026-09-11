import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  Send, Sparkles, UserCheck, Briefcase, Settings,
  Plus, Trash2, RotateCcw, ShieldAlert, MessageSquare
} from 'lucide-react';
import { HrSidebar } from '../components/HrSidebar';
import { AiLogo } from '../components/AiLogo';
import '../css/hr-copilot.css';

interface ChatMessage {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface ConversationItem {
  id: number;
  title: string;
  contextType: string;
  contextId?: number;
  messageCount: number;
  updatedAt: string;
}

export const HrCopilot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextType, setContextType] = useState<'GENERAL' | 'CANDIDATE' | 'JOB'>('GENERAL');
  const [contextId, setContextId] = useState<string>('');
  const [preferredModel, setPreferredModel] = useState('gpt-4o');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const initialGreeting: ChatMessage = {
    id: 1,
    role: 'ASSISTANT',
    content: 'Hello! I am your HireMind AI Recruitment Copilot. Ask me to compare candidate qualifications against role requirements, formulate targeted behavioral interview questions, or evaluate technical skill alignment.',
    createdAt: new Date().toISOString()
  };

  useEffect(() => {
    fetchConversations();
    fetchCopilotConfig();
    setMessages([initialGreeting]);
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get('/copilot/conversations');
      const list = res.data?.data || res.data || [];
      setConversations(list);
    } catch (e: any) {
      console.warn('Could not fetch conversations:', e);
    }
  };

  const fetchCopilotConfig = async () => {
    try {
      const res = await apiClient.get('/copilot/config');
      const data = res.data?.data || res.data;
      if (data?.preferredModel) {
        setPreferredModel(data.preferredModel);
      }
    } catch (e: any) {
      console.warn('Could not load copilot config:', e);
    }
  };

  const handleModelChange = async (newModel: string) => {
    setPreferredModel(newModel);
    try {
      await apiClient.put('/copilot/config', { preferredModel: newModel });
    } catch (e: any) {
      console.warn('Failed to update preferred model in backend:', e);
    }
  };

  const handleSelectConversation = async (conv: ConversationItem) => {
    setConversationId(conv.id);
    setContextType((conv.contextType as any) || 'GENERAL');
    if (conv.contextId) setContextId(String(conv.contextId));
    setLoading(true);
    try {
      const res = await apiClient.get(`/copilot/conversations/${conv.id}/messages`);
      const rawMessages = res.data?.data || res.data || [];
      if (rawMessages.length === 0) {
        setMessages([initialGreeting]);
      } else {
        setMessages(rawMessages);
      }
    } catch (e: any) {
      console.warn('Could not load conversation messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([initialGreeting]);
    setSecurityNotice(null);
  };

  const handleDeleteConversation = async (convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/copilot/conversations/${convId}`);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (conversationId === convId) {
        handleNewChat();
      }
    } catch (e: any) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const handleClearMessages = async () => {
    if (!conversationId) {
      setMessages([initialGreeting]);
      return;
    }
    try {
      await apiClient.delete(`/copilot/conversations/${conversationId}/messages`);
      setMessages([initialGreeting]);
    } catch (e: any) {
      console.error('Failed to clear conversation messages:', e);
    }
  };

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
    setSecurityNotice(null);

    try {
      let activeConvId = conversationId;
      if (!activeConvId) {
        const convRes = await apiClient.post('/copilot/conversations', {
          title: userText.length > 35 ? userText.slice(0, 35) + '...' : userText,
          contextType: contextType || 'GENERAL',
          contextId: contextId ? Number(contextId) : null
        });
        activeConvId = convRes.data?.data?.id;
        setConversationId(activeConvId);
        fetchConversations();
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
      const errMsg = err?.response?.data?.message || 'AI Copilot service is currently unavailable or generating response.';
      setSecurityNotice(errMsg);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ASSISTANT',
        content: `⚠️ ${errMsg}`,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1, backgroundColor: '#F8FAFC' }}>
      <HrSidebar activeNav="Copilot" />

      <div className="copilot-container theme-light" style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        
        {/* Left Context & Session Dock */}
        <div className="glass-panel copilot-sidebar solar-theme-accent" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 className="copilot-sidebar-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AiLogo size={20} animated /> HR Copilot
              </h3>
            </div>
            <p className="copilot-sidebar-subtitle">Recruiter Intelligence & RAG Dock</p>

            <button
              onClick={handleNewChat}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '10px', backgroundColor: '#4F46E5', color: '#fff',
                border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginTop: '6px'
              }}
            >
              <Plus size={16} /> New Copilot Session
            </button>
          </div>

          {/* Context Mode Selection */}
          <div>
            <label className="copilot-settings-label" style={{ marginBottom: '6px', display: 'block' }}>RAG Context Mode</label>
            <div className="copilot-mode-btn-group">
              <button
                className={`btn ${contextType === 'GENERAL' ? 'btn-primary' : 'btn-secondary'} copilot-mode-btn`}
                onClick={() => setContextType('GENERAL')}
              >
                <Sparkles size={14} /> General Assistant
              </button>
              <button
                className={`btn ${contextType === 'CANDIDATE' ? 'btn-primary' : 'btn-secondary'} copilot-mode-btn`}
                onClick={() => setContextType('CANDIDATE')}
              >
                <UserCheck size={14} /> Candidate Context
              </button>
              <button
                className={`btn ${contextType === 'JOB' ? 'btn-primary' : 'btn-secondary'} copilot-mode-btn`}
                onClick={() => setContextType('JOB')}
              >
                <Briefcase size={14} /> Job Posting Context
              </button>
            </div>

            {contextType !== 'GENERAL' && (
              <div style={{ marginTop: '8px' }}>
                <label className="copilot-settings-label" style={{ fontSize: '11px' }}>
                  {contextType === 'CANDIDATE' ? 'Candidate ID #' : 'Job Requisition ID #'}
                </label>
                <input
                  type="number"
                  placeholder={contextType === 'CANDIDATE' ? 'e.g. 104' : 'e.g. 12'}
                  className="input-field"
                  value={contextId}
                  onChange={(e) => setContextId(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                />
              </div>
            )}
          </div>

          {/* Model Settings */}
          <div className="copilot-settings-box">
            <h4 className="copilot-settings-heading">
              <Settings size={14} /> Model Gateway
            </h4>
            <label className="copilot-settings-label">Preferred LLM</label>
            <select
              className="input-field copilot-settings-select"
              value={preferredModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="gpt-4o">OpenAI GPT-4o (Enterprise)</option>
              <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
              <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
            </select>
          </div>

          {/* Past Sessions List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <label className="copilot-settings-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={13} /> Active Sessions ({conversations.length})
            </label>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {conversations.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94A3B8', padding: '8px 0' }}>No past sessions saved</div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    style={{
                      padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: conversationId === c.id ? 'rgba(99,102,241,0.2)' : 'rgba(30,41,59,0.4)',
                      border: conversationId === c.id ? '1px solid #6366F1' : '1px solid transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      <div style={{ fontWeight: 600, color: conversationId === c.id ? '#818CF8' : '#F1F5F9' }}>{c.title || 'Chat Session'}</div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>{c.contextType} · {c.messageCount} msgs</div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                      title="Archive Session"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Main Chat Panel */}
        <div className="glass-panel copilot-chat-panel solar-theme-accent" style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div className="copilot-chat-header">
            <div className="copilot-status-indicator">
              <div className="copilot-status-dot" />
              <span className="copilot-header-title">
                HR Copilot Active Session {conversationId ? `(#${conversationId})` : '(New)'}
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '8px' }}>
                Mode: <strong>{contextType}</strong> {contextId ? `[ID: ${contextId}]` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleClearMessages}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
                  borderRadius: '8px', background: 'transparent', border: '1px solid #334155',
                  color: '#94A3B8', fontSize: '11px', cursor: 'pointer'
                }}
                title="Clear current message history"
              >
                <RotateCcw size={12} /> Clear
              </button>
              <span className="badge badge-cyan">{preferredModel}</span>
            </div>
          </div>

          {/* Security Alert if any */}
          {securityNotice && (
            <div style={{
              margin: '12px 16px 0', padding: '10px 14px', borderRadius: '8px',
              backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444',
              color: '#F87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <ShieldAlert size={16} /> {securityNotice}
            </div>
          )}

          {/* Messages Stream */}
          <div className="copilot-messages-stream" style={{ flex: 1 }}>
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

          {/* Input Bar with Character Counter */}
          <div>
            <form onSubmit={handleSend} className="copilot-input-bar">
              <input
                type="text"
                className="input-field"
                placeholder="Ask Copilot (e.g. Compare candidate skills against Senior Java posting)..."
                value={prompt}
                maxLength={4000}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !prompt.trim()}>
                <Send size={16} /> Send
              </button>
            </form>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 20px 8px', fontSize: '10px', color: '#64748B' }}>
              {prompt.length} / 4000 chars · AI Security Gateway Active
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HrCopilot;
