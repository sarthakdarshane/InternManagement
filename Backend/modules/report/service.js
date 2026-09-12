const Report = require("./model");
const Task = require("../task/model");
const DailyUpdate = require("../dailyUpdate/model");
const Sentiment = require("../sentiment/model");
const Evaluation = require("../evaluation/model");
const Internship = require("../internship/model");
const User = require("../auth/model");
const Company = require("../company/model");
const mongoose = require("mongoose");

const EXPECTED_DAILY_HOURS = parseInt(process.env.EXPECTED_DAILY_HOURS) || 8;

const getSafeReport = (report) => ({
  id: report._id,
  intern_id: report.intern_id,
  company_id: report.company_id,
  internship_id: report.internship_id,
  report_period: report.report_period,
  duration_days: report.duration_days,
  expected_working_days: report.expected_working_days,
  expected_tasks: report.expected_tasks,
  completed_tasks: report.completed_tasks,
  pending_tasks: report.pending_tasks,
  delayed_tasks: report.delayed_tasks,
  completion_percentage: report.completion_percentage,
  total_hours: report.total_hours,
  overtime_hours: report.overtime_hours,
  sentiment_summary: report.sentiment_summary,
  evaluation_score: report.evaluation_score,
  overall_performance: report.overall_performance,
  created_at: report.createdAt,
  updated_at: report.updatedAt
});

const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const calculateTaskSummary = async (internshipId, startDate, endDate) => {
  const tasks = await Task.find({ 
    internship_id: internshipId,
    $or: [
      { assigned_date: { $gte: startDate, $lte: endDate } },
      { due_date: { $gte: startDate, $lte: endDate } },
      { completion_date: { $gte: startDate, $lte: endDate } }
    ]
  });
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const pendingTasks = tasks.filter(t => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
  const delayedTasks = tasks.filter(t => t.status === "DELAYED").length;
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100 : 0;
  
  return { totalTasks, completedTasks, pendingTasks, delayedTasks, completionPercentage };
};

const calculateDailySummary = async (internId, startDate, endDate) => {
  const dailyUpdates = await DailyUpdate.find({
    intern_id: internId,
    update_date: { $gte: startDate, $lte: endDate }
  });
  
  const totalUpdates = dailyUpdates.length;
  const totalHours = dailyUpdates.reduce((sum, update) => sum + update.hours_worked, 0);
  const averageHours = totalUpdates > 0 ? Math.round((totalHours / totalUpdates) * 100) / 100 : 0;
  
  return { totalUpdates, totalHours, averageHours };
};

const calculateSentimentSummary = async (internId, startDate, endDate) => {
  const dailyUpdates = await DailyUpdate.find({
    intern_id: internId,
    update_date: { $gte: startDate, $lte: endDate }
  }).select("_id");
  
  const updateIds = dailyUpdates.map(d => d._id);
  
  const sentiments = await Sentiment.find({ update_id: { $in: updateIds } });
  
  const positiveCount = sentiments.filter(s => s.sentiment === "POSITIVE").length;
  const negativeCount = sentiments.filter(s => s.sentiment === "NEGATIVE").length;
  const neutralCount = sentiments.filter(s => s.sentiment === "NEUTRAL").length;
  
  const averageScore = sentiments.length > 0 
    ? Math.round((sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length) * 100) / 100 
    : 0;
  
  return { positive_count: positiveCount, negative_count: negativeCount, neutral_count: neutralCount, average_score: averageScore };
};

const getEvaluationSummary = async (internId, startDate, endDate) => {
  const evaluations = await Evaluation.find({
    intern_id: internId,
    created_at: { $gte: startDate, $lte: endDate }
  });
  
  if (evaluations.length === 0) return null;
  
  const latestEvaluation = evaluations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  
  return {
    communication: latestEvaluation.communication,
    technical_skill: latestEvaluation.technical_skill,
    punctuality: latestEvaluation.punctuality,
    task_completion: latestEvaluation.task_completion,
    teamwork: latestEvaluation.teamwork,
    final_score: latestEvaluation.final_score
  };
};

const generateMonthlyReport = async (internId, month, year) => {
  const intern = await User.findById(internId);
  if (!intern) throw new Error("Intern not found");
  if (intern.role !== "INTERN") throw new Error("User is not an intern");
  
  const internships = await Internship.find({ intern_id: internId });
  if (internships.length === 0) throw new Error("No internships found for this intern");
  
  const internship = internships[0];
  if (!internship.company_id) throw new Error("Internship has no company");
  
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  const reportPeriod = `${firstDay.toLocaleString("default", { month: "long" })} ${year}`;
  const durationDays = (lastDay - firstDay) / (1000 * 60 * 60 * 24) + 1;
  const expectedWorkingDays = calculateWorkingDays(firstDay, lastDay);
  const expectedHours = expectedWorkingDays * EXPECTED_DAILY_HOURS;
  
  const company = await Company.findById(internship.company_id);
  if (!company) throw new Error("Company not found");
  
  const [taskSummary, dailySummary, sentimentSummary, evaluationSummary] = await Promise.all([
    calculateTaskSummary(internship._id, firstDay, lastDay),
    calculateDailySummary(internId, firstDay, lastDay),
    calculateSentimentSummary(internId, firstDay, lastDay),
    getEvaluationSummary(internId, firstDay, lastDay)
  ]);
  
  const totalHours = dailySummary.totalHours;
  const overtimeHours = Math.max(0, totalHours - expectedHours);
  
  const evaluationScore = evaluationSummary ? evaluationSummary.final_score : 0;
  
  let overallPerformance;
  if (taskSummary.completionPercentage >= 90 && evaluationScore >= 80) {
    overallPerformance = "EXCELLENT";
  } else if (taskSummary.completionPercentage >= 70 && evaluationScore >= 60) {
    overallPerformance = "GOOD";
  } else if (taskSummary.completionPercentage >= 50 && evaluationScore >= 40) {
    overallPerformance = "AVERAGE";
  } else if (taskSummary.completionPercentage >= 30) {
    overallPerformance = "BELOW_AVERAGE";
  } else {
    overallPerformance = "POOR";
  }
  
  const report = new Report({
    intern_id: internId,
    company_id: internship.company_id,
    internship_id: internship._id,
    report_period: reportPeriod,
    duration_days: durationDays,
    expected_working_days: expectedWorkingDays,
    expected_tasks: taskSummary.totalTasks,
    completed_tasks: taskSummary.completedTasks,
    pending_tasks: taskSummary.pendingTasks,
    delayed_tasks: taskSummary.delayedTasks,
    completion_percentage: taskSummary.completionPercentage,
    total_hours: totalHours,
    overtime_hours: overtimeHours,
    sentiment_summary: sentimentSummary,
    evaluation_score: evaluationScore,
    overall_performance: overallPerformance
  });
  
  await report.save();
  
  return getSafeReport(report);
};

const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    const report = await Report.findById(id)
      .populate("intern_id", "name email")
      .populate("company_id", "name")
      .populate("internship_id", "role_name");
    
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    
    if (authUser.role === "INTERN" && report.intern_id._id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied. This is not your report" });
    }
    
    if (authUser.role === "HR" || authUser.role === "MENTOR") {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: "No company assigned" });
      if (report.company_id.toString() !== companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied. Report belongs to another company" });
      }
    }
    
    res.json({ success: true, report: getSafeReport(report) });
  } catch (error) { next(error); }
};

const getReports = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    let query = {};
    
    if (authUser.role === "ADMIN") {
      if (req.query.company_id && mongoose.Types.ObjectId.isValid(req.query.company_id)) {
        query.company_id = req.query.company_id;
      }
    } else if (authUser.role === "HR") {
      if (!authUser.company_id) return res.status(404).json({ success: false, message: "No company assigned" });
      query.company_id = authUser.company_id;
    } else if (authUser.role === "MENTOR") {
      const internships = await Internship.find({ mentor_id: authUser._id }).select("intern_id");
      const internIds = internships.map(i => i.intern_id);
      query.intern_id = { $in: internIds };
    } else {
      query.intern_id = authUser._id;
    }
    
    if (req.query.year) {
      const year = parseInt(req.query.year);
      if (!isNaN(year) && year >= 2020 && year <= 2100) {
        query["$expr"] = { $regexMatch: { input: "$report_period", regex: year.toString() } };
      }
    }
    
    if (req.query.month) {
      const month = parseInt(req.query.month);
      if (!isNaN(month) && month >= 1 && month <= 12) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[month - 1];
        if (query["$expr"]) {
          query["$expr"].regex = `${monthName}`;
        } else {
          query["$expr"] = { $regexMatch: { input: "$report_period", regex: monthName } };
        }
      }
    }
    
    const reports = await Report.find(query)
      .populate("intern_id", "name email")
      .populate("company_id", "name")
      .populate("internship_id", "role_name")
      .sort({ created_at: -1 });
    
    res.json({ success: true, count: reports.length, reports: reports.map(getSafeReport) });
  } catch (error) { next(error); }
};

const getMyReports = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    if (authUser.role !== "INTERN") {
      return res.status(403).json({ success: false, message: "Only interns can view their own reports" });
    }
    
    const reports = await Report.find({ intern_id: authUser._id })
      .populate("intern_id", "name email")
      .populate("company_id", "name")
      .populate("internship_id", "role_name")
      .sort({ created_at: -1 });
    
    res.json({ success: true, count: reports.length, reports: reports.map(getSafeReport) });
  } catch (error) { next(error); }
};

const getMentorReports = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    if (authUser.role !== "MENTOR") {
      return res.status(403).json({ success: false, message: "Only mentors can view their reports" });
    }
    
    const internships = await Internship.find({ mentor_id: authUser._id }).select("intern_id");
    const internIds = internships.map(i => i.intern_id);
    
    const reports = await Report.find({ intern_id: { $in: internIds } })
      .populate("intern_id", "name email")
      .populate("company_id", "name")
      .populate("internship_id", "role_name")
      .sort({ created_at: -1 });
    
    res.json({ success: true, count: reports.length, reports: reports.map(getSafeReport) });
  } catch (error) { next(error); }
};

const regenerateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    if (authUser.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only admins can regenerate reports" });
    }
    
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    
    const firstDay = new Date();
    const lastDay = new Date();
    const month = firstDay.getMonth();
    const year = firstDay.getFullYear();
    
    const regeneratedReport = await generateMonthlyReport(report.intern_id, month, year);
    
    await Report.findByIdAndDelete(id);
    await Report.create(regeneratedReport);
    
    res.json({ success: true, message: "Report regenerated", report: regeneratedReport });
  } catch (error) { next(error); }
};

module.exports = {
  generateMonthlyReport,
  getReportById,
  getReports,
  getMyReports,
  getMentorReports,
  regenerateReport,
  getSafeReport,
  calculateWorkingDays,
  calculateTaskSummary,
  calculateDailySummary,
  calculateSentimentSummary,
  getEvaluationSummary
};