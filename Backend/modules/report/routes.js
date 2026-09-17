const express = require('express');
const router = express.Router();
const reportController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

// All report routes are protected
router.use(authMiddleware);

// GET /api/reports/my-reports - Get current intern's own reports
router.get('/my-reports', roleMiddleware('INTERN'), reportController.getMyReports);

// GET /api/reports/mentor - Get reports for interns assigned to the current mentor
router.get('/mentor', roleMiddleware('MENTOR'), reportController.getMentorReports);

// GET /api/reports - Get reports (role-scoped)
router.get('/', reportController.getReports);

// POST /api/reports/monthly - Generate a monthly report (ADMIN, own company only)
router.post('/monthly', roleMiddleware('ADMIN'), reportController.generateMonthlyReport);

// POST /api/reports/:id/regenerate - Regenerate a report (ADMIN, own company only)
router.post('/:id/regenerate', roleMiddleware('ADMIN'), reportController.regenerateReport);

// GET /api/reports/:internId - Get reports for a specific intern (authorized)
router.get('/:internId', reportController.getReportById);

module.exports = router;