import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { workspaces } = useAuth();
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('devrelay_workspace');
    if (stored && workspaces.length > 0) {
      const found = workspaces.find(w => w.slug === stored);
      if (found) {
        setWorkspace(found);
      } else if (workspaces[0]) {
        setWorkspace(workspaces[0]);
        localStorage.setItem('devrelay_workspace', workspaces[0].slug);
      }
    } else if (workspaces[0]) {
      setWorkspace(workspaces[0]);
      localStorage.setItem('devrelay_workspace', workspaces[0].slug);
    }
  }, [workspaces]);

  const selectWorkspace = (ws) => {
    setWorkspace(ws);
    localStorage.setItem('devrelay_workspace', ws.slug);
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaces, selectWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}