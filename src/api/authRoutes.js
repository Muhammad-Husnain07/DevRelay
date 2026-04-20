const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/error' }),
  authController.githubCallback
);

router.get('/me', authenticate, authController.getMe);

router.post('/keys', authenticate, authController.generateApiKey);
router.get('/keys', authenticate, authController.listApiKeys);
router.delete('/keys/:prefix', authenticate, authController.revokeApiKey);

module.exports = router;