const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Creates a new user account with email and password authentication
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Password (min 6 characters)
 *           example:
 *             name: John Doe
 *             email: john@example.com
 *             password: securePass123
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               user:
 *                 id: 507f1f77bcf86cd799439011
 *                 name: John Doe
 *                 email: john@example.com
 *                 plan: free
 *       400:
 *         description: Validation error - duplicate email or invalid data
 *         content:
 *           application/json:
 *             example:
 *               error: Email already registered
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticates user and returns JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *           example:
 *             email: john@example.com
 *             password: securePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               user:
 *                 id: 507f1f77bcf86cd799439011
 *                 name: John Doe
 *                 email: john@example.com
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth
 *     description: Redirects to GitHub for OAuth authentication
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to GitHub
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     description: Handles OAuth callback from GitHub
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to dashboard on success
 *       401:
 *         description: OAuth failed
 */
router.get('/github/callback', passport.authenticate('github', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             example:
 *               user:
 *                 id: 507f1f77bcf86cd799439011
 *                 name: John Doe
 *                 email: john@example.com
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @swagger
 * /api/auth/keys:
 *   get:
 *     summary: List API keys
 *     description: Returns all API keys for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API keys list
 *         content:
 *           application/json:
 *             example:
 *               keys:
 *                 - id: 507f1f77bcf86cd799439011
 *                   name: Production Key
 *                   prefix: dr_sk_abc
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create API key
 *     description: Generates a new API key for programmatic access
 *     tags: [Auth]
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
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresInDays:
 *                 type: number
 *           example:
 *             name: My API Key
 *             scopes: [webhooks:read, webhooks:write]
 *     responses:
 *       201:
 *         description: API key created
 *         content:
 *           application/json:
 *             example:
 *               rawKey: dr_sk_abc123def456...
 *               prefix: dr_sk_abc
 *               message: Store this key securely - it cannot be retrieved again
 */
router.post('/keys', authenticate, authController.createApiKey);
router.get('/keys', authenticate, authController.listApiKeys);

/**
 * @swagger
 * /api/auth/keys/{prefix}:
 *   delete:
 *     summary: Revoke API key
 *     description: Revokes (deletes) an API key
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: prefix
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked
 *       404:
 *         description: API key not found
 */
router.delete('/keys/:prefix', authenticate, authController.deleteApiKey);

module.exports = router;