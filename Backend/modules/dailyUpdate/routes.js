const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const dailyUpdateController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

// Validation for daily update creation
const validateDailyUpdate = [
  body('task_id')
    .notEmpty()
    .withMessage('Task ID is required')
    .isString()
    .withMessage('Task ID must be a valid string'),
  body('intern_id')
    .notEmpty()
    .withMessage('Intern ID is required')
    .isString()
    .withMessage('Intern ID must be a valid string'),
  body('update_date')
    .notEmpty()
    .withMessage('Update date is required')
    .isISO8601()
    .withMessage('Update date must be a valid date'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('progress')
    .isNumeric()
    .withMessage('Progress must be a number')
    .custom((value) => {
      if (value < 0 || value > 100) {
        throw new Error('Progress must be between 0 and 100');
      }
      return true;
    }),
  body('hours_worked')
    .isNumeric()
    .withMessage('Hours worked must be a number')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Hours worked cannot be negative');
      }
      return true;
    }),
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

// Validation for daily update update
const validateDailyUpdateUpdate = [
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('progress')
    .optional()
    .isNumeric()
    .withMessage('Progress must be a number')
    .custom((value) => {
      if (value < 0 || value > 100) {
        throw new Error('Progress must be between 0 and 100');
      }
      return true;
    }),
  body('hours_worked')
    .optional()
    .isNumeric()
    .withMessage('Hours worked must be a number')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Hours worked cannot be negative');
      }
      return true;
    }),
  body('update_date')
    .optional()
    .isISO8601()
    .withMessage('Update date must be a valid date'),
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

// All daily update routes are protected
router.use(authMiddleware);

// POST /api/daily-updates - Create daily update (INTERN, ADMIN, or HR)
router.post('/', roleMiddleware('INTERN', 'ADMIN', 'HR'), validateDailyUpdate, dailyUpdateController.createDailyUpdate);

// GET /api/daily-updates - Get all daily updates (role-based filtering)
router.get('/', dailyUpdateController.getAllDailyUpdates);

// GET /api/daily-updates/my-updates - Get current intern's daily updates (INTERN only)
router.get('/my-updates', roleMiddleware('INTERN'), dailyUpdateController.getMyDailyUpdates);

// GET /api/daily-updates/task/:taskId - Get daily updates for a specific task
router.get('/task/:taskId', dailyUpdateController.getDailyUpdatesByTask);

// GET /api/daily-updates/:id - Get daily update by ID
router.get('/:id', dailyUpdateController.getDailyUpdateById);

// PUT /api/daily-updates/:id - Update daily update (ADMIN, HR, or INTERN)
router.put('/:id', roleMiddleware('ADMIN', 'HR', 'INTERN'), validateDailyUpdateUpdate, dailyUpdateController.updateDailyUpdate);

// DELETE /api/daily-updates/:id - Delete daily update (ADMIN or HR only)
router.delete('/:id', roleMiddleware('ADMIN', 'HR'), dailyUpdateController.deleteDailyUpdate);

module.exports = router;
