import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getWorkspace, updateWorkspace, getMembers, inviteMember, removeMember, updateMemberRole, deleteWorkspace } from '../../api/resources/workspaces';
import { formatRelative } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';

const roleColors = {
  owner: 'bg-devrelay-purple/20 text-devrelay-purple',
  admin: 'bg-devrelay-blue/20 text-devrelay-blue',
  member: 'bg-devrelay-green/20 text-devrelay-green',
  viewer: 'bg-devrelay-border text-devrelay-text-dim'
};

export default function Settings() {
  const { workspace, refreshWorkspaces } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
    webhookSignatureSecret: ''
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', workspace?.slug],
    queryFn: () => getMembers(workspace.slug),
    enabled: !!workspace?.slug
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateWorkspace(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace']);
      refreshWorkspaces();
      alert('Settings saved');
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to save')
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => inviteMember(workspace.slug, data.email, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'member' });
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to invite')
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => removeMember(workspace.slug, userId),
    onSuccess: () => queryClient.invalidateQueries(['members'])
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateMemberRole(workspace.slug, userId, role),
    onSuccess: () => queryClient.invalidateQueries(['members'])
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(workspace.slug),
    onSuccess: () => {
      refreshWorkspaces();
      window.location.href = '/';
    }
  });

  const members = membersData?.data?.members || [];

  if (!workspace) {
    return <div className="p-8 text-devrelay-text">Loading...</div>;
  }

  if (membersLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  const currentUserId = workspace.currentUser?.id;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Settings</h1>
          <p className="text-devrelay-text-dim mt-1">Workspace configuration</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'general', label: 'General' },
          { key: 'members', label: 'Members' },
          { key: 'api', label: 'API Keys' },
          { key: 'danger', label: 'Danger Zone' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded transition-colors ${
              activeTab === tab.key 
                ? 'bg-devrelay-green/20 text-devrelay-green border border-devrelay-green/30' 
                : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-devrelay-text mb-4">Workspace Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                  placeholder={workspace.name}
                />
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Slug</label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                  placeholder={workspace.slug}
                />
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full h-24 bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                  placeholder={workspace.description || 'Describe this workspace...'}
                />
              </div>
              <button
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending}
                className="bg-devrelay-green text-devrelay-bg font-medium px-6 py-2 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="max-w-4xl">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim"
            >
              Invite Member
            </button>
          </div>
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-devrelay-border">
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">User</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Role</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Joined</th>
                  <th className="text-right text-sm text-devrelay-text-dim px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member._id || member.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-devrelay-green/20 rounded-full flex items-center justify-center text-devrelay-green text-sm font-medium">
                          {member.name?.[0] || member.email?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-devrelay-text font-medium">{member.name || member.email}</p>
                          <p className="text-devrelay-text-dim text-sm">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${roleColors[member.role]}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                      {member.joinedAt ? formatRelative(member.joinedAt) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.role !== 'owner' && member._id !== currentUserId && (
                        <div className="flex items-center justify-end gap-2">
                          {member.role !== 'admin' ? (
                            <button
                              onClick={() => roleMutation.mutate({ userId: member._id, role: 'admin' })}
                              className="text-sm text-devrelay-text-dim hover:text-devrelay-green"
                            >
                              Make Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => roleMutation.mutate({ userId: member._id, role: 'member' })}
                              className="text-sm text-devrelay-text-dim hover:text-devrelay-amber"
                            >
                              Remove Admin
                            </button>
                          )}
                          <button
                            onClick={() => removeMutation.mutate(member._id)}
                            className="text-sm text-devrelay-red hover:text-devrelay-red"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="max-w-2xl">
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-devrelay-text mb-4">API Keys</h3>
            <p className="text-devrelay-text-dim text-sm mb-4">
              Use API keys to authenticate requests to DevRelay APIs.
            </p>
            <div className="bg-devrelay-surface2 rounded p-4">
              <p className="text-devrelay-text text-sm font-mono">
                Authorization: Bearer dr_live_...
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'danger' && (
        <div className="max-w-2xl">
          <div className="bg-devrelay-surface border border-devrelay-red/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-devrelay-red mb-4">Danger Zone</h3>
            <p className="text-devrelay-text-dim text-sm mb-4">
              Deleting your workspace is permanent and cannot be undone.
            </p>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="bg-devrelay-red/20 text-devrelay-red font-medium px-6 py-2 rounded hover:bg-devrelay-red/30"
            >
              Delete Workspace
            </button>
          </div>
        </div>
      )}

      <SlideOver open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Member">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Email *</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              placeholder="colleague@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            onClick={() => inviteMutation.mutate(inviteForm)}
            disabled={inviteMutation.isPending || !inviteForm.email}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </SlideOver>

      <ConfirmModal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Workspace"
        description={`Are you sure you want to delete "${workspace.name}"? This is permanent.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}