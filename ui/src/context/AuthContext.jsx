import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/resources/auth';
import { listWorkspaces } from '../api/resources/workspaces';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('devrelay_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then(({ data }) => {
          setUser(data.user);
          setIsAuthenticated(true);
          return listWorkspaces();
        })
        .then(({ data }) => {
          setWorkspaces(data.workspaces || data);
        })
        .catch(() => {
          localStorage.removeItem('devrelay_token');
          localStorage.removeItem('devrelay_workspace');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('devrelay_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    const { data: ws } = await listWorkspaces();
    setWorkspaces(ws.workspaces || ws);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('devrelay_token');
    localStorage.removeItem('devrelay_workspace');
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setIsAuthenticated(false);
  };

  const register = async (name, email, password) => {
    const { data } = await authApi.register(name, email, password);
    localStorage.setItem('devrelay_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    const { data: ws } = await listWorkspaces();
    setWorkspaces(ws.workspaces || ws);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      workspaces,
      isAuthenticated,
      isLoading,
      login,
      logout,
      register,
      setWorkspaces
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}