const url = require('url');

const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^localhost$/i
];

const BLOCKED_HOSTNAMES = [
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.aws',
  'instance_metadata'
];

const isPrivateIP = (ip) => {
  if (!ip) return false;
  return BLOCKED_IP_RANGES.some(pattern => pattern.test(ip));
};

const isBlockedHostname = (hostname) => {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some(h => lower === h || lower.endsWith(`.${h}`));
};

const validateUrl = (targetUrl) => {
  try {
    const parsed = url.parse(targetUrl);

    if (!parsed.protocol || !parsed.hostname) {
      return { valid: false, error: 'Invalid URL format' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP/HTTPS protocols allowed' };
    }

    const hostname = parsed.hostname.replace(/:\d+$/, '');

    if (isPrivateIP(hostname) || isBlockedHostname(hostname)) {
      return { valid: false, error: 'Cannot access private/internal hosts' };
    }

    const dns = require('dns');
    return new Promise((resolve) => {
      dns.lookup(hostname, (err, address) => {
        if (err || !address) {
          resolve({ valid: false, error: 'Hostname resolution failed' });
          return;
        }
        if (isPrivateIP(address)) {
          resolve({ valid: false, error: 'Resolved to private IP address' });
          return;
        }
        resolve({ valid: true });
      });
    });
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

const ssrfProtection = async (req, res, next) => {
  const targetUrl = req.body?.url || req.query?.url || req.headers['x-target-url'];

  if (targetUrl) {
    const result = await validateUrl(targetUrl);
    if (!result.valid) {
      return res.status(400).json({ error: 'SSRF protection: ' + result.error });
    }
  }

  next();
};

module.exports = { ssrfProtection, validateUrl };