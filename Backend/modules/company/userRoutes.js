const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userController = require('./userController');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

// Validation for HR/Mentor creation
const validateUserCreation = [
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
  body('company_id')
    .notEmpty()
    .withMessage('Company ID is required')
    .isString()
    .withMessage('Company ID must be a valid string'),
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

// All user routes are protected
router.use(authMiddleware);

// POST /api/users/hr - Create HR account (ADMIN only)
router.post('/hr', roleMiddleware('ADMIN'), validateUserCreation, userController.createHR);

// POST /api/users/mentor - Create Mentor account (ADMIN only)
router.post('/mentor', roleMiddleware('ADMIN'), validateUserCreation, userController.createMentor);

// GET /api/users - Get users list (role-based filtering)
router.get('/', userController.getUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', userController.getUserById);

module.exports = router;
