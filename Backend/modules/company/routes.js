const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const companyController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

// Validation for company creation/update
const validateCompany = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  body('contact_email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('contact_phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
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

// All company routes are protected
router.use(authMiddleware);

// POST /api/companies - Create company (SUPERADMIN only)
router.post('/', roleMiddleware('SUPERADMIN'), validateCompany, companyController.createCompany);

// GET /api/companies - Get all companies (ADMIN) or own company (others)
router.get('/', companyController.getAllCompanies);

// GET /api/companies/:id - Get company by ID
router.get('/:id', companyController.getCompanyById);

// PUT /api/companies/:id - Update company (SUPERADMIN only)
router.put('/:id', roleMiddleware('SUPERADMIN'), validateCompany, companyController.updateCompany);

// DELETE /api/companies/:id - Delete company (SUPERADMIN only)
router.delete('/:id', roleMiddleware('SUPERADMIN'), companyController.deleteCompany);

module.exports = router;
