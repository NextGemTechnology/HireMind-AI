import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { X } from 'lucide-react';

interface ToastData {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  avatarUrl?: string;
}

export const HrGlobalNotificationToast: React.FC = () => {
  const { user, isAuthenticated, isHr } = useAuth();
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
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
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
        {activeToast.senderName.charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            💬 {activeToast.senderName}
          </span>
          <span style={{ fontSize: '10px', color: '#38BDF8', fontWeight: 600, background: 'rgba(56, 189, 248, 0.15)', padding: '2px 6px', borderRadius: '999px' }}>
            NEW
          </span>
        </div>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#CBD5E1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {activeToast.content}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveToast(null);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94A3B8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
