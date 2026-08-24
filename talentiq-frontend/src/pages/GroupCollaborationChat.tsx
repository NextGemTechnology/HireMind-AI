import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  Users, Plus, Send, Paperclip,
  FileText, X
} from 'lucide-react';
import '../css/group-chat.css';

interface GroupItem {
  id: number;
  name: string;
  description?: string;
  companyName?: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface MessageItem {
  id?: number;
  groupId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: string;
  fileUrl?: string;
  fileName?: string;
  sentAt: string;
}

export const GroupCollaborationChat: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const stompRef = useRef<StompClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/chat/groups');
      const list: GroupItem[] = res.data?.data || [];
      setGroups(list);
      if (list.length > 0 && !selectedGroup) {
        setSelectedGroup(list[0]);
      }
    } catch (e) {
      console.warn('Failed to load user groups', e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Load message history for selected group
  useEffect(() => {
    if (!selectedGroup) return;
    apiClient.get(`/chat/groups/${selectedGroup.id}/messages`)
      .then(res => setMessages(res.data?.data || []))
      .catch(() => setMessages([]));
  }, [selectedGroup]);

  // Connect STOMP WebSocket for real-time group stream
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !selectedGroup) return;

    const wsUrl = `${window.location.origin}/api/ws`;
    const socket = new SockJS(wsUrl);

    const client = new StompClient({
      webSocketFactory: () => socket as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/group.${selectedGroup.id}`, (frame) => {
          try {
            const incoming: MessageItem = JSON.parse(frame.body);
            setMessages(prev => {
              if (incoming.id && prev.some(m => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
          } catch (e) {
            console.error('Group WS parse error', e);
          }
        });
      }
    });

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [selectedGroup?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedGroup) return;
    const text = inputText.trim();
    setInputText('');

    const payload = {
      content: text,
      type: 'TEXT'
    };

    try {
      const res = await apiClient.post(`/chat/groups/${selectedGroup.id}/messages`, payload);
      if (res.data?.data) {
        setMessages(prev => {
          if (prev.some(m => m.id === res.data.data.id)) return prev;
          return [...prev, res.data.data];
        });
      }
    } catch (e) {
      console.error('Failed to send group message', e);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await apiClient.post('/chat/groups', {
        name: newGroupName.trim(),
        description: newGroupDesc.trim()
      });
      if (res.data?.data) {
        setGroups(prev => [res.data.data, ...prev]);
        setSelectedGroup(res.data.data);
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
      }
    } catch (e) {
      console.error('Failed to create group', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await apiClient.post(`/chat/groups/${selectedGroup.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (uploadRes.data?.data) {
        setMessages(prev => {
          if (prev.some(m => m.id === uploadRes.data.data.id)) return prev;
          return [...prev, uploadRes.data.data];
        });
      }
    } catch (err) {
      console.error('Group file upload failed', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="group-chat-page">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Sidebar Channels / Groups */}
      <div className="group-chat-sidebar">
        <div className="group-chat-sidebar-header">
          <h3 className="group-chat-sidebar-title">
            <Users size={18} color="#38BDF8" /> Team Channels
          </h3>
          <button onClick={() => setShowCreateModal(true)} className="btn-create-group">
            <Plus size={14} /> New Group
          </button>
        </div>

        <div className="group-list-scroll">
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              Loading collaboration groups...
            </div>
          ) : groups.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              No collaboration channels yet. Click "+ New Group" to start a team workspace!
            </div>
          ) : (
            groups.map(g => (
              <div
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                className={`group-item-card ${selectedGroup?.id === g.id ? 'active' : ''}`}
              >
                <div className="group-avatar-box">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div className="group-info-meta">
                  <div className="group-info-name">{g.name}</div>
                  <div className="group-info-snippet">
                    {g.lastMessage || `${g.memberCount} member(s)`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="group-chat-main">
        {selectedGroup ? (
          <>
            <div className="group-chat-main-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  👥 {selectedGroup.name}
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
                  {selectedGroup.description || 'Enterprise collaboration channel'}
                </p>
              </div>
              <span style={{ fontSize: '12px', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.12)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                {selectedGroup.memberCount || 1} Members
              </span>
            </div>

            <div className="group-messages-stream">
              {messages.map((m, idx) => {
                const isMe = m.senderId === Number(user?.id);
                return (
                  <div key={idx} className={`group-msg-row ${isMe ? 'me' : 'other'}`}>
                    {!isMe && <span className="group-msg-sender-name">{m.senderName}</span>}
                    <div className={`group-msg-bubble ${isMe ? 'me' : 'other'}`}>
                      {m.content}
                      {m.fileUrl && (
                        <div style={{ marginTop: 8 }}>
                          {m.type === 'IMAGE' ? (
                            <img src={m.fileUrl} alt="Attached image" style={{ maxWidth: '240px', borderRadius: '8px' }} />
                          ) : (
                            <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={14} /> Download {m.fileName || 'Attachment'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="group-chat-input-bar">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                title="Attach Document / File"
              >
                <Paperclip size={18} />
              </button>

              <input
                className="group-input-box"
                placeholder={`Message #${selectedGroup.name}...`}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="btn-send-group"
                title="Send Message"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94A3B8' }}>
            <Users size={48} color="#4F46E5" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: 0, color: '#FFFFFF' }}>Select a Team Channel</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>Choose a collaboration channel on the left to start chatting.</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: 18, width: 440, padding: 24, boxShadow: '0 20px 45px rgba(0,0,0,0.8)', color: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Create New Team Channel</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>Channel Name *</label>
                <input
                  required
                  placeholder="e.g. Engineering Leadership, HR-Tech Screening"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>Description / Objective</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Collaboration on high-priority technical hiring and interviews."
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Create Channel 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupCollaborationChat;
