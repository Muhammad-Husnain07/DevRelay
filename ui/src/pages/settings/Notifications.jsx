import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { updateWorkspace } from '../../api/resources/workspaces';
import { useToast } from '../../hooks/useToast';
import { X, Plus, Bell, Mail, Globe } from 'lucide-react';

export default function NotificationsSettings() {
  const { workspace } = useWorkspace();
  
  if (!workspace) {
    return <div className="text-devrelay-text-dim">Loading...</div>;
  }
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [emails, setEmails] = useState(workspace?.settings?.alertEmails || []);
  const [newEmail, setNewEmail] = useState('');
  const [prefs, setPrefs] = useState({
    emailOnDeliveryFailure: workspace?.settings?.notifications?.emailOnDeliveryFailure ?? true,
    emailOnAlertFired: workspace?.settings?.notifications?.emailOnAlertFired ?? true,
    browserNotifications: workspace?.settings?.notifications?.browserNotifications ?? false
  });
  const [saving, setSaving] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => updateWorkspace(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace']);
      toast.success('Notification settings saved');
      setSaving(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save');
      setSaving(false);
    }
  });

  const addEmail = () => {
    if (!newEmail || !newEmail.includes('@')) return;
    if (emails.includes(newEmail)) return;
    setEmails([...emails, newEmail]);
    setNewEmail('');
    save();
  };

  const removeEmail = (email) => {
    setEmails(emails.filter(e => e !== email));
    save();
  };

  const save = async (data = {}) => {
    setSaving(true);
    await updateMutation.mutateAsync({
      settings: {
        ...workspace?.settings,
        alertEmails: emails,
        notifications: prefs
      },
      ...data
    });
  };

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications not supported');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPrefs({ ...prefs, browserNotifications: true });
      save();
      toast.success('Browser notifications enabled');
    } else {
      toast.error('Browser notification permission denied');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium text-devrelay-text mb-4">Alert Email Recipients</h3>
        <p className="text-sm text-devrelay-text-dim mb-4">
          These email addresses will receive all workspace alerts.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {emails.map(email => (
            <div key={email} className="flex items-center gap-2 bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-1.5">
              <Mail className="w-4 h-4 text-devrelay-text-dim" />
              <span className="text-devrelay-text text-sm">{email}</span>
              <button onClick={() => removeEmail(email)} className="text-devrelay-text-dim hover:text-devrelay-red">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
            placeholder="email@example.com"
            className="flex-1 bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
          />
          <button
            onClick={addEmail}
            disabled={!newEmail}
            className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="border-t border-devrelay-border pt-6">
        <h3 className="text-lg font-medium text-devrelay-text mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-devrelay-text-dim" />
              <span className="text-devrelay-text">Email on delivery failure surge</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailOnDeliveryFailure}
              onChange={(e) => { setPrefs({ ...prefs, emailOnDeliveryFailure: e.target.checked }); save(); }}
              className="w-5 h-5 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-devrelay-text-dim" />
              <span className="text-devrelay-text">Email on alert fired</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailOnAlertFired}
              onChange={(e) => { setPrefs({ ...prefs, emailOnAlertFired: e.target.checked }); save(); }}
              className="w-5 h-5 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-devrelay-text-dim" />
              <span className="text-devrelay-text">Browser notifications</span>
            </div>
            {prefs.browserNotifications ? (
              <span className="text-devrelay-green text-sm">Enabled</span>
            ) : (
              <button
                onClick={requestBrowserPermission}
                className="text-sm text-devrelay-green hover:underline"
              >
                Enable
              </button>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}