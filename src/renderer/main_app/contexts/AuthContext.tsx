import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';
import { LoginRequest, LoginWithMicrosoftRequest } from '../types/auth';
import { config } from '../../env.config';
import { toast } from 'react-toastify';
// Lưu ý: Không import tĩnh microsoftLogin trong renderer để tránh lôi Electron API vào bundle
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  microsoftLogin: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // console.error('[AuthContext] useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Helper functions for token storage in Electron
const tokenStorage = {
  get: async (key: string): Promise<string | null> => {
    try {
      if (key !== config.ACCESS_TOKEN_KEY) return null;
      return await (window as any).tokenStore.get();
    } catch (error) {
      // console.error('[AuthContext] Error getting from tokenStore:', error);
      return null;
    }
  },
  
  set: async (key: string, value: string): Promise<void> => {
    try {
      if (key !== config.ACCESS_TOKEN_KEY) return;
      await (window as any).tokenStore.set(value);
    } catch (error) {
      // console.error('Error setting to tokenStore:', error);
    }
  },
  
  remove: async (key: string): Promise<void> => {
    try {
      if (key !== config.ACCESS_TOKEN_KEY) return;
      await (window as any).tokenStore.remove();
    } catch (error) {
      // console.error('Error removing from tokenStore:', error);
    }
  }
};

// Helper functions for email storage
const emailStorage = {
  get: async (): Promise<string | null> => {
    try {
      return await (window as any).tokenStore.getEmail();
    } catch (error) {
      // console.error('[AuthContext] Error getting email from tokenStore:', error);
      return null;
    }
  },
  
  set: async (email: string): Promise<void> => {
    try {
      await (window as any).tokenStore.setEmail(email);
    } catch (error) {
      // console.error('Error setting email to tokenStore:', error);
    }
  },
  
  remove: async (): Promise<void> => {
    try {
      await (window as any).tokenStore.removeEmail();
    } catch (error) {
      // console.error('Error removing email from tokenStore:', error);
    }
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const log = (...args: unknown[]) => console.log('[AuthContext]', ...args);
  
  // Kiểm tra token có sẵn khi component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await tokenStorage.get(config.ACCESS_TOKEN_KEY);
        const email = await emailStorage.get();
        if (token) {
          const response = await authService.validateToken(token);
          if (response.success && response.data?.access_token) {
            setIsAuthenticated(true);
            // Nếu có email từ storage, sử dụng nó, nếu không thì lấy từ API
            if (email) {
              setUserEmail(email);
            } else {
              // Lấy email từ API nếu không có trong storage
              try {
                const userResponse = await authService.getCurrentUser();
                if (userResponse.success && (userResponse as any).data?.email) {
                  const apiEmail = (userResponse as any).data.email;
                  setUserEmail(apiEmail);
                  await emailStorage.set(apiEmail);
                }
              } catch (error) {
                // console.error('[AuthContext] Error getting user email:', error);
              }
            }
          }
        }
      } catch (error) {
        // console.error('[AuthContext] Error initializing auth:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
        // log('initializeAuth: end');
      }
    };
    
    initializeAuth();
  }, []);
  
  const clearAuthData = () => {
    // log('clearAuthData');
    tokenStorage.remove(config.ACCESS_TOKEN_KEY);
    emailStorage.remove();
    authService.clearAuth();
    setIsAuthenticated(false);
    setUserEmail(null);
  };
  
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // log('login: start', { email });
      
      const payload: LoginRequest = { email, password };
      const response = await authService.login(payload);
      // log('login: response', response);
      
      if (response.success && response.data) {
        // Chỉ lưu token
        await tokenStorage.set(config.ACCESS_TOKEN_KEY, response.data.access_token);
        // Lưu email
        await emailStorage.set(email);
        setIsAuthenticated(true);
        setUserEmail(email);
        // log('login: authenticated');
      } else {
        throw new Error(response.error || 'Login failed');
      }
      
    } catch (error) {
      // console.error('[AuthContext] Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
      // log('login: end');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      // setIsLoading(true);
      
      const payload: LoginRequest = { email, password };
      const response = await authService.register(payload);
      
      if (response.success && response.data) {
        toast.success(response.data.message || 'Registration successful!');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
      
    } catch (error) {
      throw error;
    } finally {
      // setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      // log('logout: start');
      
      // Call logout API
      await authService.logout();
      
      // Clear local data
      clearAuthData();
      
    } catch (error) {
      // console.error('[AuthContext] Logout failed:', error);
      // Still clear local data even if API call fails
      clearAuthData();
    } finally {
      setIsLoading(false);
      // log('logout: end');
    }
  };

  const microsoftLogin = async () => {
    try {
      setIsLoading(true);
      // log('microsoftLogin: start');
      const microsoftApi = (window as any).microsoftAPI;
      if(microsoftApi) {
        // console.log('microsoftApi', microsoftApi);
      }
      if (!microsoftApi || typeof microsoftApi.login !== 'function') {
        throw new Error('Microsoft API chưa được expose từ preload.');
      }

      const tokens = await microsoftApi.login();
      // log('microsoftLogin: tokens acquired =', Boolean(tokens?.idToken));
      if (!tokens || !tokens.idToken) {
        throw new Error('Không lấy được id_token từ Microsoft.');
      }

      const payload: LoginWithMicrosoftRequest = { id_token: tokens.idToken };
      const response = await authService.loginWithMicrosoft(payload);
      // log('microsoftLogin: response', response);
      
      if (response.success && response.data) {
        // Chỉ lưu token
        await tokenStorage.set(config.ACCESS_TOKEN_KEY, response.data.access_token);
        // Lấy email từ Microsoft token hoặc API
        try {
          const userResponse = await authService.getCurrentUser();
          if (userResponse.success && (userResponse as any).data?.email) {
            const apiEmail = (userResponse as any).data.email;
            await emailStorage.set(apiEmail);
            setUserEmail(apiEmail);
          }
        } catch (error) {
          // console.error('[AuthContext] Error getting user email after Microsoft login:', error);
        }
        setIsAuthenticated(true);
        // log('microsoftLogin: authenticated');
      } else {
        throw new Error(response.error || 'Microsoft login failed');
      }
      
    } catch (error) {
      // console.error('[AuthContext] Microsoft login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
      // log('microsoftLogin: end');
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    userEmail,
    login,
    logout,
    microsoftLogin,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};