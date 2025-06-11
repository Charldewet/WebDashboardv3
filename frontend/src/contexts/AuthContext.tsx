import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// TODO: Move this to environment variables
const API_BASE_URL = 'https://webdashback.onrender.com';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('authToken');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.valid) {
        setIsAuthenticated(true);
        setUser(response.data.user);
      } else {
        // Token is invalid
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      // Token verification failed
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, {
        username,
        password
      });
      
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      setIsAuthenticated(true);
      setUser(user);
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
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