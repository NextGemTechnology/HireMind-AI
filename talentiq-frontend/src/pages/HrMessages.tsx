import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  Send, Phone, PhoneOff, Mic, MicOff, Search,
  LayoutDashboard, Calendar,
  MessageSquare, Users, Briefcase, Settings, LogOut,
  Circle, Sun, Moon, Trash2, Copy, Paperclip, Image as ImageIcon,
  Check, CheckCheck, Clock, ChevronDown, CheckCircle2, Sparkles, X,
  UserCheck, ShieldCheck, User as UserIcon, Flag, Award
} from 'lucide-react';
import { InteractiveGalaxyBackground } from '../components/InteractiveGalaxyBackground';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/hr-messages.css';

/* ─── Types ─── */
type ChatTheme = 'galaxy' | 'moon' | 'light' | 'obsidian';

interface Contact {
  userId: number;
  name: string;
  email: string;
  avatarUrl?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  companyName?: string;
  jobTitle?: string;
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

export const HrMessages: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── 4-Theme Engine ──
  const [theme, setTheme] = useState<ChatTheme>(() => {
    const saved = localStorage.getItem('hr_chat_theme') as ChatTheme;
    if (saved && ['galaxy', 'moon', 'light', 'obsidian'].includes(saved)) {
      return saved;
    }
    return 'galaxy';
  });

  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleSelectTheme = (newTheme: ChatTheme) => {
    setTheme(newTheme);
    localStorage.setItem('hr_chat_theme', newTheme);
    setShowThemeMenu(false);
  };

  const toggleLightDark = () => {
    const nextTheme: ChatTheme = theme === 'light' ? 'galaxy' : 'light';
    handleSelectTheme(nextTheme);
  };

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

  // 2-Second Notification Popup state
  const [activePopup, setActivePopup] = useState<any | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flagged Candidate User IDs Set
  const [flaggedUserIds, setFlaggedUserIds] = useState<Set<number>>(new Set());

  // Verified Tag Modal State (For HR Tagging)
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagJobTitle, setTagJobTitle] = useState('');
  const [tagDept, setTagDept] = useState('');
  const [tagNotes, setTagNotes] = useState('');
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [tagSuccessMsg, setTagSuccessMsg] = useState('');
  const [tagErrorMsg, setTagErrorMsg] = useState('');

  const handleSendTagRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagJobTitle.trim() || !selectedContact) return;
    setTagSubmitting(true);
    setTagErrorMsg('');
    try {
      await apiClient.post('/company/verifications/request', {
        candidateUserId: selectedContact.userId,
        jobTitle: tagJobTitle.trim(),
        department: tagDept.trim() || undefined,
        notes: tagNotes.trim() || undefined
      });
      setTagSuccessMsg('Verified tag request submitted to your Company Director for final approval!');
      setTimeout(() => {
        setShowTagModal(false);
        setTagSuccessMsg('');
        setTagJobTitle('');
        setTagDept('');
        setTagNotes('');
      }, 2200);
    } catch (err: any) {
      setTagErrorMsg(err?.response?.data?.message || 'Failed to submit verification request.');
    } finally {
      setTagSubmitting(false);
    }
  };

  // WebRTC state
  const [callState, setCallState] = useState<'idle' | 'calling' | 'in-call'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callWith, setCallWith] = useState<string>('');

  const stompRef = useRef<StompClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

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
  const directContactId = searchParams.get('contactId');

  // Calculate total unread count
  const totalUnreadCount = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  /* ─── Fetch contacts ─── */
  const fetchContacts = useCallback(async () => {
    try {
      setContactsLoading(true);
      const res = await apiClient.get('/chat/contacts');
      const list: Contact[] = res.data?.data || [];
      setContacts(list);

      // Populate flagged set
      const flaggedSet = new Set(list.filter(c => c.flagged).map(c => c.userId));
      setFlaggedUserIds(flaggedSet);

      const savedContactId = sessionStorage.getItem('active_hr_chat_contact_id');

      // If URL has direct contact ID (e.g. from notification click), select that contact
      if (directContactId) {
        const found = list.find(c => c.userId === parseInt(directContactId));
        if (found) {
          setSelectedContact(found);
          sessionStorage.setItem('active_hr_chat_contact_id', String(found.userId));
        }
      } else if (savedContactId) {
        const targetId = parseInt(savedContactId);
        const found = list.find(c => c.userId === targetId);
        if (found) {
          setSelectedContact(found);
        } else if (list.length > 0) {
          setSelectedContact(list[0]);
          sessionStorage.setItem('active_hr_chat_contact_id', String(list[0].userId));
        }
      } else if (list.length > 0) {
        setSelectedContact(list[0]);
        sessionStorage.setItem('active_hr_chat_contact_id', String(list[0].userId));
      }
    } catch (err) {
      console.error('Failed to fetch HR contacts', err);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [directContactId]);

  /* ─── Toggle Flag on Candidate ─── */
  const handleToggleFlag = async (candidateUserId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const willBeFlagged = !flaggedUserIds.has(candidateUserId);

    // Optimistic state update
    setFlaggedUserIds(prev => {
      const next = new Set(prev);
      if (willBeFlagged) next.add(candidateUserId);
      else next.delete(candidateUserId);
      return next;
    });

    setContacts(prev => prev.map(c => c.userId === candidateUserId ? { ...c, flagged: willBeFlagged } : c));
    if (selectedContact?.userId === candidateUserId) {
      setSelectedContact(prev => prev ? { ...prev, flagged: willBeFlagged } : null);
    }

    try {
      const res = await apiClient.post(`/chat/flag/${candidateUserId}`);
      const isNowFlagged = res.data?.data?.flagged ?? willBeFlagged;

      setActivePopup({
        title: isNowFlagged ? 'Candidate Flagged 🚩' : 'Candidate Unflagged',
        message: isNowFlagged
          ? 'Candidate marked as Priority / Shortlisted'
          : 'Candidate priority flag removed',
        senderId: candidateUserId
      });
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      popupTimerRef.current = setTimeout(() => setActivePopup(null), 2000);
    } catch (err) {
      console.error('Failed to toggle flag', err);
      // Revert optimistic update
      setFlaggedUserIds(prev => {
        const next = new Set(prev);
        if (willBeFlagged) next.delete(candidateUserId);
        else next.add(candidateUserId);
        return next;
      });
      setContacts(prev => prev.map(c => c.userId === candidateUserId ? { ...c, flagged: !willBeFlagged } : c));
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Close context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  /* ─── WebRTC Signaling Handler ─── */
  const handleIncomingSignal = async (signal: any) => {
    const { signalType, payload } = signal;
    if (signalType === 'call-start') {
      setCallWith(selectedContact?.name || 'Candidate');
      setCallState('calling');
    } else if (signalType === 'offer') {
      try {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload)));
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal('answer', JSON.stringify(answer));
        setCallState('in-call');
      } catch (err) {
        console.error('Error handling WebRTC offer', err);
      }
    } else if (signalType === 'answer') {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload)));
        setCallState('in-call');
      }
    } else if (signalType === 'ice-candidate') {
      if (pcRef.current && payload) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(payload)));
        } catch (err) {
          console.error('Error adding ICE candidate', err);
        }
      }
    } else if (signalType === 'call-end') {
      endCallCleanup();
    }
  };

  const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', JSON.stringify(event.candidate));
      }
    };
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };
    return pc;
  };

  const sendSignal = (signalType: string, payload: string) => {
    if (!selectedContact) return;
    const signalData = {
      receiverId: selectedContact.userId,
      signalType,
      payload
    };
    if (stompRef.current?.connected) {
      stompRef.current.publish({
        destination: '/app/chat.signal',
        body: JSON.stringify(signalData)
      });
    }
  };

  const endCallCleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallState('idle');
    setIsMuted(false);
  };

  const startCall = async () => {
    if (!selectedContact) return;
    try {
      setCallWith(selectedContact.name);
      setCallState('calling');
      sendSignal('call-start', '');
      const pc = createPeerConnection();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal('offer', JSON.stringify(offer));
    } catch (err) {
      console.error('Failed to start audio call', err);
      endCallCleanup();
    }
  };

  const hangUp = () => {
    sendSignal('call-end', '');
    endCallCleanup();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  /* ─── Connect WebSocket / STOMP with Deduplication ─── */
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
        // Chat messages queue
        client.subscribe('/user/queue/chat', (frame) => {
          try {
            const rawBody = JSON.parse(frame.body);

            // Handle real-time flag updates
            if (rawBody.action === 'FLAG_STATUS_CHANGE') {
              const { candidateUserId, flagged } = rawBody;
              setFlaggedUserIds(prev => {
                const next = new Set(prev);
                if (flagged) next.add(candidateUserId);
                else next.delete(candidateUserId);
                return next;
              });
              setContacts(prev => prev.map(c => c.userId === candidateUserId ? { ...c, flagged } : c));
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

            // Trigger 2-Second Notification Popup for HR
            if (Number(incoming.senderId) !== myId) {
              setActivePopup({
                title: incoming.senderName || 'Candidate',
                message: incoming.content,
                senderId: incoming.senderId
              });

              if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
              popupTimerRef.current = setTimeout(() => {
                setActivePopup(null);
              }, 2000);
            }

            fetchContacts();
          } catch (err) {
            console.error('Error parsing incoming chat', err);
          }
        });

        // Deletions queue
        client.subscribe('/user/queue/chat.delete', (frame) => {
          try {
            const event = JSON.parse(frame.body);
            if (event.action === 'DELETE_MESSAGE' && event.messageId) {
              setMessages(prev => prev.filter(m => m.id !== event.messageId));
            } else if (event.action === 'CLEAR_CONVERSATION') {
              setMessages([]);
            }
          } catch (err) {
            console.error('Error handling delete event', err);
          }
        });

        // Typing indicator
        client.subscribe('/user/queue/typing', (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            if (payload.senderId === selectedContact?.userId) {
              setOtherTyping(payload.typing);
            }
          } catch (err) {
            console.error('Typing error', err);
          }
        });

        // WebRTC Signaling
        client.subscribe('/user/queue/signal', (frame) => {
          try {
            const signal = JSON.parse(frame.body);
            handleIncomingSignal(signal);
          } catch (err) {
            console.error('Signal error', err);
          }
        });
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, [selectedContact?.userId, getEffectiveUserId, fetchContacts]);

  /* ─── Load Real Database Conversation History (Zero Fake Messages) ─── */
  const loadConversation = useCallback(async (contact: Contact) => {
    if (!contact?.userId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/chat/conversations/${contact.userId}`);
      setMessages(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load HR conversation history', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedContact) {
      loadConversation(selectedContact);
      // Mark as read in backend
      apiClient.put(`/chat/conversations/${selectedContact.userId}/read`).catch(() => {});
      // Clear unread count locally
      setContacts(prev => prev.map(c => c.userId === selectedContact.userId ? { ...c, unreadCount: 0 } : c));
    }
  }, [selectedContact, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  /* ─── Send message ─── */
  const sendMessage = async (presetText?: string) => {
    const textToSend = presetText || inputText;
    if (!textToSend.trim() || !selectedContact) return;

    const myId = getEffectiveUserId();
    const token = localStorage.getItem('accessToken');
    const text = textToSend.trim();
    const payload = {
      receiverId: selectedContact.userId,
      content: text,
      type: 'TEXT',
    };

    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      senderId: myId,
      senderName: user ? `${user.firstName} ${user.lastName}` : 'HR Team',
      receiverId: selectedContact.userId,
      content: text,
      type: 'TEXT',
      read: false,
      status: 'SENDING',
      sentAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    if (!presetText) setInputText('');

    if (stompRef.current?.connected) {
      stompRef.current.publish({
        destination: '/app/chat.send',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(payload),
      });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'SENT' } : m));
    } else {
      try {
        const res = await apiClient.post('/chat/messages', payload);
        if (res.data?.data?.id) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...res.data.data, status: 'SENT' } : m));
        }
      } catch (err) {
        console.error('Failed to send message via REST', err);
      }
    }
  };

  /* ─── File & Photo Upload (WhatsApp Style) ─── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isImageOnly: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact) return;

    const myId = getEffectiveUserId();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', String(selectedContact.userId));

    const isImage = file.type.startsWith('image/') || isImageOnly;
    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      senderId: myId,
      senderName: user ? `${user.firstName} ${user.lastName}` : 'HR Team',
      receiverId: selectedContact.userId,
      content: isImage ? `🖼️ ${file.name}` : `📎 ${file.name}`,
      type: isImage ? 'IMAGE' : 'FILE',
      read: false,
      status: 'SENDING',
      sentAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await apiClient.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.data?.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...res.data.data, status: 'SENT' } : m));
      }
    } catch (err) {
      console.error('File upload failed', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (photoInputRef.current) photoInputRef.current.value = '';
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

  /* ─── Render Tick Status Indicator ─── */
  const renderMessageAcknowledgement = (msg: Message) => {
    if (msg.read) {
      return (
        <span className="msg-tick read" title="Seen by Candidate (Double Cyan Ticks)">
          <CheckCheck size={14} color="#38BDF8" />
        </span>
      );
    }
    if (msg.status === 'DELIVERED') {
      return (
        <span className="msg-tick delivered" title="Delivered to Candidate (Double Gray Ticks)">
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

  const filteredContacts = contacts
    .filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aFlagged = flaggedUserIds.has(a.userId) || a.flagged ? 1 : 0;
      const bFlagged = flaggedUserIds.has(b.userId) || b.flagged ? 1 : 0;
      return bFlagged - aFlagged;
    });

  const formatMsgTime = (sentAt: string) => {
    try {
      const d = new Date(sentAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`messages-page-wrapper theme-${theme}`}>
      {/* ── Retain Background Theme (Untouched Interactive Canvas Background) ── */}
      {theme === 'galaxy' && <InteractiveGalaxyBackground />}
      <audio ref={remoteAudioRef} autoPlay />

      {/* ── 2-Second Notification Toast Popup ── */}
      {activePopup && (
        <div
          className="msg-popup-toast"
          onClick={() => {
            const targetContact = contacts.find(c => c.userId === activePopup.senderId);
            if (targetContact) setSelectedContact(targetContact);
            setActivePopup(null);
          }}
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            background: 'linear-gradient(135deg, rgba(15, 23, 50, 0.98) 0%, rgba(8, 12, 30, 0.98) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.6)',
            borderRadius: '14px',
            padding: '12px 18px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85), 0 0 20px rgba(56, 189, 248, 0.35)',
            backdropFilter: 'blur(20px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            maxWidth: '380px',
            animation: 'toastSlideIn 0.25s ease-out forwards',
            color: '#FFFFFF',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '15px',
              flexShrink: 0,
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)',
            }}
          >
            {activePopup.title.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                💬 {activePopup.title}
              </span>
              <span style={{ fontSize: '10px', color: '#38BDF8', fontWeight: 600, background: 'rgba(56, 189, 248, 0.15)', padding: '1px 6px', borderRadius: '999px' }}>
                2s Alert
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#CBD5E1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activePopup.message}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setActivePopup(null); }}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Left Sidebar (High Contrast & High Opacity) ── */}
      <aside className="msg-sidebar">
        <div className="msg-sidebar-brand" onClick={() => navigate('/hr-dashboard')}>
          <HireMindLogo variant="navbar" size="sm" />
        </div>

        <nav className="msg-nav-list">
          <button onClick={() => navigate('/hr-dashboard')} className="msg-nav-item">
            <LayoutDashboard size={17} /> Overview
          </button>
          <button onClick={() => navigate('/hr-jobs')} className="msg-nav-item">
            <Briefcase size={17} /> Job Postings
          </button>
          <button onClick={() => navigate('/hr-applications')} className="msg-nav-item">
            <Users size={17} /> Applications
          </button>

          {/* Candidate Messages with Blue Dot & Unread Count Badge */}
          <button onClick={() => {}} className="msg-nav-item active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={17} />
              <span>Candidate Messages</span>
            </div>
            {totalUnreadCount > 0 && (
              <span className="msg-nav-unread-badge" title={`${totalUnreadCount} unread message(s)`}>
                <span className="msg-pulse-blue-dot" />
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button onClick={() => navigate('/hr-calendar')} className="msg-nav-item">
            <Calendar size={17} /> Interviews
          </button>
          <div className="msg-nav-divider" />
          <button onClick={() => navigate('/hr-settings')} className="msg-nav-item">
            <Settings size={17} /> Settings
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="msg-nav-item sign-out">
            <LogOut size={17} /> Sign Out
          </button>
        </nav>

        <div className="msg-user-badge">
          <div className="msg-user-name">{user ? `${user.firstName} ${user.lastName}` : 'Recruiter'}</div>
          <div className="msg-user-email">{user?.email || 'hr.recruiter@gmail.com'}</div>
        </div>
      </aside>

      {/* ── Contacts Directory Panel (Never Overflows) ── */}
      <div className="msg-contacts-panel">
        <div className="msg-contacts-header">
          <div className="msg-contacts-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="msg-contacts-title">Candidate Directory 💬</h2>
              <span className="msg-contacts-badge">{contacts.length}</span>
            </div>

            {/* Quick Light/Dark Toggle & Theme Dropdown Trigger */}
            <div className="msg-theme-tools">
              <button
                onClick={toggleLightDark}
                className="msg-theme-quick-btn"
                title={theme === 'light' ? 'Switch to Cosmic Dark' : 'Switch to Solar Light'}
              >
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              </button>

              <div className="msg-theme-dropdown-wrap">
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="msg-theme-select-btn"
                  title="Choose Chat Theme"
                >
                  <Sparkles size={13} />
                  <span className="msg-theme-name-label">{theme.toUpperCase()}</span>
                  <ChevronDown size={13} />
                </button>

                {showThemeMenu && (
                  <div className="msg-theme-menu">
                    <button
                      onClick={() => handleSelectTheme('galaxy')}
                      className={`msg-theme-opt ${theme === 'galaxy' ? 'active' : ''}`}
                    >
                      <span>🌌 Cosmic Galaxy</span>
                      {theme === 'galaxy' && <CheckCircle2 size={13} color="#A78BFA" />}
                    </button>
                    <button
                      onClick={() => handleSelectTheme('moon')}
                      className={`msg-theme-opt ${theme === 'moon' ? 'active' : ''}`}
                    >
                      <span>🌙 Lunar Moon</span>
                      {theme === 'moon' && <CheckCircle2 size={13} color="#93C5FD" />}
                    </button>
                    <button
                      onClick={() => handleSelectTheme('light')}
                      className={`msg-theme-opt ${theme === 'light' ? 'active' : ''}`}
                    >
                      <span>☀️ Solar Daylight</span>
                      {theme === 'light' && <CheckCircle2 size={13} color="#F59E0B" />}
                    </button>
                    <button
                      onClick={() => handleSelectTheme('obsidian')}
                      className={`msg-theme-opt ${theme === 'obsidian' ? 'active' : ''}`}
                    >
                      <span>🪐 Cyber Obsidian</span>
                      {theme === 'obsidian' && <CheckCircle2 size={13} color="#34D399" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="msg-search-box">
            <Search size={14} className="msg-search-icon" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, role, or email..."
              className="msg-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="msg-search-clear">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Contacts List */}
        <div className="msg-contacts-list">
          {contactsLoading ? (
            <div className="msg-loading-text">Loading candidate directory...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="msg-empty-contacts">No candidate conversations found</div>
          ) : (
            filteredContacts.map(contact => {
              const isSelected = selectedContact?.userId === contact.userId;
              const hasUnread = contact.unreadCount > 0;
              const isFlagged = flaggedUserIds.has(contact.userId) || !!contact.flagged;
              return (
                <div
                  key={contact.userId}
                  onClick={() => setSelectedContact(contact)}
                  className={`msg-contact-item ${isSelected ? 'selected' : ''} ${isFlagged ? 'is-flagged-contact' : ''}`}
                >
                  {/* WhatsApp-Style Clickable Avatar */}
                  <div
                    className="msg-avatar-contact msg-avatar-brand whatsapp-sidebar-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/candidate-profile/${contact.userId}`);
                    }}
                    title="Click avatar to view candidate profile (WhatsApp style)"
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="msg-contact-info">
                    <div className="msg-contact-name-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span className="msg-contact-name">{contact.name}</span>
                        {isFlagged && (
                          <span className="msg-flag-icon-badge" title="Flagged / Priority Candidate by HR">
                            🚩
                          </span>
                        )}
                      </div>

                      {/* Unread Status: Glowing Blue Dot & Number Badge */}
                      {hasUnread ? (
                        <span className="msg-unread-pill" title={`${contact.unreadCount} unread message(s)`}>
                          <span className="msg-unread-dot" />
                          <span className="msg-unread-count-text">{contact.unreadCount}</span>
                        </span>
                      ) : (
                        contact.lastMessageAt && (
                          <span className="msg-contact-time">{formatMsgTime(contact.lastMessageAt)}</span>
                        )
                      )}
                    </div>

                    {contact.jobTitle && (
                      <div className="msg-contact-company">
                        🎯 {contact.jobTitle}
                      </div>
                    )}

                    <div className="msg-contact-snippet-row">
                      <span className="msg-contact-snippet">
                        {contact.lastMessage || contact.email}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Chat Area (Strict Right: HR / Left: Candidate) ── */}
      <div className="msg-chat-panel">
        {selectedContact ? (
          <>
            {/* Top Chat Header — WhatsApp-Style Clickable Profile & Flagging */}
            <div className="msg-chat-header">
              <div className="msg-chat-header-user">
                <div
                  className="msg-avatar-contact active-avatar whatsapp-profile-avatar"
                  onClick={() => navigate(`/candidate-profile/${selectedContact.userId}`)}
                  title="Click avatar to view Candidate Profile (WhatsApp style)"
                >
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div
                  className="msg-chat-header-user-text"
                  onClick={() => navigate(`/candidate-profile/${selectedContact.userId}`)}
                  title="Click name to view Candidate Profile (WhatsApp style)"
                >
                  <div className="msg-chat-header-name">
                    <span className="msg-chat-candidate-title">{selectedContact.name}</span>
                    {(flaggedUserIds.has(selectedContact.userId) || selectedContact.flagged) && (
                      <span className="msg-flagged-pill" title="This candidate is flagged/shortlisted by you">
                        🚩 Flagged
                      </span>
                    )}
                    
                  </div>
                  <div className="msg-chat-status-line">
                    <span className="msg-status-dot" />
                    <span>{otherTyping ? 'Candidate is typing...' : 'Candidate Online'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="msg-chat-header-actions">
                {/* 🚩 HR Flag / Pin Toggle Button */}
                <button
                  onClick={() => handleToggleFlag(selectedContact.userId)}
                  className={`msg-header-btn msg-flag-btn ${(flaggedUserIds.has(selectedContact.userId) || selectedContact.flagged) ? 'flagged-active' : ''}`}
                  title={(flaggedUserIds.has(selectedContact.userId) || selectedContact.flagged) ? 'Candidate is Flagged / Priority (Click to Unflag)' : 'Flag this Candidate as Priority'}
                >
                  <Flag
                    size={13}
                    fill={(flaggedUserIds.has(selectedContact.userId) || selectedContact.flagged) ? '#F59E0B' : 'none'}
                    color={(flaggedUserIds.has(selectedContact.userId) || selectedContact.flagged) ? '#F59E0B' : 'currentColor'}
                  />
                  <span>{(flaggedUserIds.has(selectedContact.userId) || selectedContact.flagged) ? 'Flagged' : 'Flag Candidate'}</span>
                </button>

                <button
                  onClick={() => setShowTagModal(true)}
                  className="msg-header-btn"
                  style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  title="Give Candidate Company Verified Tag"
                >
                  <Award size={13} /> Give Verified Tag
                </button>

                <button
                  onClick={() => navigate(`/candidate-profile/${selectedContact.userId}`)}
                  className="msg-header-btn"
                  title="Open Full Candidate Profile"
                >
                  <UserCheck size={13} /> Full Profile
                </button>

                <button
                  onClick={() => setShowClearModal(true)}
                  className="msg-header-btn msg-btn-danger"
                  title="Clear Conversation"
                >
                  <Trash2 size={13} /> Clear Chat
                </button>

                {callState === 'idle' && (
                  <button onClick={startCall} className="msg-call-btn-start">
                    <Phone size={14} /> Call Candidate
                  </button>
                )}
                {(callState === 'calling' || callState === 'in-call') && (
                  <div className="msg-call-active-bar">
                    <div className={`msg-call-status-pulse ${callState === 'in-call' ? 'in-call' : 'calling'}`}>
                      <Circle size={8} fill="currentColor" color="currentColor" style={{ animation: 'chatPulse 2s infinite' }} />
                      {callState === 'in-call' ? `In call with ${callWith}` : `Calling ${callWith}...`}
                    </div>
                    <button onClick={toggleMute} className={`msg-mute-btn ${isMuted ? 'muted' : ''}`}>
                      {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                    <button onClick={hangUp} className="msg-hangup-btn">
                      <PhoneOff size={14} /> End
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Candidate Screening Inquiries Strip */}
            <div className="msg-quick-inquiries-bar">
              <span className="msg-quick-label">⚡ Screening Templates:</span>
              {[
                "👋 Hello! We reviewed your profile and would love to connect.",
                "📅 Are you available for a 20-minute technical screening call?",
                "📄 Could you please share your updated resume and portfolio link?",
                "🎉 Congratulations! We would like to move forward with the hiring process."
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

            {/* Messages Scroll Stream: Strictly Right (HR/Me) vs Left (Candidate) */}
            <div className="msg-messages-scroll-area">
              {loading ? (
                <div className="msg-loading-history">Loading message history...</div>
              ) : messages.length === 0 ? (
                <div className="msg-empty-history">
                  <MessageSquare size={40} style={{ opacity: 0.4 }} />
                  <p>No messages yet. Send a note to {selectedContact.name} to begin screening!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = Number(msg.senderId) === currentUserId;
                  return (
                    <div
                      key={msg.id || idx}
                      className={`msg-bubble-row ${isMe ? 'sent-by-me' : 'received-from-candidate'}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          visible: true,
                          x: e.clientX,
                          y: e.clientY,
                          message: msg,
                        });
                      }}
                    >
                      {!isMe && (
                        <div className="msg-bubble-avatar-left" title={selectedContact.name}>
                          {selectedContact.name.charAt(0)}
                        </div>
                      )}

                      <div className={`msg-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                        {/* Header distinction inside the bubble */}
                        {!isMe ? (
                          <div className="msg-bubble-sender-name">
                            <UserIcon size={12} /> {selectedContact.name} (Candidate)
                          </div>
                        ) : (
                          <div className="msg-bubble-sender-name" style={{ color: '#FDE047' }}>
                            <ShieldCheck size={12} /> You (HR Recruiter)
                          </div>
                        )}

                        <div className="msg-bubble-text">
                          {msg.fileUrl ? (
                            msg.type === 'IMAGE' || msg.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <div className="msg-attachment-img-wrap">
                                <img
                                  src={`/api/v1/chat/files/${msg.fileUrl}`}
                                  alt={msg.fileName || 'Photo attachment'}
                                  className="msg-attachment-img"
                                  onClick={() => window.open(`/api/v1/chat/files/${msg.fileUrl}`, '_blank')}
                                />
                                <span className="msg-attachment-caption">{msg.fileName || msg.content}</span>
                              </div>
                            ) : (
                              <a
                                href={`/api/v1/chat/files/${msg.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="msg-attachment-link"
                              >
                                <Paperclip size={14} /> {msg.fileName || msg.content}
                              </a>
                            )
                          ) : (
                            msg.content
                          )}
                        </div>

                        {/* Timestamp and Delivery/Read Acknowledgement */}
                        <div className={`msg-bubble-meta ${isMe ? 'meta-right' : 'meta-left'}`}>
                          <span className="msg-time-string">
                            {formatMsgTime(msg.sentAt)}
                          </span>
                          {isMe && renderMessageAcknowledgement(msg)}
                        </div>
                      </div>

                      {/* Quick Hover Delete / Copy Action */}
                      <div className="msg-bubble-hover-actions">
                        <button
                          onClick={() => handleDeleteMessage(msg)}
                          className="msg-action-hover-btn"
                          title="Delete Message"
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="msg-action-hover-btn"
                          title="Copy Message Text"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {otherTyping && (
                <div className="msg-bubble-row received-from-candidate">
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

            {/* ── WhatsApp Style Bottom-Anchored Message Input Bar ── */}
            <div className="msg-chat-input-bar">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e, false)}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt,.zip,.csv"
              />

              {/* Hidden Photo Input */}
              <input
                type="file"
                ref={photoInputRef}
                onChange={(e) => handleFileUpload(e, true)}
                style={{ display: 'none' }}
                accept="image/*"
              />

              {/* 📎 File Attachment Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="msg-attach-btn"
                title="Share Document / Resume / File"
              >
                <Paperclip size={18} />
              </button>

              {/* 🖼️ Photo / Image Share Button */}
              <button
                onClick={() => photoInputRef.current?.click()}
                className="msg-attach-btn"
                title="Share Photo / Screenshot"
              >
                <ImageIcon size={18} />
              </button>

              {/* Main Input Text Field */}
              <input
                value={inputText}
                onChange={e => { setInputText(e.target.value); handleTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Message ${selectedContact.name}... (Press Enter to send)`}
                className="msg-input-field"
              />

              {/* Send Button */}
              <button
                onClick={() => sendMessage()}
                disabled={!inputText.trim()}
                className={`msg-send-btn ${inputText.trim() ? 'active' : ''}`}
                title="Send Message"
              >
                <Send size={17} />
              </button>
            </div>
          </>
        ) : (
          <div className="msg-no-selected-placeholder">
            <MessageSquare size={52} color="#6366F1" />
            <h3>Select a Candidate to Begin Screening</h3>
            <p>Choose an applicant from the left panel to review message threads or start real-time candidate interviews.</p>
          </div>
        )}
      </div>

      {/* Context Menu for Messages */}
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

      {/* Clear Confirmation Modal */}
      {showClearModal && selectedContact && (
        <div className="recs-modal-backdrop" onClick={() => setShowClearModal(false)}>
          <div className="msg-confirm-modal" onClick={e => e.stopPropagation()}>
            <Trash2 size={36} color="#EF4444" />
            <h3>Clear Candidate Conversation?</h3>
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

      {/* Give Verified Tag / Badge Modal */}
      {showTagModal && selectedContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 18, width: 460, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.85)', color: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Give Company Verified Tag</h3>
              </div>
              <button onClick={() => setShowTagModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94A3B8', lineHeight: 1.4 }}>
              Tag <strong style={{ color: '#F8FAFC' }}>{selectedContact.name}</strong> with an official verified corporate credential. Your company director will review and approve the issuance.
            </p>

            {tagSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#34D399', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
                ✓ {tagSuccessMsg}
              </div>
            )}

            {tagErrorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
                ⚠️ {tagErrorMsg}
              </div>
            )}

            <form onSubmit={handleSendTagRequest}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Verified Role / Job Title *
                </label>
                <input
                  required
                  placeholder="e.g. Lead Full-Stack Architect, Senior Backend Engineer"
                  value={tagJobTitle}
                  onChange={e => setTagJobTitle(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Department / Business Unit (Optional)
                </label>
                <input
                  placeholder="e.g. Core Engineering, AI Platforms"
                  value={tagDept}
                  onChange={e => setTagDept(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Endorsement / Screening Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Completed 5 rigorous technical interview rounds with outstanding problem-solving skills."
                  value={tagNotes}
                  onChange={e => setTagNotes(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowTagModal(false)} style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tagSubmitting || !tagJobTitle.trim()}
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: tagSubmitting ? 0.7 : 1 }}
                >
                  {tagSubmitting ? 'Submitting...' : 'Submit Verified Tag 🏷️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrMessages;
