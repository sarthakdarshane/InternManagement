const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');
const mentorController = require('./controller');

router.use(authMiddleware);

// ONE-CLICK consolidated view of all of the mentor's own interns
router.get('/dashboard-summary', roleMiddleware('MENTOR'), mentorController.getDashboardSummary);

// Internship requests awaiting this mentor's approval/rejection
router.get('/internship-requests', roleMiddleware('MENTOR'), mentorController.getInternshipRequests);

// The mentor's OWN interns (observer view) and one intern's full profile.
router.get('/interns', roleMiddleware('MENTOR'), mentorController.getMyInterns);
router.get('/interns/:internId', roleMiddleware('MENTOR'), mentorController.getInternProfile);

// Approve/reject an internship request. Approval assigns intern_id and
// activates the internship. Mentors may only decide their own requests.
router.put('/internship-requests/:requestId/approve', roleMiddleware('MENTOR'), mentorController.approveInternshipRequest);
router.put('/internship-requests/:requestId/reject', roleMiddleware('MENTOR'), mentorController.rejectInternshipRequest);

module.exports = router;
