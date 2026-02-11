import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';

// Create the Auth Context
export const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wraps the application and provides authentication state and methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = AuthService.getToken();
        const storedUser = AuthService.getUser();

        if (token && storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await AuthService.login(credentials);

      if (result.data?.user) {
        setUser(result.data.user);
        setIsAuthenticated(true);
        localStorage.setItem('isLoggedIn', 'true');
        return { success: true, data: result };
      }

      throw new Error('Invalid response from server');
    } catch (error) {
      setAuthError(error.message);
      setIsAuthenticated(false);
      setUser(null);
      return { success: false, error: error.message, errors: error.errors };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await AuthService.register(userData);

      if (result.data?.user) {
        setUser(result.data.user);
        setIsAuthenticated(true);
        return { success: true, data: result };
      }

      return { success: true, data: result };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message, errors: error.errors };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    const loadingToast = toast.loading('Logging out...');

    try {
      await AuthService.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear local state
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      localStorage.removeItem('isLoggedIn');
      toast.success('Logged out successfully!', { id: loadingToast });
    }
  }, []);

  // Update user data
  const updateUser = useCallback((userData) => {
    setUser(prev => ({
      ...prev,
      ...userData
    }));

    // Also update localStorage
    const currentUser = AuthService.getUser();
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        ...userData
      }));
    }
  }, []);

  // Clear auth error
  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Get token utility
  const getToken = useCallback(() => {
    return AuthService.getToken();
  }, []);

  // Check if authenticated (refresh from storage)
  const checkAuth = useCallback(() => {
    const token = AuthService.getToken();
    const storedUser = AuthService.getUser();

    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      return true;
    }

    setUser(null);
    setIsAuthenticated(false);
    return false;
  }, []);

  // Context value
  const value = {
    // State
    user,
    isAuthenticated,
    isLoading,
    authError,

    // Actions
    login,
    register,
    logout,
    updateUser,
    clearError,
    getToken,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook for accessing auth context
 * @returns {Object} - Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;
