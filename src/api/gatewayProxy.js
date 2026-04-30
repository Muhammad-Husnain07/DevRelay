const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const proxyMiddleware = require('../gateway/proxyMiddleware');

router.use(asyncHandler(proxyMiddleware));

module.exports = router;