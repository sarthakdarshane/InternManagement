const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const internshipController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');
const { upload } = require('../../config/cloudinary');

// Validation for internship creation.
// intern_id is OPTIONAL: an ADMIN creates an internship that is OPEN for
// requests; the intern is assigned later when the mentor approves a request.
const validateInternship = [
  body('intern_id')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Intern ID must be a valid string'),
  body('company_id')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Company ID must be a valid string'),
  body('mentor_id')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Mentor ID must be a valid string'),
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

// POST /api/internships - Create internship (ADMIN only; no intern_id required)
router.post('/', roleMiddleware('ADMIN'), validateInternship, internshipController.createInternship);

// GET /api/internships/my-internship - Get current intern's active/planned internship
router.get('/my-internship', roleMiddleware('INTERN'), internshipController.getMyInternship);

// GET /api/internships/available - Open internships an INTERN can request
router.get('/available', roleMiddleware('INTERN'), internshipController.getAvailableInternships);

// GET /api/internships - Get all internships (role-based)
router.get('/', internshipController.getAllInternships);

// GET /api/internships/:id - Get internship by ID
router.get('/:id', internshipController.getInternshipById);

// POST /api/internships/:id/request - INTERN requests an open internship
router.post('/:id/request', roleMiddleware('INTERN'), internshipController.requestInternship);

// PUT /api/internships/:id - Update internship (ADMIN only, own company)
router.put('/:id', roleMiddleware('ADMIN'), internshipController.updateInternship);

// PUT /api/internships/:id/mentor - Assign/unassign mentor (ADMIN only, own company)
router.put('/:id/mentor', roleMiddleware('ADMIN'), validateMentorAssignment, internshipController.assignMentor);

// PUT /api/internships/:id/status - Change internship status (ADMIN only, own company)
router.put('/:id/status', roleMiddleware('ADMIN'), internshipController.changeStatus);

// Offer Letter Routes - the offer letter belongs to the INTERN:
// INTERN uploads/deletes their own; MENTOR verifies/views own interns';
// ADMIN may view own-company offer letters but can never upload/delete.
router.post('/:id/offer-letter', roleMiddleware('INTERN'), upload.single('offer_letter'), internshipController.uploadOfferLetter);
router.get('/:id/offer-letter', roleMiddleware('INTERN', 'MENTOR', 'ADMIN'), internshipController.getOfferLetter);
router.delete('/:id/offer-letter', roleMiddleware('INTERN'), internshipController.deleteOfferLetter);

// GET /api/internships/:id/offer-letter - see offer-letter routes above

module.exports = router;
