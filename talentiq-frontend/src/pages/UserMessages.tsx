import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  Send, Search, MessageSquare, Briefcase, FileText,
  FolderGit2, Sparkles, LogOut, Check, CheckCheck,
  Paperclip, X, Clock,
  Trash2, Copy, Building2, User, ArrowLeft
} from 'lucide-react';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/hr-messages.css';

/* ─── Types ─── */
interface Contact {
  userId: number;
  name: string;
  email: string;
  avatarUrl?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  jobTitle?: string;
  companyName?: string;
  flagged?: boolean;
}

interface Message {
  id?: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  content: string;
  type: string;
  read: boolean;
  sentAt: string;
  fileUrl?: string;
  fileName?: string;
  status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ';
}

interface UserMessagesProps {
  embedded?: boolean;
}

export const UserMessages: React.FC<UserMessagesProps> = ({ embedded = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/user-login');
    }
  }, [isAuthenticated, navigate]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(true);

  // Context menu state for message deletion
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    message: Message | null;
  }>({ visible: false, x: 0, y: 0, message: null });

  const [showClearModal, setShowClearModal] = useState(false);

  const stompRef = useRef<StompClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Robust User ID Extraction (Works with state or JWT token directly)
  const getEffectiveUserId = useCallback((): number => {
    if (user?.id) return Number(user.id);
    if ((user as any)?.userId) return Number((user as any).userId);
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.userId) return Number(payload.userId);
        }
      } catch (e) {}
    }
    return 0;
  }, [user]);

  const currentUserId = getEffectiveUserId();

  // Check URL query parameters for direct Recruiter Chat (from Job card)
  const contactIdParam = searchParams.get('recipientId') || searchParams.get('contactId');
  const recruiterNameParam = searchParams.get('recruiterName');
  const jobTitleParam = searchParams.get('jobTitle');
  const companyParam = searchParams.get('company');

  /* ─── Fetch Contacts ─── */
  const fetchContacts = useCallback(async () => {
    try {
      setContactsLoading(true);
      const res = await apiClient.get('/chat/contacts');
      const rawList: Contact[] = res.data?.data || [];
      const list: Contact[] = rawList.filter(
        c => c.userId !== currentUserId && c.email?.toLowerCase() !== user?.email?.toLowerCase()
      );

      const savedContactId = sessionStorage.getItem('active_chat_contact_id');

      const isMobile = window.innerWidth <= 768;

      // If direct recruiter param passed from job details, ensure contact exists in list
      if (contactIdParam) {
        const targetId = parseInt(contactIdParam);
        const found = list.find(c => c.userId === targetId);
        if (found) {
          setSelectedContact(found);
          sessionStorage.setItem('active_chat_contact_id', String(found.userId));
        } else {
          const displayName = recruiterNameParam || (companyParam ? `${companyParam} Recruiter` : 'Hiring Team');
          const newRecruiterContact: Contact = {
            userId: targetId,
            name: displayName,
            email: 'recruiter@company.com',
            unreadCount: 0,
            lastMessage: jobTitleParam ? `Inquiry regarding: ${jobTitleParam}` : 'Direct Job Inquiry',
            lastMessageAt: new Date().toISOString(),
            jobTitle: jobTitleParam || undefined,
            companyName: companyParam || undefined,
          };
          list.unshift(newRecruiterContact);
          setSelectedContact(newRecruiterContact);
          sessionStorage.setItem('active_chat_contact_id', String(targetId));
        }
      } else if (!isMobile) {
        // Desktop / wide screen split pane: auto-select saved or first contact
        if (savedContactId) {
          const targetId = parseInt(savedContactId);
          const found = list.find(c => c.userId === targetId);
          if (found) {
            setSelectedContact(found);
          } else if (list.length > 0) {
            setSelectedContact(list[0]);
            sessionStorage.setItem('active_chat_contact_id', String(list[0].userId));
          }
        } else if (list.length > 0) {
          setSelectedContact(list[0]);
          sessionStorage.setItem('active_chat_contact_id', String(list[0].userId));
        }
      } else {
        // Mobile screen: keep on contacts list view unless user previously selected a chat in this session
        if (savedContactId) {
          const targetId = parseInt(savedContactId);
          const found = list.find(c => c.userId === targetId);
          if (found) {
            setSelectedContact(found);
          }
        }
      }

      setContacts(list);
    } catch (err) {
      console.error('Failed to fetch chat contacts', err);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [contactIdParam, recruiterNameParam, jobTitleParam, companyParam, currentUserId, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContacts();
    }
  }, [isAuthenticated, fetchContacts]);

  /* ─── WebSocket STOMP Connection with Deduplication ─── */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const wsUrl = `${window.location.origin}/api/ws`;
    const socket = new SockJS(wsUrl);

    const client = new StompClient({
      webSocketFactory: () => socket as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        // Chat message subscription
        client.subscribe('/user/queue/chat', frame => {
          try {
            const rawBody = JSON.parse(frame.body);

            // Handle real-time flag updates from HR
            if (rawBody.action === 'FLAG_STATUS_CHANGE') {
              const { hrUserId, flagged } = rawBody;
              setContacts(prev => prev.map(c => c.userId === hrUserId ? { ...c, flagged } : c));
              if (selectedContact?.userId === hrUserId) {
                setSelectedContact(prev => prev ? { ...prev, flagged } : null);
              }
              return;
            }

            const incoming: Message = rawBody;
            const myId = getEffectiveUserId();

            setMessages(prev => {
              // 1. Direct ID duplicate check
              if (incoming.id && prev.some(m => m.id === incoming.id)) {
                return prev;
              }

              // 2. If this message is sent by me, replace any matching optimistic/pending bubble
              if (Number(incoming.senderId) === myId) {
                const optimisticIdx = prev.findIndex(m =>
                  Number(m.senderId) === myId &&
                  m.content === incoming.content &&
                  (m.id === undefined || String(m.id).length > 10 || m.status === 'SENDING' || m.status === 'SENT' || Math.abs(new Date(m.sentAt).getTime() - new Date(incoming.sentAt).getTime()) < 15000)
                );

                if (optimisticIdx !== -1) {
                  const updated = [...prev];
                  updated[optimisticIdx] = incoming;
                  return updated;
                }
              }

              // 3. Otherwise append if genuinely new incoming message
              return [...prev, incoming];
            });

            // Update contact last message & bump to top
            setContacts(prev => {
              const otherId = Number(incoming.senderId) === myId ? incoming.receiverId : incoming.senderId;
              const exists = prev.some(c => c.userId === otherId);
              if (exists) {
                return prev.map(c => {
                  if (c.userId === otherId) {
                    return { ...c, lastMessage: incoming.content, lastMessageAt: incoming.sentAt };
                  }
                  return c;
                });
              } else {
                const newContact: Contact = {
                  userId: otherId,
                  name: incoming.senderName || 'HR Recruiter',
                  email: 'recruiter@company.com',
                  unreadCount: Number(incoming.senderId) !== myId ? 1 : 0,
                  lastMessage: incoming.content,
                  lastMessageAt: incoming.sentAt,
                };
                return [newContact, ...prev];
              }
            });
          } catch (err) {
            console.error('Error parsing incoming chat', err);
          }
        });

        // Deletions subscription
        client.subscribe('/user/queue/chat.delete', frame => {
          try {
            const event = JSON.parse(frame.body);
            if (event.action === 'DELETE_MESSAGE' && event.messageId) {
              setMessages(prev => prev.filter(m => m.id !== event.messageId));
            } else if (event.action === 'CLEAR_CONVERSATION') {
              setMessages([]);
            }
          } catch (err) {
            console.error('Error processing deletion event', err);
          }
        });

        // Typing indicator
        client.subscribe('/user/queue/typing', frame => {
          try {
            const payload = JSON.parse(frame.body);
            if (payload.senderId === selectedContact?.userId) {
              setOtherTyping(payload.typing);
            }
          } catch (err) {
            console.error('Typing event error', err);
          }
        });
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [selectedContact, getEffectiveUserId]);

  /* ─── Load Real Database Conversation History (Zero Fake Messages) ─── */
  const loadConversation = useCallback(async (contact: Contact) => {
    if (!contact?.userId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/chat/conversations/${contact.userId}`);
      const history: Message[] = res.data?.data || [];
      setMessages(history);
    } catch (err) {
      console.error('Failed to load conversation history', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedContact) {
      loadConversation(selectedContact);
      apiClient.put(`/chat/conversations/${selectedContact.userId}/read`).catch(() => {});
    }
  }, [selectedContact, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  // Close context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  /* ─── Send Message ─── */
  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedContact) return;

    const myId = getEffectiveUserId();
    const token = localStorage.getItem('accessToken');
    const payload = {
      receiverId: selectedContact.userId,
      content: text,
      type: 'TEXT',
    };

    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      senderId: myId,
      senderName: user ? `${user.firstName} ${user.lastName}` : 'Me',
      receiverId: selectedContact.userId,
      content: text,
      type: 'TEXT',
      read: false,
      sentAt: new Date().toISOString(),
      status: 'SENDING'
    };

    setMessages(prev => [...prev, optimistic]);
    setInputText('');

    if (stompRef.current?.connected) {
      stompRef.current.publish({
        destination: '/app/chat.send',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(payload),
      });
      // Mark as sent
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'SENT' } : m));
    } else {
      try {
        const res = await apiClient.post('/chat/messages', payload);
        if (res.data?.data?.id) {
          setMessages(prev => prev.map(m => m.id === tempId ? res.data.data : m));
        }
      } catch (err) {
        console.error('Failed to send message via REST', err);
      }
    }

    // Update contact preview
    setContacts(prev => prev.map(c => {
      if (c.userId === selectedContact.userId) {
        return { ...c, lastMessage: text, lastMessageAt: optimistic.sentAt };
      }
      return c;
    }));
  };

  /* ─── File Upload ─── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact) return;

    const myId = getEffectiveUserId();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', String(selectedContact.userId));

    const isImage = file.type.startsWith('image/');
    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      senderId: myId,
      senderName: user ? `${user.firstName} ${user.lastName}` : 'Me',
      receiverId: selectedContact.userId,
      content: isImage ? `🖼️ ${file.name}` : `📎 ${file.name}`,
      type: isImage ? 'IMAGE' : 'FILE',
      read: false,
      sentAt: new Date().toISOString(),
      status: 'SENDING'
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await apiClient.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.data?.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.data.data : m));
      }
    } catch (err) {
      console.error('Failed to upload file', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ─── Delete Message ─── */
  const handleDeleteMessage = async (msg: Message) => {
    if (!msg.id) return;
    try {
      await apiClient.delete(`/chat/messages/${msg.id}`);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch (err) {
      console.error('Failed to delete message', err);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    }
  };

  /* ─── Clear Conversation ─── */
  const handleClearConversation = async () => {
    if (!selectedContact) return;
    try {
      await apiClient.delete(`/chat/conversations/${selectedContact.userId}`);
      setMessages([]);
      setShowClearModal(false);
      fetchContacts();
    } catch (err) {
      console.error('Failed to clear conversation', err);
      setMessages([]);
      setShowClearModal(false);
    }
  };

  /* ─── Typing Trigger ─── */
  const handleTyping = () => {
    if (!selectedContact || !stompRef.current?.connected) return;
    if (!isTyping) {
      setIsTyping(true);
      stompRef.current.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ receiverId: selectedContact.userId, typing: true }),
      });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      stompRef.current?.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ receiverId: selectedContact.userId, typing: false }),
      });
    }, 2000);
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ─── Render Tick Status Indicator ─── */
  const renderMessageAcknowledgement = (msg: Message) => {
    if (msg.read) {
      return (
        <span className="msg-tick read" title="Seen by Recruiter (Double Blue Ticks)">
          <CheckCheck size={14} color="#38BDF8" />
        </span>
      );
    }
    if (msg.status === 'DELIVERED') {
      return (
        <span className="msg-tick delivered" title="Delivered to Recruiter (Double Gray Ticks)">
          <CheckCheck size={14} color="#94A3B8" />
        </span>
      );
    }
    if (msg.status === 'SENDING') {
      return (
        <span className="msg-tick sending" title="Sending...">
          <Clock size={12} color="#94A3B8" />
        </span>
      );
    }
    return (
      <span className="msg-tick sent" title="Sent to Server (Single Tick)">
        <Check size={13} color="#94A3B8" />
      </span>
    );
  };

  return (
    <div className={`messages-page-wrapper ${isLight ? 'theme-light' : 'theme-universe'} ${selectedContact ? 'has-active-chat' : 'no-active-chat'} ${embedded ? 'is-embedded' : ''}`}>
      {/* ── Left Navigation Sidebar (Only when standalone) ── */}
      {!embedded && (
        <aside className="msg-sidebar">
          <div className="msg-sidebar-brand" onClick={() => navigate('/')}>
            <HireMindLogo variant="navbar" size="sm" />
          </div>

          <nav className="msg-nav-list">
            <button onClick={() => navigate('/jobs')} className="msg-nav-item">
              <Briefcase size={17} /> Jobs Explorer
            </button>
            <button onClick={() => navigate('/recommendations')} className="msg-nav-item">
              <Sparkles size={17} /> AI Matches
            </button>
            <button onClick={() => {}} className="msg-nav-item active">
              <MessageSquare size={17} /> Recruiter Chat
            </button>
            <button onClick={() => navigate('/my-applications')} className="msg-nav-item">
              <FileText size={17} /> Applications
            </button>
            <button onClick={() => navigate('/portfolio')} className="msg-nav-item">
              <FolderGit2 size={17} /> Portfolio
            </button>
            <div className="msg-nav-divider" />
            <button onClick={() => { logout('/user-login'); }} className="msg-nav-item sign-out">
              <LogOut size={17} /> Sign Out
            </button>
          </nav>

          <div className="msg-user-badge">
            <div className="msg-user-name">{user ? `${user.firstName} ${user.lastName}` : 'Candidate'}</div>
            <div className="msg-user-email">{user?.email || 'candidate@gmail.com'}</div>
          </div>
        </aside>
      )}

      {/* ── Fixed Left Contacts Directory (WhatsApp style chat list) ── */}
      <div className="msg-contacts-panel">
        <div className="msg-contacts-header">
          <div className="msg-contacts-title-row">
            <div className="msg-contacts-title-wrap">
              <span className="msg-contacts-title-emoji">💬</span>
              {contacts.length > 0 && (
                <span className="msg-contacts-badge">{contacts.length}</span>
              )}
            </div>
          </div>

          <div className="msg-search-box">
            <Search size={15} className="msg-search-icon" />
            <input
              type="text"
              placeholder="Search chats or recruiters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="msg-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="msg-search-clear" title="Clear">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Contacts List */}
        <div className="msg-contacts-list">
          {contactsLoading ? (
            <div className="msg-loading-text">Loading chats...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="msg-empty-contacts">
              No conversations found matching "{searchQuery}".
            </div>
          ) : (
            filteredContacts.map(c => {
              const isSelected = selectedContact?.userId === c.userId;
              return (
                <div
                  key={c.userId}
                  onClick={() => {
                    setSelectedContact(c);
                    sessionStorage.setItem('active_chat_contact_id', String(c.userId));
                  }}
                  className={`msg-contact-item ${isSelected ? 'selected' : ''} ${c.flagged ? 'is-flagged-contact' : ''}`}
                >
                  <div className="msg-avatar-contact">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      c.name ? c.name.charAt(0).toUpperCase() : 'H'
                    )}
                  </div>
                  <div className="msg-contact-info">
                    <div className="msg-contact-name-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span className="msg-contact-name">{c.name}</span>
                        {c.flagged && (
                          <span className="msg-flag-icon-badge" title="Shortlisted by this Recruiter">
                            🚩 Shortlisted
                          </span>
                        )}
                      </div>
                      {c.lastMessageAt && (
                        <span className="msg-contact-time">
                          {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {c.companyName && (
                      <div className="msg-contact-company">
                        🏢 {c.companyName} {c.jobTitle ? `• ${c.jobTitle}` : ''}
                      </div>
                    )}
                    <div className="msg-contact-snippet-row">
                      <span className="msg-contact-snippet">{c.lastMessage || 'Tap to chat...'}</span>
                      {c.unreadCount > 0 && (
                        <span className="msg-unread-badge">{c.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Chat Pane ── */}
      <div className="msg-chat-panel">
        {selectedContact ? (
          <>
            {/* Top Chat Header (WhatsApp style) */}
            <div className="msg-chat-header">
              <div className="msg-chat-header-user">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null);
                    sessionStorage.removeItem('active_chat_contact_id');
                  }}
                  className="msg-mobile-back-btn"
                  title="Back to Chats"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="msg-avatar-contact active-avatar">
                  {selectedContact.avatarUrl ? (
                    <img src={selectedContact.avatarUrl} alt={selectedContact.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : 'H'
                  )}
                </div>
                <div>
                  <div className="msg-chat-header-name">
                    <span className="msg-chat-candidate-title">{selectedContact.name}</span>
                    {selectedContact.flagged && (
                      <span className="msg-flagged-pill candidate-side" title="Shortlisted by Recruiter">
                        🚩 Shortlisted
                      </span>
                    )}
                  </div>
                  <div className="msg-chat-status-line">
                    <span className="msg-status-dot" />
                    <span>{otherTyping ? 'typing...' : 'online'}</span>
                    {selectedContact.companyName && (
                      <span className="msg-company-tag">• {selectedContact.companyName}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="msg-chat-header-actions">
                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  className="msg-header-btn msg-btn-danger"
                  title="Clear Chat History"
                >
                  <Trash2 size={15} /> <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Flagged Alert Banner for Candidate */}
            {selectedContact.flagged && (
              <div className="msg-candidate-flagged-banner">
                <span style={{ fontSize: '15px' }}>🚩</span>
                <div>
                  <strong>Priority Candidate:</strong> You have been marked as a <em>Flagged / Priority Candidate</em> by this Recruiter!
                </div>
              </div>
            )}

            {/* Quick Inquiries Strip */}
            <div className="msg-quick-inquiries-bar">
              <span className="msg-quick-label">⚡ Quick Templates:</span>
              {[
                "👋 Hello! I'm interested in discussing this opportunity.",
                "📄 I have uploaded my verified resume to my portfolio.",
                "📅 Could we schedule a 15-min introductory call?",
                "💼 What are the primary expectations for this role?"
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(template)}
                  className="msg-template-chip"
                >
                  {template}
                </button>
              ))}
            </div>

            {/* Message Stream: Strictly Right (Candidate/Me) vs Left (Recruiter) */}
            <div className="msg-messages-scroll-area">
              {loading ? (
                <div className="msg-loading-history">Loading message history...</div>
              ) : messages.length === 0 ? (
                <div className="msg-empty-history">
                  <MessageSquare size={36} color="#7C3AED" />
                  <p>Start a conversation with {selectedContact.name}!</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = Number(m.senderId) === currentUserId;
                  return (
                    <div
                      key={m.id || idx}
                      className={`msg-bubble-row ${isMe ? 'sent-by-me' : 'received-from-recruiter'}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          visible: true,
                          x: e.clientX,
                          y: e.clientY,
                          message: m,
                        });
                      }}
                    >
                      {/* Recruiter Avatar on the Left */}
                      {!isMe && (
                        <div className="msg-bubble-avatar-left" title={selectedContact.name}>
                          {selectedContact.name.charAt(0)}
                        </div>
                      )}

                      <div className={`msg-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                        {/* Header distinction inside the bubble */}
                        {!isMe ? (
                          <div className="msg-bubble-sender-name">
                            <Building2 size={12} /> {selectedContact.name}
                          </div>
                        ) : (
                          <div className="msg-bubble-sender-name" style={{ color: '#FDE047' }}>
                            <User size={12} /> You (Candidate)
                          </div>
                        )}

                        <div className="msg-bubble-text">
                          {m.fileUrl ? (
                            m.type === 'IMAGE' || m.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <div className="msg-attachment-img-wrap">
                                <img
                                  src={`/api/v1/chat/files/${m.fileUrl}`}
                                  alt={m.fileName || 'Image attachment'}
                                  className="msg-attachment-img"
                                  onClick={() => window.open(`/api/v1/chat/files/${m.fileUrl}`, '_blank')}
                                />
                                <span className="msg-attachment-caption">{m.fileName || m.content}</span>
                              </div>
                            ) : (
                              <a
                                href={`/api/v1/chat/files/${m.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="msg-attachment-link"
                              >
                                <Paperclip size={14} /> {m.fileName || m.content}
                              </a>
                            )
                          ) : (
                            m.content
                          )}
                        </div>

                        {/* Timestamp and Delivery/Read Tick Acknowledgement */}
                        <div className={`msg-bubble-meta ${isMe ? 'meta-right' : 'meta-left'}`}>
                          <span className="msg-time-string">
                            {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && renderMessageAcknowledgement(m)}
                        </div>
                      </div>

                      {/* Quick Hover Delete Message Action */}
                      <div className="msg-bubble-hover-actions">
                        <button
                          onClick={() => handleDeleteMessage(m)}
                          className="msg-action-hover-btn"
                          title="Delete Message"
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(m.content)}
                          className="msg-action-hover-btn"
                          title="Copy Text"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {otherTyping && (
                <div className="msg-bubble-row received-from-recruiter">
                  <div className="msg-bubble-avatar-left">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div className="msg-bubble bubble-other typing-bubble">
                    <span className="msg-typing-dot" />
                    <span className="msg-typing-dot" />
                    <span className="msg-typing-dot" />
                    <span style={{ fontSize: '12px', marginLeft: '6px', color: '#94A3B8' }}>
                      {selectedContact.name} is typing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom-Anchored Message Input Bar */}
            <div className="msg-chat-input-bar">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="msg-attach-btn"
                title="Attach Document or Image"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                placeholder="Type your message to the recruiter... (Press Enter to send)"
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); handleTyping(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="msg-input-field"
              />

              <button
                onClick={() => sendMessage()}
                disabled={!inputText.trim()}
                className={`msg-send-btn ${inputText.trim() ? 'active' : ''}`}
                title="Send Message"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="msg-no-selected-placeholder">
            <MessageSquare size={52} color="#7C3AED" />
            <h3>Select a Conversation to Start Chatting</h3>
            <p>Choose a recruiter contact on the left panel or click "Message HR" from any job posting.</p>
          </div>
        )}
      </div>

      {/* ── Right-Click Context Menu for Messages ── */}
      {contextMenu.visible && contextMenu.message && (
        <div
          className="msg-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (contextMenu.message) navigator.clipboard.writeText(contextMenu.message.content);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="msg-context-item"
          >
            <Copy size={13} /> Copy Message
          </button>
          <button
            onClick={() => {
              if (contextMenu.message) handleDeleteMessage(contextMenu.message);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="msg-context-item danger"
          >
            <Trash2 size={13} /> Delete Message
          </button>
        </div>
      )}

      {/* ── Clear Conversation Confirmation Modal ── */}
      {showClearModal && selectedContact && (
        <div className="recs-modal-backdrop" onClick={() => setShowClearModal(false)}>
          <div className="msg-confirm-modal" onClick={e => e.stopPropagation()}>
            <Trash2 size={36} color="#EF4444" />
            <h3>Clear Conversation?</h3>
            <p>Are you sure you want to delete all messages with <strong>{selectedContact.name}</strong>? This action cannot be undone.</p>
            <div className="msg-confirm-actions">
              <button onClick={() => setShowClearModal(false)} className="cosmic-btn-modal-cancel">
                Cancel
              </button>
              <button onClick={handleClearConversation} className="msg-btn-confirm-delete">
                Yes, Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMessages;
