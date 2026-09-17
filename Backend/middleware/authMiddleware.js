const jwt = require('jsonwebtoken');
const User = require('../modules/auth/model');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load the current user state from the DB. The JWT role and the DB role
    // must never silently disagree: authorization is always based on the
    // live DB record, and the token's session version must match it.
    const user = await User.findById(decoded.user_id).select('+token_version');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.'
      });
    }

    // Session invalidation: tokens issued before a token_version bump
    // (e.g. during a role migration) are rejected here.
    const tokenVersion = decoded.token_version === undefined ? 0 : decoded.token_version;
    if (tokenVersion !== user.token_version) {
      return res.status(401).json({
        success: false,
        message: 'Session expired due to security update. Please log in again.'
      });
    }

    // Attach user info to request (from the DB record, not the token)
    req.user = {
      user_id: decoded.user_id,
      role: user.role,
      company_id: user.company_id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

module.exports = authMiddleware;
