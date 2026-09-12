const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');

// Validation middleware for registration
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg).join(', ')
      });
    }
    next();
  }
];

// Validation middleware for login
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg).join(', ')
      });
    }
    next();
  }
];

// POST /api/auth/register - Register a new INTERN user
router.post('/register', validateRegistration, authController.register);

// POST /api/auth/login - Login user
router.post('/login', validateLogin, authController.login);

// GET /api/auth/me - Get current user (protected route)
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
