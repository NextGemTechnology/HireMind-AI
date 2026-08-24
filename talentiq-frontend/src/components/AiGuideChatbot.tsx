import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { Bot, Sparkles, X, Send, ArrowRight } from 'lucide-react';
import '../css/ai-guide-chatbot.css';

interface Message {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  navLink?: { label: string; path: string };
  time: string;
}

const QUICK_PROMPTS = [
  '🚀 How do I search and apply for jobs?',
  '🏢 How do HR Recruiters post jobs?',
  '⚡ How does AI Match Scoring work?',
  '📄 How does Resume Parsing work?',
  '🔑 Give me demo login credentials',
];

export const AiGuideChatbot: React.FC<{ dark?: boolean }> = ({ dark: propDark }) => {
  const { isUniverse } = useTheme();
  const dark = propDark !== undefined ? propDark : isUniverse;
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! 👋 I'm your **HireMind AI Assistant**. I can guide you through platform features, job searching, HR recruiter tools, AI match scoring, and demo credentials!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now(),
      sender: 'user',
      text: promptText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Try backend API first, or fallback to intelligent Knowledge Base Engine
    setTimeout(async () => {
      let botResponse = '';
      let navLink: { label: string; path: string } | undefined = undefined;

      const lower = promptText.toLowerCase();

      if (lower.includes('apply') || lower.includes('find job') || lower.includes('search')) {
        botResponse = "To search and apply for jobs:\n1. Click **Find Jobs** in the navigation bar to visit the jobs board.\n2. Filter by Remote/Hybrid or search by keywords (e.g. Java, Python).\n3. Click **Apply Now 🚀** on any position!";
        navLink = { label: 'Explore Active Jobs Board 🚀', path: '/jobs' };
      } else if (lower.includes('post') || lower.includes('hr') || lower.includes('recruiter') || lower.includes('employer')) {
        botResponse = "As an HR Recruiter:\n1. Sign in with an HR account.\n2. Access the **HR Dashboard** to view hiring telemetry.\n3. Click **+ Post New Job** to launch career roles live!\n4. Review applicants & download candidate resume PDFs on the **Applicants** page.";
        navLink = { label: 'Open HR Dashboard 📊', path: '/hr-analytics' };
      } else if (lower.includes('match') || lower.includes('score') || lower.includes('algorithm')) {
        botResponse = "⚡ **AI Match Scoring System**:\nOur 4-tier algorithm evaluates:\n• 40% Required Skills Taxonomy\n• 30% Experience Level Alignment\n• 15% Geographic / Remote Preference\n• 15% Education & Certifications";
        navLink = { label: 'View AI Matched Jobs ✨', path: '/recommendations' };
      } else if (lower.includes('resume') || lower.includes('parse') || lower.includes('pdf')) {
        botResponse = "📄 **Resume Parser Engine**:\nUpload your PDF or DOCX resume in your Profile to automatically extract technical skills, experience history, and generate structured candidate taxonomy profiles!";
        navLink = { label: 'Manage Profile & Resume 📄', path: '/profile' };
      } else if (lower.includes('demo') || lower.includes('login') || lower.includes('credential') || lower.includes('password')) {
        botResponse = "🔑 **Demo Login Accounts**:\n\n• **Candidate**: `candidate@example.com` | `Password123!`\n• **HR Recruiter**: `hr@techcorp.com` | `Password123!`\n• **Super Admin**: `admin@hiremind.ai` | `Admin@123!`";
        navLink = { label: 'Go to Login Page 🔑', path: '/login' };
      } else {
        try {
          const apiRes = await apiClient.post('/copilot/conversations/1/messages', { content: promptText });
          botResponse = apiRes.data?.data?.content || "HireMind AI bridges elite technical candidates with corporate recruiters using LLM resume parsing, weighted RAG matching algorithms, and autonomous HR AI Copilots.";
        } catch (e) {
          botResponse = "I can guide you across HireMind AI! Try exploring active jobs, logging into an HR or Candidate account, or managing your portfolio.";
          navLink = { label: 'Explore Jobs Board 🚀', path: '/jobs' };
        }
      }

      const botMsg: Message = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponse,
        navLink,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="chatbot-root">
      {/* ── Floating Action Trigger Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chatbot-launcher-btn"
          aria-label="Open AI Guide Chatbot"
        >
          <div className="chatbot-avatar-box">
            <Bot size={18} color="#FFF" />
          </div>
          <span>AI Platform Guide</span>
          <span className="chatbot-status-dot" />
        </button>
      )}

      {/* ── Interactive Chatbot Window ── */}
      {isOpen && (
        <div className={`chatbot-window ${dark ? 'dark' : 'light'}`}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-box">
                <Bot size={22} color="#FFF" />
                <span className="chatbot-avatar-online" />
              </div>
              <div>
                <h4 className="chatbot-header-title">HireMind AI Guide</h4>
                <span className="chatbot-header-subtitle">Online · Interactive Platform Assistant</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="chatbot-close-btn"
              aria-label="Close Chatbot"
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className={`chatbot-body ${dark ? 'dark' : 'light'}`}>
            {messages.map(m => (
              <div key={m.id} className={`chat-message-row ${m.sender}`}>
                <div className={`chat-bubble ${m.sender} ${dark ? 'dark' : 'light'}`}>
                  {m.text}

                  {/* Navigation Action Button */}
                  {m.navLink && (
                    <button
                      onClick={() => navigate(m.navLink!.path)}
                      className="chat-nav-btn"
                    >
                      {m.navLink.label} <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                <span className={`chat-timestamp ${dark ? 'dark' : 'light'}`}>
                  {m.time}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-typing-indicator">
                <Sparkles size={14} style={{ animation: 'spinSlowHome 2s linear infinite' }} /> AI Assistant is processing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompt Chips */}
          <div className={`chatbot-prompts-bar ${dark ? 'dark' : 'light'}`}>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(qp)}
                className={`prompt-chip ${dark ? 'dark' : 'light'}`}
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={e => { e.preventDefault(); handleSendPrompt(input); }}
            className={`chatbot-input-form ${dark ? 'dark' : 'light'}`}
          >
            <input
              type="text"
              placeholder="Ask anything about HireMind AI..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className={`chatbot-input ${dark ? 'dark' : 'light'}`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="chatbot-send-btn"
              aria-label="Send Message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AiGuideChatbot;
