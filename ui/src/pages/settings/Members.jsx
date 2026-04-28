import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getMembers, removeMember, updateMemberRole, inviteMember } from '../../api/resources/workspaces';
import { formatRelative } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Users, UserPlus, Shield, Trash2, Mail, Crown, User, Eye, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const roleConfig = {
  owner: { label: 'Owner', icon: Crown, color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  admin: { label: 'Admin', icon: Shield, color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  member: { label: 'Member', icon: User, color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  viewer: { label: 'Viewer', icon: Eye, color: 'bg-devrelay-border text-devrelay-text-dim border border-devrelay-border' }
};

const roleOptions = [
  { value: 'viewer', label: 'Viewer', description: 'Can view resources only' },
  { value: 'member', label: 'Member', description: 'Can view and manage resources' },
  { value: 'admin', label: 'Admin', description: 'Full access except billing' }
];

function InviteMemberForm({ form, setForm, onSubmit, isPending, error, onClose }) {
  const isValid = form.email && form.email.includes('@');

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-devrelay-green" />
          Invite Details
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="colleague@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Role</label>
            <div className="space-y-2">
              {roleOptions.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: role.value })}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                    form.role === role.value
                      ? 'bg-devrelay-green/20 border-devrelay-green text-devrelay-text'
                      : 'bg-devrelay-surface border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
                  }`}
                >
                  <div>
                    <span className="font-medium">{role.label}</span>
                    <span className="text-xs ml-2 opacity-70">{role.description}</span>
                  </div>
                  {form.role === role.value && (
                    <div className="w-5 h-5 rounded-full bg-devrelay-green flex items-center justify-center">
                      <div className="w-2 h-2 bg-devrelay-bg rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-devrelay-red/10 border border-devrelay-red/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-devrelay-red" />
          <span className="text-devrelay-red">{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-lg border border-devrelay-border text-devrelay-text hover:bg-devrelay-surface2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || !isValid}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </div>
  );
}

export default function MembersSettings() {
  const { workspace } = useWorkspace();
  
  if (!workspace) {
    return <div className="text-devrelay-text-dim">Loading...</div>;
  }

  const queryClient = useQueryClient();
  
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

  const handleInvite = () => {
    inviteMutation.mutate(inviteForm);
  };

  const members = data?.data?.members || [];
  const currentUserId = workspace?.currentUser?.id;

  if (isLoading) {
    return <SkeletonTable rows={5} columns={6} />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-devrelay-red mx-auto mb-4" />
        <p className="text-devrelay-red">Failed to load members</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Team Members</h1>
          <p className="text-devrelay-text-dim mt-1">Manage workspace access and permissions</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-green-dim transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Invite Member
        </button>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-devrelay-border bg-devrelay-surface2">
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Member</th>
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Email</th>
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Role</th>
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Joined</th>
              <th className="text-right text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-devrelay-text-dim">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-devrelay-text-dim opacity-50" />
                    <p>No members yet</p>
                    <p className="text-sm">Invite your first team member to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              members.map(member => {
                const RoleIcon = roleConfig[member.role]?.icon || User;
                const isCurrentUser = member._id === currentUserId;
                const isOwner = member.role === 'owner';
                
                return (
                  <tr key={member._id || member.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          isOwner ? 'bg-purple-500/20 text-purple-400' : 'bg-devrelay-green/20 text-devrelay-green'
                        }`}>
                          {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="text-devrelay-text font-medium">
                            {member.name || 'Unnamed'}
                            {isCurrentUser && <span className="ml-2 text-xs text-devrelay-text-dim">(You)</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-devrelay-text-dim">{member.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={member.role}
                        onChange={(e) => updateRoleMutation.mutate({ userId: member._id, role: e.target.value })}
                        disabled={isOwner || isCurrentUser}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${roleConfig[member.role]?.color} disabled:opacity-50 disabled:cursor-not-allowed`}
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
                      {!isOwner && !isCurrentUser && (
                        <button
                          onClick={() => setRemoveConfirm(member)}
                          className="text-sm text-devrelay-red hover:text-devrelay-red/80 flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SlideOver
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteError(''); setInviteForm({ email: '', role: 'member' }); }}
        title="Invite Member"
        size="md"
      >
        <InviteMemberForm 
          form={inviteForm}
          setForm={setInviteForm}
          onSubmit={handleInvite}
          isPending={inviteMutation.isPending}
          error={inviteError}
          onClose={() => { setInviteOpen(false); setInviteError(''); }}
        />
      </SlideOver>

      <ConfirmModal
        open={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={() => removeMutation.mutate(removeConfirm._id)}
        title="Remove Member"
        description={`Are you sure you want to remove "${removeConfirm?.name || removeConfirm?.email}" from this workspace? They will lose access immediately.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}