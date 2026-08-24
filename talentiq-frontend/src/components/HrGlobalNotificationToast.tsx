import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { X } from 'lucide-react';
import '../css/hr-notification-toast.css';

interface ToastData {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  avatarUrl?: string;
}

export const HrGlobalNotificationToast: React.FC = () => {
  const { user, isAuthenticated, isHr } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stompRef = useRef<StompClient | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isHr) return;

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
        // Global chat queue subscription for HR
        client.subscribe('/user/queue/chat', (frame) => {
          try {
            const incoming = JSON.parse(frame.body);
            const currentUserId = user?.id ? parseInt(String(user.id)) : 0;

            // Only show toast if incoming message was sent to HR by someone else
            if (incoming.senderId !== currentUserId) {
              // If user is already on /hr-messages and chatting with this person, HrMessages handles UI
              const isCurrentlyChatting = location.pathname === '/hr-messages';

              if (!isCurrentlyChatting) {
                setActiveToast({
                  id: incoming.id || Date.now(),
                  senderId: incoming.senderId,
                  senderName: incoming.senderName || 'Candidate',
                  content: incoming.content || 'Sent you a message',
                });

                if (timerRef.current) clearTimeout(timerRef.current);
                // 2-second popup as explicitly requested
                timerRef.current = setTimeout(() => {
                  setActiveToast(null);
                }, 2000);
              }
            }
          } catch (err) {
            console.error('Error parsing global chat notification', err);
          }
        });
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, isHr, user?.id, location.pathname]);

  if (!activeToast) return null;

  return (
    <div
      onClick={() => {
        navigate(`/hr-messages?contactId=${activeToast.senderId}`);
        setActiveToast(null);
      }}
      className={`hr-toast-container ${isLight ? 'light' : 'dark'}`}
    >
      <div className="hr-toast-avatar">
        {activeToast.senderName.charAt(0).toUpperCase()}
      </div>

      <div className="hr-toast-content">
        <div className="hr-toast-header">
          <span className="hr-toast-sender">
            💬 {activeToast.senderName}
          </span>
          <span className="hr-toast-badge">
            NEW
          </span>
        </div>
        <p className={`hr-toast-msg ${isLight ? 'light' : 'dark'}`}>
          {activeToast.content}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveToast(null);
        }}
        className="hr-toast-close"
        aria-label="Dismiss Notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default HrGlobalNotificationToast;
