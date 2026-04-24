import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ChevronDown, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { workspaces } = useAuth();
  const { workspace, selectWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const handleSelect = (ws) => {
    selectWorkspace(ws);
    setIsOpen(false);
    queryClient.clear();
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open-create-workspace'));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-devrelay-surface2 border border-devrelay-border rounded hover:border-devrelay-green/50 transition-colors"
      >
        <span className="text-sm font-medium text-devrelay-text truncate">
          {workspace?.name || 'Select workspace'}
        </span>
        <ChevronDown className={`w-4 h-4 text-devrelay-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-devrelay-surface border border-devrelay-border rounded shadow-lg z-20 max-h-64 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws._id || ws.id}
                onClick={() => handleSelect(ws)}
                className={`w-full text-left px-3 py-2 hover:bg-devrelay-surface2 transition-colors ${
                  ws.slug === workspace?.slug ? 'bg-devrelay-surface2 text-devrelay-green' : 'text-devrelay-text'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate">{ws.name}</span>
                  {ws.plan && (
                    <span className="text-xs px-2 py-0.5 bg-devrelay-green/20 text-devrelay-green rounded">
                      {ws.plan}
                    </span>
                  )}
                </div>
              </button>
            ))}
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-3 py-2 text-devrelay-green hover:bg-devrelay-surface2 border-t border-devrelay-border"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create Workspace</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}