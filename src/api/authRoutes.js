const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * @summary Register a new user
 * @tags Auth
 * @param {RegisterRequest} request.body.required - User registration data
 * @return {UserResponse} 201 - User created successfully
 * @return {Error} 400 - Validation error
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * @summary Login with email and password
 * @tags Auth
 * @param {LoginRequest} request.body.required - Login credentials
 * @return {AuthResponse} 200 - Login successful
 * @return {Error} 401 - Invalid credentials
 */
router.post('/login', authController.login);

/**
 * GET /api/auth/github
 * @summary Redirect to GitHub OAuth
 * @tags Auth
 * @description Initiates GitHub OAuth flow
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

/**
 * GET /api/auth/github/callback
 * @summary GitHub OAuth callback
 * @tags Auth
 * @description Handles OAuth callback from GitHub
 */
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/error' }),
  authController.githubCallback
);

/**
 * GET /api/auth/me
 * @summary Get current user profile
 * @tags Auth
 * @security bearerAuth
 * @return {UserResponse} 200 - Current user
 * @return {Error} 401 - Unauthorized
 */
router.get('/me', authenticate, authController.getMe);

/**
 * POST /api/auth/keys
 * @summary Generate a new API key
 * @tags Auth
 * @security bearerAuth
 * @param {ApiKeyRequest} request.body - API key options
 * @return {ApiKeyResponse} 201 - API key created
 * @return {Error} 400 - Validation error
 */
router.post('/keys', authenticate, authController.generateApiKey);

/**
 * GET /api/auth/keys
 * @summary List all API keys
 * @tags Auth
 * @security bearerAuth
 * @return {ApiKeysListResponse} 200 - List of API keys
 */
router.get('/keys', authenticate, authController.listApiKeys);

/**
 * DELETE /api/auth/keys/{prefix}
 * @summary Revoke an API key
 * @tags Auth
 * @security bearerAuth
 * @param {string} prefix.path.required - API key prefix
 * @return {MessageResponse} 200 - Key revoked
 */
router.delete('/keys/:prefix', authenticate, authController.revokeApiKey);

module.exports = router;