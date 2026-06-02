export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to roles: [${roles.join(', ')}]. Your role: '${req.user?.role || 'none'}'`
      });
    }
    next();
  };
};

export const adminOnly = authorizeRoles('admin');
export const premiumOrAbove = authorizeRoles('premium', 'ultra', 'admin');
