import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { deleteWorkspace } from '../../api/resources/workspaces';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function DangerZoneSettings() {
  const { workspace, refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [confirmSlug, setConfirmSlug] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(workspace.slug),
    onSuccess: () => {
      refreshWorkspaces();
      toast.success('Workspace deleted');
      navigate('/');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete')
  });

  const canDelete = confirmSlug === workspace?.slug;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-devrelay-red/10 border border-devrelay-red/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-devrelay-red shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-devrelay-red mb-2">Delete Workspace</h3>
            <p className="text-devrelay-text-dim text-sm mb-4">
              Deleting your workspace is permanent and cannot be undone. All data including webhooks, jobs, 
              scheduled jobs, and configurations will be permanently deleted.
            </p>
            <p className="text-devrelay-text-dim text-sm mb-4">
              This will also delete any team members and their access to this workspace.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">
                  Type <code className="text-devrelay-green font-mono">{workspace?.slug}</code> to confirm
                </label>
                <input
                  type="text"
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                  placeholder={workspace?.slug}
                />
              </div>
              
              <button
                onClick={() => setModalOpen(true)}
                disabled={!canDelete || deleteMutation.isPending}
                className="bg-devrelay-red text-devrelay-bg font-medium px-6 py-2 rounded hover:bg-devrelay-red/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Workspace"
        description={`This is permanent. Are you absolutely sure you want to delete "${workspace?.slug}"?`}
        confirmLabel="Delete Forever"
        danger
      />
    </div>
  );
}