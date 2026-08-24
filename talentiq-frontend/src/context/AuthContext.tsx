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
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCandidate: boolean;
  isHr: boolean;
  isAdmin: boolean;
  login: (credentials: any) => Promise<void>;
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
    emailVerified: data.emailVerified ?? true
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
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
          const userData = res.data.data;
          const userObj = parseUserFromAuthData(userData);
          setUser(userObj);
          localStorage.setItem('user', JSON.stringify(userObj));
        } catch (e) {
          console.warn('Session check warning (using cached user):', e);
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
    } else if (credentials.requiredRole === 'ROLE_SUPER_ADMIN') {
      endpoint = '/auth/admin/login';
    }

    const res = await apiClient.post(endpoint, credentials);
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

  const register = async (data: any) => {
    const res = await apiClient.post('/auth/register', data);
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
  const isAdmin = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_PLATFORM_ADMIN') || roles.includes('SUPER_ADMIN');

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      isCandidate,
      isHr,
      isAdmin,
      login,
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
