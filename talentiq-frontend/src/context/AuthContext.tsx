import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  phone?: string;
  avatarUrl?: string;
  status?: string;
  emailVerified?: boolean;
  companySlug?: string;
  companyName?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCandidate: boolean;
  isHr: boolean;
  isAdmin: boolean;
  login: (credentials: any) => Promise<any>;
  verify2Fa: (data: { email: string; twoFactorToken: string; otp: string }) => Promise<any>;
  register: (data: any) => Promise<void>;
  googleLogin: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseUserFromAuthData = (data: any): UserProfile => {
  const rolesArray = Array.isArray(data.roles)
    ? data.roles
    : (data.roles ? Object.values(data.roles) : []);

  return {
    id: data.userId || data.id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    roles: rolesArray,
    status: data.status || 'ACTIVE',
    emailVerified: data.emailVerified ?? true,
    companySlug: data.companySlug,
    companyName: data.companyName
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await apiClient.get('/users/me');
          if (res.data && res.data.data) {
            const userData = parseUserFromAuthData(res.data.data);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    verifyUser();
  }, []);

  const login = async (credentials: any) => {
    let endpoint = '/auth/login';
    if (credentials.requiredRole === 'ROLE_CANDIDATE') {
      endpoint = '/auth/candidate/login';
    } else if (credentials.requiredRole === 'ROLE_HR') {
      endpoint = '/auth/hr/login';
    } else if (credentials.requiredRole === 'ROLE_COMPANY_ADMIN') {
      endpoint = '/auth/company/login';
    } else if (credentials.requiredRole === 'ROLE_APP_DEVELOPER') {
      endpoint = '/auth/app-developer/login';
    } else if (credentials.requiredRole === 'ROLE_MANAGEMENT_TEAM') {
      endpoint = '/auth/management/login';
    } else if (credentials.requiredRole === 'ROLE_SUPER_ADMIN' || credentials.requiredRole === 'ROLE_PLATFORM_ADMIN') {
      endpoint = '/auth/admin/login';
    }

    const res = await apiClient.post(endpoint, credentials);
    const authData = res.data.data;
    if (authData.requires2Fa) {
      return authData;
    }
    if (authData.accessToken) {
      localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.refreshToken) {
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    const authUser = parseUserFromAuthData(authData);
    localStorage.setItem('user', JSON.stringify(authUser));
    setUser(authUser);
    return authData;
  };

  const verify2Fa = async (data: { email: string; twoFactorToken: string; otp: string }) => {
    const res = await apiClient.post('/auth/admin/2fa-verify', data);
    const authData = res.data.data;
    if (authData.accessToken) {
      localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.refreshToken) {
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    const authUser = parseUserFromAuthData(authData);
    localStorage.setItem('user', JSON.stringify(authUser));
    setUser(authUser);
    return authData;
  };

  const register = async (data: any) => {
    let endpoint = '/auth/register';
    if (data.role === 'ROLE_CANDIDATE') {
      endpoint = '/auth/candidate/register';
    } else if (data.role === 'ROLE_HR') {
      endpoint = '/auth/hr/register';
    } else if (data.role === 'ROLE_COMPANY_ADMIN') {
      endpoint = '/auth/company/register';
    } else if (data.role === 'ROLE_APP_DEVELOPER') {
      endpoint = '/auth/app-developer/register';
    } else if (data.role === 'ROLE_MANAGEMENT_TEAM') {
      endpoint = '/auth/management/register';
    }

    const res = await apiClient.post(endpoint, data);
    const authData = res.data.data;
    if (authData.accessToken) {
      localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.refreshToken) {
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    const authUser = parseUserFromAuthData(authData);
    localStorage.setItem('user', JSON.stringify(authUser));
    setUser(authUser);
  };

  const googleLogin = async (data: any) => {
    const res = await apiClient.post('/auth/google', data);
    const authData = res.data.data;
    if (authData.accessToken) {
      localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.refreshToken) {
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    const authUser = parseUserFromAuthData(authData);
    localStorage.setItem('user', JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.debug('Logout API call finished / token revoked');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.clear();
      setUser(null);
    }
  };

  const roles = user?.roles || [];
  const isCandidate = roles.includes('ROLE_CANDIDATE') || roles.includes('CANDIDATE');
  const isHr = roles.includes('ROLE_HR') || roles.includes('HR');
  const isAdmin = roles.includes('ROLE_SUPER_ADMIN') ||
                  roles.includes('ROLE_PLATFORM_ADMIN') ||
                  roles.includes('ROLE_APP_DEVELOPER') ||
                  roles.includes('ROLE_MANAGEMENT_TEAM') ||
                  roles.includes('ROLE_COMPANY_ADMIN') ||
                  roles.includes('SUPER_ADMIN');

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      isCandidate,
      isHr,
      isAdmin,
      login,
      verify2Fa,
      register,
      googleLogin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
