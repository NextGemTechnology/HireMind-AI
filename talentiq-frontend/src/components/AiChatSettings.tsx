import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ShieldCheck, Database, X, CheckCircle2, Clock } from 'lucide-react';

interface AiChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiChatSettings: React.FC<AiChatSettingsProps> = ({ isOpen, onClose }) => {
  const [chatStorageEnabled, setChatStorageEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/recommendations/ai-preferences');
      const data = res.data?.data || res.data;
      if (data) {
        setChatStorageEnabled(data.chatStorageEnabled ?? true);
        setRetentionDays(data.retentionDays ?? 90);
        setDataSharingConsent(data.dataSharingConsent ?? false);
      }
    } catch (e: any) {
      console.warn('Could not load AI preferences:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSavedSuccess(false);
    try {
      await apiClient.put('/recommendations/ai-preferences', {
        chatStorageEnabled,
        retentionDays,
        dataSharingConsent
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save AI preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#0F172A', border: '1px solid #334155',
        borderRadius: '16px', width: '100%', maxWidth: '520px',
        padding: '24px', color: '#F8FAFC', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: '10px', color: '#818CF8' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>AI Privacy & Chat Controls</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>Manage chat persistence, retention windows, and privacy boundaries</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {savedSuccess && (
          <div style={{
            padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.15)',
            border: '1px solid #10B981', borderRadius: '8px', color: '#34D399',
            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} /> Privacy preferences updated successfully!
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.15)',
            border: '1px solid #EF4444', borderRadius: '8px', color: '#F87171',
            fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Toggle 1: Chat Storage */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px', backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: '12px',
          marginBottom: '12px', border: '1px solid #334155'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} color="#38BDF8" /> Encrypted Chat History Storage
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              When disabled, messages are processed in-memory and discarded immediately after response.
            </p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={chatStorageEnabled}
              onChange={(e) => setChatStorageEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '24px',
              backgroundColor: chatStorageEnabled ? '#4F46E5' : '#475569',
              transition: '0.2s'
            }}>
              <span style={{
                position: 'absolute', height: '18px', width: '18px', left: chatStorageEnabled ? '22px' : '3px',
                bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '0.2s'
              }} />
            </span>
          </label>
        </div>

        {/* Retention Window */}
        <div style={{
          padding: '14px', backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: '12px',
          marginBottom: '12px', border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#A78BFA" /> Automated Retention Window
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                Chat logs older than this duration are automatically purged.
              </p>
            </div>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              disabled={!chatStorageEnabled}
              style={{
                backgroundColor: '#0F172A', border: '1px solid #475569',
                color: '#F8FAFC', borderRadius: '8px', padding: '6px 12px',
                fontSize: '13px', cursor: chatStorageEnabled ? 'pointer' : 'not-allowed',
                opacity: chatStorageEnabled ? 1 : 0.5
              }}
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days (Default)</option>
              <option value={180}>180 Days</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', backgroundColor: 'transparent',
              border: '1px solid #475569', borderRadius: '8px',
              color: '#94A3B8', fontSize: '13px', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '8px 20px', backgroundColor: '#4F46E5',
              border: 'none', borderRadius: '8px',
              color: '#FFFFFF', fontWeight: 600, fontSize: '13px',
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChatSettings;
