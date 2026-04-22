const Workspace = require('../models/Workspace');
const User = require('../models/User');
const EmailTemplate = require('../models/EmailTemplate');

exports.createWorkspace = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = await Workspace.create({
      name,
      ownerId: req.user._id,
      members: [{
        userId: req.user._id,
        role: 'owner'
      }]
    });

    const defaultTemplates = EmailTemplate.getDefaults(workspace._id);
    await EmailTemplate.insertMany(defaultTemplates);

    res.status(201).json({ workspace });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Workspace name already exists' });
    }
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

exports.getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.findByUser(req.user._id)
      .populate('members.userId', 'name email avatar');

    res.json({ workspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

exports.getWorkspace = async (req, res) => {
  try {
    const workspace = req.workspace;
    await workspace.populate('members.userId', 'name email avatar');

    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
};

exports.updateWorkspace = async (req, res) => {
  try {
    const workspace = req.workspace;
    const { name, settings } = req.body;

    if (!workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (name) workspace.name = name;
    if (settings) {
      workspace.settings = { ...workspace.settings.toObject(), ...settings };
    }

    await workspace.save();

    res.json({ workspace });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

exports.deleteWorkspace = async (req, res) => {
  try {
    const workspace = req.workspace;

    if (workspace.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only owner can delete workspace' });
    }

    workspace.isActive = false;
    await workspace.save();

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const workspace = req.workspace;
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (workspace.isMember(user._id)) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    workspace.members.push({
      userId: user._id,
      role
    });

    await workspace.save();
    await workspace.populate('members.userId', 'name email avatar');

    res.json({ workspace, message: 'Member invited successfully' });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const workspace = req.workspace;
    const { userId } = req.params;

    if (!workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const targetUserId = require('mongoose').Types.ObjectId.createFromHexString(userId);

    if (workspace.ownerId.toString() === targetUserId.toString()) {
      return res.status(400).json({ error: 'Cannot remove workspace owner' });
    }

    const memberIndex = workspace.members.findIndex(
      m => m.userId.toString() === targetUserId.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const workspace = req.workspace;

    const stats = {
      webhookCount: 0,
      jobCount: 0,
      scheduledJobs: 0,
      apiKeysUsedToday: 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const workspace = req.workspace;
    const { userId } = req.params;
    const { role } = req.body;

    if (!workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const targetUserId = require('mongoose').Types.ObjectId.createFromHexString(userId);

    if (workspace.ownerId.toString() === targetUserId.toString()) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const member = workspace.members.find(
      m => m.userId.toString() === targetUserId.toString()
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    member.role = role;
    await workspace.save();

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};