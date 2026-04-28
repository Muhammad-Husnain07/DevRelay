const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace, requireWorkspaceAdmin, requireWorkspaceOwner } = require('../middleware/workspace');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a new workspace
 *     description: Creates a new workspace and sets the authenticated user as the owner
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *           example:
 *             name: My Company
 *     responses:
 *       201:
 *         description: Workspace created
 *         content:
 *           application/json:
 *             example:
 *               workspace:
 *                 id: 507f1f77bcf86cd799439011
 *                 name: My Company
 *                 slug: my-company
 *                 ownerId: 507f1f77bcf86cd799439011
 *       400:
 *         description: Validation error or duplicate name
 *   get:
 *     summary: List workspaces
 *     description: Returns all workspaces the authenticated user is a member of
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 *         content:
 *           application/json:
 *             example:
 *               workspaces:
 *                 - id: 507f1f77bcf86cd799439011
 *                   name: My Company
 *                   slug: my-company
 */
router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.get('/summary', workspaceController.getWorkspaces);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}:
 *   get:
 *     summary: Get workspace details
 *     description: Returns workspace details and settings
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceSlug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: my-company
 *     responses:
 *       200:
 *         description: Workspace details
 *       403:
 *         description: Not a member
 *       404:
 *         description: Workspace not found
 *   put:
 *     summary: Update workspace
 *     description: Updates workspace settings (admin only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceSlug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               settings:
 *                 type: object
 *           example:
 *             name: New Name
 *     responses:
 *       200:
 *         description: Workspace updated
 *       403:
 *         description: Not authorized
 *   delete:
 *     summary: Delete workspace
 *     description: Deletes workspace and all associated data (owner only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceSlug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted
 *       403:
 *         description: Not owner
 */
router.param('workspaceSlug', resolveWorkspace);

router.get('/:workspaceSlug', workspaceController.getWorkspace);
router.put('/:workspaceSlug', requireWorkspaceAdmin, workspaceController.updateWorkspace);
router.delete('/:workspaceSlug', requireWorkspaceOwner, workspaceController.deleteWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/members:
 *   post:
 *     summary: Invite member
 *     description: Invites a user to the workspace (admin only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceSlug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *           example:
 *             email: colleague@example.com
 *             role: member
 *     responses:
 *       201:
 *         description: Member invited
 *       400:
 *         description: Invalid email
 *   get:
 *     summary: List members
 *     description: Returns all workspace members
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Members list
 */
router.post('/:workspaceSlug/members', requireWorkspaceAdmin, workspaceController.inviteMember);
router.get('/:workspaceSlug/members', workspaceController.getMembers);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/members/{userId}:
 *   delete:
 *     summary: Remove member
 *     description: Removes a member from workspace (admin only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceSlug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Cannot remove owner
 *   put:
 *     summary: Update member role
 *     description: Updates a member's role (admin only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceSlug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.delete('/:workspaceSlug/members/:userId', requireWorkspaceAdmin, workspaceController.removeMember);
router.put('/:workspaceSlug/members/:userId/role', requireWorkspaceAdmin, workspaceController.updateMemberRole);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/stats:
 *   get:
 *     summary: Get workspace stats
 *     description: Returns statistics for the workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceSlug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace stats
 */
router.get('/:workspaceSlug/stats', workspaceController.getStats);

const ApiKey = require('../models/ApiKey');

router.get('/:workspaceSlug/api-keys', asyncHandler(async (req, res) => {
  const keys = await ApiKey.find({ workspaceId: req.workspace._id, userId: req.user._id })
    .select('-key')
    .sort({ createdAt: -1 });
  res.json({ keys });
}));

router.post('/:workspaceSlug/api-keys', asyncHandler(async (req, res) => {
  const { name, scopes, expiresInDays } = req.body;
  const key = await req.user.generateApiKey(name, scopes, expiresInDays, req.workspace._id);
  res.json({ key });
}));

router.delete('/:workspaceSlug/api-keys/:id', asyncHandler(async (req, res) => {
  const key = await ApiKey.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
    workspaceId: req.workspace._id
  });
  if (!key) return res.status(404).json({ error: 'API key not found' });
  res.json({ message: 'API key revoked' });
}));

module.exports = router;