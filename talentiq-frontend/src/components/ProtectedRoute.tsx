import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPostLoginRoute } from '../utils/roleRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string;
}

/**
 * ProtectedRoute — Wraps routes that require authentication and/or specific roles.
 *
 * Usage:
 *   <ProtectedRoute roles={['ROLE_HR']}>
 *     <HrAnalytics />
 *   </ProtectedRoute>
 *
 * If no roles are specified, only authentication is required.
 * If roles are specified, user must have at least one of the listed roles.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
  redirectTo
}) => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-dark, #0a0e1a)',
        color: 'var(--text-main, #E2E8F0)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(124,58,237,0.3)',
            borderTop: '3px solid #7C3AED',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: '14px', opacity: 0.7 }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  const hasToken = !!localStorage.getItem('accessToken');
  if (!isAuthenticated || !hasToken || !user) {
    // Determine appropriate login page based on requested roles
    const loginPath = redirectTo || determineLoginPath(roles);
    return <Navigate to={loginPath} replace />;
  }

  if (roles && roles.length > 0) {
    const userRoles = user?.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      const myAuthorizedRoute = getPostLoginRoute(userRoles);

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-dark, #0a0e1a)',
          color: 'var(--text-main, #E2E8F0)',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '16px',
            padding: '36px 40px',
            textAlign: 'center',
            maxWidth: '460px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px'
            }}>
              🔒
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#F87171', marginBottom: '8px' }}>
              Access Denied
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '16px' }}>
              You do not have permission to access this portal. This view requires <strong style={{ color: '#F87171' }}>{roles.join(' or ')}</strong>.
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#CBD5E1'
            }}>
              Signed in as: <strong style={{ color: '#38BDF8' }}>{user?.email}</strong><br />
              Active Role: <span style={{ color: '#A78BFA', fontWeight: 600 }}>{userRoles.join(', ') || 'No Role'}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a
                href={myAuthorizedRoute}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #7C3AED, #38BDF8)',
                  color: '#FFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                Go to My Portal →
              </a>
              <button
                onClick={() => {
                  logout(determineLoginPath(roles));
                }}
                style={{
                  padding: '10px 18px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Switch Account
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

function determineLoginPath(roles?: string[]): string {
  if (!roles || roles.length === 0) return '/user-login';

  const roleSet = new Set(roles);

  if (roleSet.has('ROLE_HR')) return '/hr-login';
  if (roleSet.has('ROLE_APP_DEVELOPER') || roleSet.has('ROLE_SERVICE_TEAM') ||
      roleSet.has('ROLE_SUPER_ADMIN') || roleSet.has('ROLE_PLATFORM_ADMIN') ||
      roleSet.has('ROLE_COMPANY_ADMIN')) {
    return '/admin-login';
  }

  return '/user-login';
}

export default ProtectedRoute;
