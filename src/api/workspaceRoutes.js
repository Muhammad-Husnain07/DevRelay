const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace, requireWorkspaceAdmin, requireWorkspaceOwner } = require('../middleware/workspace');

router.use(authenticate);

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);

router.param('workspaceSlug', resolveWorkspace);

router.get('/:workspaceSlug', workspaceController.getWorkspace);
router.put('/:workspaceSlug', requireWorkspaceAdmin, workspaceController.updateWorkspace);
router.delete('/:workspaceSlug', requireWorkspaceOwner, workspaceController.deleteWorkspace);

router.post('/:workspaceSlug/members', requireWorkspaceAdmin, workspaceController.inviteMember);
router.delete('/:workspaceSlug/members/:userId', requireWorkspaceAdmin, workspaceController.removeMember);
router.put('/:workspaceSlug/members/:userId/role', requireWorkspaceAdmin, workspaceController.updateMemberRole);

router.get('/:workspaceSlug/stats', workspaceController.getStats);

module.exports = router;