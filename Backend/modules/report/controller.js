const reportService = require('./service');
const User = require('../auth/model');
const mongoose = require('mongoose');

// POST /api/reports/monthly - Generate a monthly report for an intern (SUPERADMIN or ADMIN)
const generateMonthlyReport = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    if (authUser.role !== 'SUPERADMIN' && authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only SUPERADMIN or ADMIN can generate reports' });
    }

    const { intern_id, month, year } = req.body;
    if (!intern_id || !mongoose.Types.ObjectId.isValid(intern_id)) {
      return res.status(400).json({ success: false, message: 'Invalid intern ID' });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    if (isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
    }
    if (isNaN(y) || y < 2020 || y > 2100) {
      return res.status(400).json({ success: false, message: 'Year must be between 2020 and 2100' });
    }

    // ADMIN can only generate reports for interns within their own company
    if (authUser.role === 'ADMIN') {
      const intern = await User.findById(intern_id);
      if (!intern) return res.status(404).json({ success: false, message: 'Intern not found' });
      if (!intern.company_id || intern.company_id.toString() !== authUser.company_id.toString()) {
        return res.status(403).json({ success: false, message: 'Intern is not from your company' });
      }
    }

    const report = await reportService.generateMonthlyReport(intern_id, m, y);

    res.status(201).json({ success: true, message: 'Monthly report generated', report });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateMonthlyReport,
  getReportById: reportService.getReportById,
  getReports: reportService.getReports,
  getMyReports: reportService.getMyReports,
  getMentorReports: reportService.getMentorReports,
  regenerateReport: reportService.regenerateReport,
  getSafeReport: reportService.getSafeReport,
  calculateWorkingDays: reportService.calculateWorkingDays,
  calculateTaskSummary: reportService.calculateTaskSummary,
  calculateDailySummary: reportService.calculateDailySummary,
  calculateSentimentSummary: reportService.calculateSentimentSummary,
  getEvaluationSummary: reportService.getEvaluationSummary
};
