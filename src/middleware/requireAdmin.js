const requireAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];

  if (process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY) {
    req.isAdmin = true;
    return next();
  }

  if (req.user && req.user.role === 'admin') {
    req.isAdmin = true;
    return next();
  }

  res.status(403).json({ error: 'Admin access required' });
};

const requireAdminOrPro = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];

  if (process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY) {
    req.isAdmin = true;
    return next();
  }

  if (req.user && (req.user.role === 'admin' || req.user.plan === 'pro')) {
    req.isAdmin = req.user.role === 'admin';
    return next();
  }

  res.status(403).json({ error: 'Admin or Pro plan required' });
};

module.exports = { requireAdmin, requireAdminOrPro };