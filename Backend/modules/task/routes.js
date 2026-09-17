const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const taskController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

// Validation for task creation
const validateTask = [
  body('internship_id')
    .notEmpty()
    .withMessage('Internship ID is required')
    .isString()
    .withMessage('Internship ID must be a valid string'),
  body('intern_id')
    .notEmpty()
    .withMessage('Intern ID is required')
    .isString()
    .withMessage('Intern ID must be a valid string'),
  body('mentor_id')
    .notEmpty()
    .withMessage('Mentor ID is required')
    .isString()
    .withMessage('Mentor ID must be a valid string'),
  body('task_name')
    .trim()
    .notEmpty()
    .withMessage('Task name is required')
    .isLength({ max: 200 })
    .withMessage('Task name cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('assigned_date')
    .notEmpty()
    .withMessage('Assigned date is required')
    .isISO8601()
    .withMessage('Assigned date must be a valid date'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.assigned_date) {
        const dueDate = new Date(value);
        const assignedDate = new Date(req.body.assigned_date);
        if (dueDate < assignedDate) {
          throw new Error('Due date cannot be before assigned date');
        }
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'])
    .withMessage('Status must be one of: PENDING, IN_PROGRESS, COMPLETED, DELAYED'),
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

// Validation for task update
const validateTaskUpdate = [
  body('task_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Task name cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('assigned_date')
    .optional()
    .isISO8601()
    .withMessage('Assigned date must be a valid date'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'])
    .withMessage('Status must be one of: PENDING, IN_PROGRESS, COMPLETED, DELAYED'),
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

// Validation for status update
const validateStatusUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'])
    .withMessage('Status must be one of: PENDING, IN_PROGRESS, COMPLETED, DELAYED'),
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

// All task routes are protected
router.use(authMiddleware);

// POST /api/tasks - Create/assign task (ADMIN only).
// MENTOR is a read-only observer and SUPERADMIN has no operational task access.
router.post('/', roleMiddleware('ADMIN'), validateTask, taskController.createTask);

// GET /api/tasks - Get all tasks (role-based filtering)
router.get('/', taskController.getAllTasks);

// GET /api/tasks/my-tasks - Get current intern's tasks (INTERN only)
router.get('/my-tasks', roleMiddleware('INTERN'), taskController.getMyTasks);

// GET /api/tasks/my-assigned-tasks - Get mentor's assigned tasks (MENTOR only)
router.get('/my-assigned-tasks', roleMiddleware('MENTOR'), taskController.getMyAssignedTasks);

// GET /api/tasks/:id - Get task by ID
router.get('/:id', taskController.getTaskById);

// PUT /api/tasks/:id - Update task (ADMIN only)
router.put('/:id', roleMiddleware('ADMIN'), validateTaskUpdate, taskController.updateTask);

// PUT /api/tasks/:id/status - Update task status (ADMIN, or the INTERN who owns the task)
router.put('/:id/status', roleMiddleware('ADMIN', 'INTERN'), validateStatusUpdate, taskController.updateTaskStatus);

// DELETE /api/tasks/:id - Delete task (ADMIN only)
router.delete('/:id', roleMiddleware('ADMIN'), taskController.deleteTask);

module.exports = router;
