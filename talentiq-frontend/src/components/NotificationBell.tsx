import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Bell, CheckCheck, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import '../css/notification-bell.css';

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  readAt?: string;
  linkUrl?: string;
  createdAt: string;
}

interface NotificationBellProps {
  className?: string;
  iconSize?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  iconSize = 17,
}) => {
  const { user, isAuthenticated, isHr } = useAuth();
  const navigate = useNavigate();
  const manager = !!user?.roles?.includes('ROLE_COMPANY_ADMIN');

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stompRef = useRef<StompClient | null>(null);

  // Fetch initial unread count & recent list from server
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [countRes, listRes] = await Promise.all([
        apiClient.get('/notifications/unread-count').catch(() => null),
        apiClient.get('/notifications?page=0&size=7').catch(() => null),
      ]);

      if (countRes?.data?.data !== undefined) {
        setUnreadCount(Number(countRes.data.data));
      }

      if (listRes?.data) {
        // PagedResponse format has .data array or .content array
        const items = listRes.data.data || listRes.data.content || [];
        setNotifications(items);
      }
    } catch (e) {
      console.warn('Failed to fetch notifications', e);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time updates via SSE stream and WebSocket /user/queue/chat
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // 1. WebSocket STOMP subscription on /user/queue/chat for instantaneous chat message alerts
    const wsUrl = `${window.location.origin}/api/ws`;
    const client = new StompClient({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        client.subscribe('/user/queue/chat', (frame) => {
          try {
            const incoming = JSON.parse(frame.body);
            const myId = user?.id ? Number(user.id) : 0;
            // Only alert if we are the receiver
            if (incoming.receiverId === myId || (incoming.senderId !== myId && !incoming.receiverId)) {
              // Construct ephemeral notification item or refresh
              setUnreadCount(prev => prev + 1);
              const isHrReceiver = isHr && !manager;
              const link = isHrReceiver
                ? `/hr-messages?contactId=${incoming.senderId}`
                : `/messages?contactId=${incoming.senderId}`;

              const newNotif: NotificationItem = {
                id: incoming.id ? Number(incoming.id) : Date.now(),
                userId: myId,
                title: `New message from ${incoming.senderName || 'Contact'}`,
                message: incoming.content || 'Sent you a message',
                type: 'CHAT_MESSAGE',
                read: false,
                linkUrl: link,
                createdAt: incoming.sentAt || new Date().toISOString(),
              };

              setNotifications(prev => [newNotif, ...prev.slice(0, 6)]);
            }
          } catch (e) {
            console.error('Error handling real-time chat notification in bell', e);
          }
        });
      },
    });

    client.activate();
    stompRef.current = client;

    // 2. Server-Sent Events (SSE) subscription on /api/v1/notifications/stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/notifications/stream`);
      eventSource.addEventListener('notification', (e: MessageEvent) => {
        try {
          const notif: NotificationItem = JSON.parse(e.data);
          setUnreadCount(prev => prev + 1);
          setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id).slice(0, 6)]);
        } catch (err) {
          console.warn('Error reading SSE notification event', err);
        }
      });
      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // Fallback to periodic sync if SSE is blocked in certain environments
    }

    // 3. Fallback lightweight polling every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);

    return () => {
      client.deactivate();
      eventSource?.close();
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.id, isHr, manager, fetchNotifications]);

  // Click outside listener to automatically close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hover handlers
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  // Toggle on click
  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
    setIsHovered(false);
  };

  // Mark single notification as read & navigate to conversation or linkUrl
  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.read && notif.id) {
        apiClient.put(`/notifications/${notif.id}/read`).catch(() => null);
        setNotifications(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.warn('Error marking notification as read', e);
    }

    setIsOpen(false);
    setIsHovered(false);

    // Route to conversation if linkUrl is present
    if (manager && (notif.linkUrl?.startsWith('/hr-messages') || notif.linkUrl?.startsWith('/messages'))) {
      navigate(notif.linkUrl.replace(/^\/hr-messages/, '/messages'));
    } else if (notif.linkUrl) {
      navigate(notif.linkUrl);
    } else if (notif.type === 'CHAT_MESSAGE') {
      navigate(isHr && !manager ? '/hr-messages' : '/messages');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      setUnreadCount(0);
    }
  };

  const timeAgo = (iso: string) => {
    if (!iso) return 'Just now';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  // Latest unread notification for hover preview
  const latestUnread = notifications.find(n => !n.read) || notifications[0];

  return (
    <div
      className={`notif-bell-container ${className}`}
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="btn btn-secondary notif-bell-btn"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={iconSize} className={unreadCount > 0 ? 'bell-ringing' : ''} />
        {unreadCount > 0 && (
          <span className="notif-badge-bubble">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Hover Preview Card (Shows on mouse hover when dropdown is closed and there are notifications) */}
      {isHovered && !isOpen && latestUnread && (
        <div
          className="notif-hover-preview"
          onClick={() => handleNotificationClick(latestUnread)}
        >
          <div className="notif-preview-header">
            <div className="notif-preview-title-row">
              <span className="notif-preview-icon">
                {latestUnread.type === 'CHAT_MESSAGE' ? <MessageSquare size={13} color="#38BDF8" /> : <Sparkles size={13} color="#A78BFA" />}
              </span>
              <span className="notif-preview-title">{latestUnread.title}</span>
            </div>
            <span className="notif-preview-time">{timeAgo(latestUnread.createdAt)}</span>
          </div>
          <p className="notif-preview-snippet">{latestUnread.message}</p>
          <div className="notif-preview-hint">
            <span>Click to view conversation</span>
            <ExternalLink size={11} />
          </div>
        </div>
      )}

      {/* Full Notifications Dropdown (Shows on click) */}
      {isOpen && (
        <div className="glass-panel notif-dropdown-panel">
          <div className="notif-dropdown-header">
            <div className="notif-header-title-wrap">
              <h4>Notifications</h4>
              {unreadCount > 0 && (
                <span className="notif-header-badge">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-sm btn-secondary notif-mark-read-btn"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <Bell size={22} className="notif-empty-icon" />
                <p>No notifications yet</p>
                <span>New messages and updates will appear here</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`notif-card-item ${n.read ? 'read' : 'unread'} ${n.type === 'CHAT_MESSAGE' ? 'is-chat' : ''}`}
                >
                  <div className="notif-item-avatar">
                    {n.type === 'CHAT_MESSAGE' ? (
                      <MessageSquare size={14} color="#38BDF8" />
                    ) : (
                      <Sparkles size={14} color="#A78BFA" />
                    )}
                  </div>

                  <div className="notif-item-body">
                    <div className="notif-item-title-row">
                      <span className="notif-item-title">{n.title}</span>
                      <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="notif-item-msg">{n.message}</p>
                    {n.type === 'CHAT_MESSAGE' && (
                      <span className="notif-item-chat-tag">Open chat conversation →</span>
                    )}
                  </div>

                  {!n.read && <span className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
