import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface GoogleAuthButtonProps {
  role?: 'ROLE_CANDIDATE' | 'ROLE_HR';
  label?: string;
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  role = 'ROLE_CANDIDATE',
  label = 'Continue with Google',
  onError
}) => {
  const { googleLogin } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const handleGoogleClick = () => {
    // Open sleek Google Sign-In dialog
    setShowPrompt(true);
  };

  const handleGoogleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim().endsWith('@gmail.com')) {
      if (onError) onError('Google login requires a valid @gmail.com email address.');
      return;
    }
    setLoading(true);
    try {
      await googleLogin({
        email: googleEmail.trim(),
        name: googleName.trim() || 'Google User',
        role: role,
        picture: '',
      });
      setShowPrompt(false);
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const roles: string[] = savedUser.roles || [];
      const isHr = roles.includes('ROLE_HR') || roles.includes('HR');
      const isAdmin = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('SUPER_ADMIN');

      if (role === 'ROLE_HR' && (isHr || isAdmin)) {
        navigate('/hr-analytics');
      } else if (role === 'ROLE_CANDIDATE' && !isHr) {
        navigate('/jobs');
      } else if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/jobs');
      }
    } catch (err: any) {
      if (onError) onError(err?.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loading}
        className="google-auth-btn"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
          border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: isLight ? '#0F172A' : '#FFFFFF',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.06)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
          marginTop: '12px',
          marginBottom: '16px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.borderColor = isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.2)';
        }}
      >
        {/* Official Google Multicolor 'G' Icon */}
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{loading ? 'Connecting with Google...' : label}</span>
      </button>

      {/* Google OAuth Modal Dialog */}
      {showPrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowPrompt(false)}
        >
          <div
            style={{
              background: isLight ? '#FFFFFF' : '#0F172A',
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              color: isLight ? '#0F172A' : '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: isLight ? '#F1F5F9' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: isLight ? '#0F172A' : '#FFFFFF' }}>Google Sign-In</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: isLight ? '#64748B' : '#94A3B8' }}>
                  Only <strong>@gmail.com</strong> accounts supported
                </p>
              </div>
            </div>

            <form onSubmit={handleGoogleAuthSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: isLight ? '#334155' : '#CBD5E1', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="e.g. Abhay Gupta"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                    border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    outline: 'none',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: isLight ? '#334155' : '#CBD5E1', marginBottom: '6px' }}>
                  Gmail Address (Must end with @gmail.com)
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                    border: !googleEmail.endsWith('@gmail.com') && googleEmail.length > 5 ? '1px solid #EF4444' : isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    outline: 'none',
                    fontSize: '13px',
                  }}
                  required
                />
                {!googleEmail.endsWith('@gmail.com') && googleEmail.length > 5 && (
                  <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                    Email must end with @gmail.com
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowPrompt(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !googleEmail.endsWith('@gmail.com')}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                    opacity: !googleEmail.endsWith('@gmail.com') ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Authenticating...' : 'Sign In with Google'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
