import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getMembers, removeMember, updateMemberRole, inviteMember } from '../../api/resources/workspaces';
import { useToast } from '../../hooks/useToast';
import { formatRelative } from '../../utils/formatters';
import { formatJson } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import SkeletonTable from '../../components/ui/Skeleton';

const roleColors = {
  owner: 'bg-devrelay-purple/20 text-devrelay-purple',
  admin: 'bg-devrelay-blue/20 text-devrelay-blue',
  member: 'bg-devrelay-green/20 text-devrelay-green',
  viewer: 'bg-devrelay-border text-devrelay-text-dim'
};

export default function MembersSettings() {
  const { workspace } = useWorkspace();
  
  if (!workspace) {
    return <div className="text-devrelay-text-dim">Loading...</div>;
  }
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [inviteError, setInviteError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['members', workspace?.slug],
    queryFn: () => getMembers(workspace.slug),
    enabled: !!workspace?.slug
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateMemberRole(workspace.slug, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update role')
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => removeMember(workspace.slug, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      setRemoveConfirm(null);
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove')
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => inviteMember(workspace.slug, data.email, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'member' });
      setInviteError('');
      toast.success(`Invitation sent to ${inviteForm.email}`);
    },
    onError: (err) => {
      setInviteError(err.response?.data?.error || 'Failed to send invitation');
    }
  });

  const members = data?.data?.members || [];
  const currentUserId = workspace?.currentUser?.id;

  if (isLoading) {
    return <SkeletonTable rows={5} columns={6} />;
  }

  if (error) {
    return <div className="text-devrelay-red">Failed to load members</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-devrelay-border">
              <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">User</th>
              <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Email</th>
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
                    <span className="text-devrelay-text font-medium">{member.name || '-'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-devrelay-text-dim">{member.email}</td>
                <td className="px-6 py-4">
                  <select
                    value={member.role}
                    onChange={(e) => updateRoleMutation.mutate({ userId: member._id, role: e.target.value })}
                    disabled={member.role === 'owner' || member._id === currentUserId}
                    className={`bg-transparent border rounded px-2 py-1 text-sm ${roleColors[member.role]} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                  {member.joinedAt ? formatRelative(member.joinedAt) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  {member.role !== 'owner' && member._id !== currentUserId && (
                    <button
                      onClick={() => setRemoveConfirm(member)}
                      className="text-sm text-devrelay-red hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="email"
          value={inviteForm.email}
          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
          placeholder="colleague@example.com"
          className="flex-1 bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
        />
        <select
          value={inviteForm.role}
          onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
          className="bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
        >
          <option value="viewer">Viewer</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={() => inviteMutation.mutate(inviteForm)}
          disabled={inviteMutation.isPending || !inviteForm.email}
          className="bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
        >
          {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
        </button>
      </div>
      {inviteError && (
        <p className="text-sm text-devrelay-red">{inviteError}</p>
      )}

      <ConfirmModal
        open={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={() => removeMutation.mutate(removeConfirm._id)}
        title="Remove Member"
        description={`Are you sure you want to remove "${removeConfirm?.name || removeConfirm?.email}"? This cannot be undone.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}