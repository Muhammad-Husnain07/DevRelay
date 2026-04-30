const Workspace = require('../models/Workspace');

exports.resolveWorkspace = async (req, res, next) => {
  try {
    const { workspaceSlug } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const workspace = await Workspace.findBySlug(workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!workspace.isActive) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.workspace = workspace;
    res.locals.workspace = workspace;
    next();
  } catch (error) {
    console.error('Resolve workspace error:', error);
    res.status(500).json({ error: 'Failed to resolve workspace' });
  }
};

exports.requireWorkspaceAdmin = async (req, res, next) => {
  try {
    if (!req.workspace) {
      return res.status(400).json({ error: 'Workspace not resolved' });
    }

    if (!req.workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

exports.requireWorkspaceOwner = async (req, res, next) => {
  try {
    if (!req.workspace) {
      return res.status(400).json({ error: 'Workspace not resolved' });
    }

    if (req.workspace.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Owner access required' });
    }

    next();
  } catch (error) {
    console.error('Owner check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};