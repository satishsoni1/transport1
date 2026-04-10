'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/app/services/api-client';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status?: string;
  platformRole?: string;
  transportId?: number | null;
  transportName?: string | null;
  transportSlug?: string | null;
  subscription?: {
    plan?: string | null;
    status?: 'none' | 'active' | 'near_expiry' | 'expired';
    startDate?: string | null;
    endDate?: string | null;
    daysRemaining?: number | null;
    warningDays?: number;
    message?: string | null;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  updateSession: (session: { token: string; user: User }) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, firstName: string, lastName: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage and verify token.
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    const init = async () => {
      if (!savedToken || !savedUser) {
        setIsLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);

        const verification = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${savedToken}` },
          cache: 'no-store',
        });

        if (!verification.ok) {
          throw new Error('Invalid session');
        }
        const verificationData = await verification.json();
        if (verificationData?.user) {
          setUser(verificationData.user);
          localStorage.setItem('auth_user', JSON.stringify(verificationData.user));
        }
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    };

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const updateSession = ({ token: nextToken, user: nextUser }: { token: string; user: User }) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('auth_token', nextToken);
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
  };

  const login = async (email: string, password: string) => {
    const data = await apiClient.post<{ token: string; user: User }, { email: string; password: string }>(
      '/api/auth/login',
      { email, password }
    );

    updateSession(data);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string
  ) => {
    await apiClient.post('/api/auth/register', {
      email,
      password,
      firstName,
      lastName,
      role,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        updateSession,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
