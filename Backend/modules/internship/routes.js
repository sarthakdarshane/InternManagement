const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const internshipController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');
const { upload } = require('../../config/cloudinary');

// Validation for internship creation
const validateInternship = [
  body('intern_id')
    .notEmpty()
    .withMessage('Intern ID is required')
    .isString()
    .withMessage('Intern ID must be a valid string'),
  body('company_id')
    .notEmpty()
    .withMessage('Company ID is required')
    .isString()
    .withMessage('Company ID must be a valid string'),
  body('role_name')
    .trim()
    .notEmpty()
    .withMessage('Role name is required')
    .isLength({ max: 100 })
    .withMessage('Role name cannot exceed 100 characters'),
  body('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('end_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.start_date) {
        const endDate = new Date(value);
        const startDate = new Date(req.body.start_date);
        if (endDate < startDate) {
          throw new Error('End date cannot be earlier than start date');
        }
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
    .withMessage('Status must be one of: PLANNED, ACTIVE, COMPLETED, CANCELLED'),
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

// Validation for mentor assignment
const validateMentorAssignment = [
  body('mentor_id')
    .optional({ nullable: true })
    .isString()
    .withMessage('Mentor ID must be a valid string'),
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

// All internship routes are protected
router.use(authMiddleware);

// POST /api/internships - Create internship (ADMIN or HR)
router.post('/', roleMiddleware('ADMIN', 'HR'), validateInternship, internshipController.createInternship);

// GET /api/internships - Get all internships (role-based)
router.get('/', internshipController.getAllInternships);

// GET /api/internships/:id - Get internship by ID
router.get('/:id', internshipController.getInternshipById);

// PUT /api/internships/:id - Update internship (ADMIN or HR)
router.put('/:id', roleMiddleware('ADMIN', 'HR'), internshipController.updateInternship);

// PUT /api/internships/:id/mentor - Assign/unassign mentor (ADMIN or HR)
router.put('/:id/mentor', roleMiddleware('ADMIN', 'HR'), validateMentorAssignment, internshipController.assignMentor);

// PUT /api/internships/:id/status - Change internship status (ADMIN or HR)
router.put('/:id/status', roleMiddleware('ADMIN', 'HR'), internshipController.changeStatus);

// Offer Letter Routes
router.post('/:id/offer-letter', upload.single('offer_letter'), internshipController.uploadOfferLetter);
router.get('/:id/offer-letter', internshipController.getOfferLetter);
router.delete('/:id/offer-letter', internshipController.deleteOfferLetter);

module.exports = router;
