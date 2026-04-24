const express = require('express');
const router = express.Router();
const proxyMiddleware = require('../gateway/proxyMiddleware');

router.use(proxyMiddleware);

module.exports = router;