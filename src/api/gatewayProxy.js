const express = require('express');
const router = express.Router();
const proxyMiddleware = require('../gateway/proxyMiddleware');
const { requireAuth } = require('../middleware/auth');
const { requireWorkspace } = require('../middleware/workspace');

router.use(requireAuth, requireWorkspace);
router.use(proxyMiddleware);

module.exports = router;