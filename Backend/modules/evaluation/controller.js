const Evaluation = require("./model");
const Task = require("../task/model");
const DailyUpdate = require("../dailyUpdate/model");
const Sentiment = require("../sentiment/model");
const Internship = require("../internship/model");
const User = require("../auth/model");
const mongoose = require("mongoose");

const getSafeEvaluation = (evaluation) => ({
  id: evaluation._id,
  intern_id: evaluation.intern_id,
  mentor_id: evaluation.mentor_id,
  internship_id: evaluation.internship_id,
  evaluation_period: evaluation.evaluation_period,
  communication: evaluation.communication,
  technical_skill: evaluation.technical_skill,
  punctuality: evaluation.punctuality,
  task_completion: evaluation.task_completion,
  teamwork: evaluation.teamwork,
  comments: evaluation.comments,
  final_score: evaluation.final_score,
  created_at: evaluation.createdAt,
  updated_at: evaluation.updatedAt
});

const createEvaluation = async (req, res, next) => {
  try {
    const { intern_id, internship_id, evaluation_period, communication, technical_skill, punctuality, task_completion, teamwork, comments } = req.body;
    
    if (!intern_id) return res.status(400).json({ success: false, message: "Intern ID required" });
    if (!internship_id) return res.status(400).json({ success: false, message: "Internship ID required" });
    if (!evaluation_period || !evaluation_period.trim()) return res.status(400).json({ success: false, message: "Evaluation period required" });
    if (communication === undefined) return res.status(400).json({ success: false, message: "Communication score required" });
    if (technical_skill === undefined) return res.status(400).json({ success: false, message: "Technical skill score required" });
    if (punctuality === undefined) return res.status(400).json({ success: false, message: "Punctuality score required" });
    if (task_completion === undefined) return res.status(400).json({ success: false, message: "Task completion score required" });
    if (teamwork === undefined) return res.status(400).json({ success: false, message: "Teamwork score required" });
    
    if (!mongoose.Types.ObjectId.isValid(intern_id)) return res.status(400).json({ success: false, message: "Invalid intern ID" });
    if (!mongoose.Types.ObjectId.isValid(internship_id)) return res.status(400).json({ success: false, message: "Invalid internship ID" });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    if (authUser.role !== "MENTOR" && authUser.role !== "SUPERADMIN") {
      return res.status(403).json({ success: false, message: "Only mentors or SUPERADMIN can create evaluations" });
    }
    
    const intern = await User.findById(intern_id);
    if (!intern) return res.status(404).json({ success: false, message: "Intern not found" });
    if (intern.role !== "INTERN") return res.status(400).json({ success: false, message: "User is not an intern" });
    
    const internship = await Internship.findById(internship_id)
      .populate("company_id", "_id")
      .populate("intern_id", "_id")
      .populate("mentor_id", "_id");
    
    if (!internship) return res.status(404).json({ success: false, message: "Internship not found" });
    
    if (String(internship.intern_id?._id || internship.intern_id) !== String(intern_id)) {
      return res.status(400).json({ success: false, message: "Intern is not assigned to this internship" });
    }
    
    if (authUser.role === "MENTOR") {
      if (!internship.mentor_id || String(internship.mentor_id?._id || internship.mentor_id) !== String(authUser._id)) {
        return res.status(403).json({ success: false, message: "You are not the mentor for this intern" });
      }
    }
    
    if (authUser.role === "SUPERADMIN") {
      const companyId = authUser.company_id;
      if (companyId && internship.company_id && internship.company_id._id.toString() !== companyId.toString()) {
        return res.status(403).json({ success: false, message: "Can only evaluate interns from your company" });
      }
    }
    
    const scores = { communication, technical_skill, punctuality, task_completion, teamwork };
    for (const [key, value] of Object.entries(scores)) {
      if (value < 0 || value > 100) {
        return res.status(400).json({ success: false, message: `${key} must be between 0 and 100` });
      }
    }
    
    const existingEvaluation = await Evaluation.findOne({ 
      intern_id, 
      internship_id, 
      evaluation_period: evaluation_period.trim() 
    });
    
    if (existingEvaluation) {
      return res.status(409).json({ success: false, message: "Evaluation already exists for this intern, internship, and period" });
    }
    
    const evaluation = new Evaluation({
      intern_id,
      mentor_id: authUser._id,
      internship_id,
      evaluation_period: evaluation_period.trim(),
      communication,
      technical_skill,
      punctuality,
      task_completion,
      teamwork,
      comments: comments ? comments.trim() : ""
    });
    
    await evaluation.save();
    
    const finalScore = calculateFinalScore(evaluation);
    evaluation.final_score = finalScore;
    await evaluation.save();
    
    res.status(201).json({ success: true, message: "Evaluation created", evaluation: getSafeEvaluation(evaluation) });
  } catch (error) { next(error); }
};

const calculateFinalScore = (evaluation) => {
  const weights = {
    communication: 0.20,
    technical_skill: 0.25,
    punctuality: 0.15,
    task_completion: 0.25,
    teamwork: 0.15
  };
  
  const finalScore = 
    (evaluation.communication * weights.communication) +
    (evaluation.technical_skill * weights.technical_skill) +
    (evaluation.punctuality * weights.punctuality) +
    (evaluation.task_completion * weights.task_completion) +
    (evaluation.teamwork * weights.teamwork);
  
  return Math.round(finalScore * 100) / 100;
};

const getAllEvaluations = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    let query = {};
    
    if (authUser.role === "MENTOR") {
      query.mentor_id = authUser._id;
    } else if (authUser.role === "ADMIN") {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: "No company assigned" });
      const internships = await Internship.find({ company_id: companyId }).select("_id");
      const internshipIds = internships.map(i => i._id);
      query.internship_id = { $in: internshipIds };
    } else if (authUser.role === "INTERN") {
      query.intern_id = authUser._id;
    }
    
    if (req.query.intern_id && mongoose.Types.ObjectId.isValid(req.query.intern_id)) {
      query.intern_id = req.query.intern_id;
    }
    
    if (req.query.internship_id && mongoose.Types.ObjectId.isValid(req.query.internship_id)) {
      query.internship_id = req.query.internship_id;
    }
    
    if (req.query.evaluation_period) {
      query.evaluation_period = req.query.evaluation_period;
    }
    
    const evaluations = await Evaluation.find(query)
      .populate("intern_id", "name email")
      .populate("mentor_id", "name email")
      .populate("internship_id", "role_name")
      .sort({ created_at: -1 });
    
    res.json({ success: true, count: evaluations.length, evaluations: evaluations.map(getSafeEvaluation) });
  } catch (error) { next(error); }
};

const getEvaluationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    const evaluation = await Evaluation.findById(id)
      .populate("intern_id", "name email")
      .populate("mentor_id", "name email")
      .populate("internship_id", "role_name");
    
    if (!evaluation) return res.status(404).json({ success: false, message: "Evaluation not found" });
    
    if (authUser.role === "INTERN" && evaluation.intern_id._id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied. This is not your evaluation" });
    }
    
    if (authUser.role === "MENTOR" && evaluation.mentor_id._id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied. You did not create this evaluation" });
    }
    
    res.json({ success: true, evaluation: getSafeEvaluation(evaluation) });
  } catch (error) { next(error); }
};

const updateEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    if (authUser.role !== "MENTOR" && authUser.role !== "SUPERADMIN") {
      return res.status(403).json({ success: false, message: "Only mentors or SUPERADMIN can update evaluations" });
    }
    
    const evaluation = await Evaluation.findById(id);
    if (!evaluation) return res.status(404).json({ success: false, message: "Evaluation not found" });
    
    if (authUser.role === "MENTOR" && evaluation.mentor_id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: "You did not create this evaluation" });
    }
    
    const { communication, technical_skill, punctuality, task_completion, teamwork, comments } = req.body;
    
    if (communication !== undefined) {
      if (communication < 0 || communication > 100) return res.status(400).json({ success: false, message: "Communication must be between 0 and 100" });
      evaluation.communication = communication;
    }
    if (technical_skill !== undefined) {
      if (technical_skill < 0 || technical_skill > 100) return res.status(400).json({ success: false, message: "Technical skill must be between 0 and 100" });
      evaluation.technical_skill = technical_skill;
    }
    if (punctuality !== undefined) {
      if (punctuality < 0 || punctuality > 100) return res.status(400).json({ success: false, message: "Punctuality must be between 0 and 100" });
      evaluation.punctuality = punctuality;
    }
    if (task_completion !== undefined) {
      if (task_completion < 0 || task_completion > 100) return res.status(400).json({ success: false, message: "Task completion must be between 0 and 100" });
      evaluation.task_completion = task_completion;
    }
    if (teamwork !== undefined) {
      if (teamwork < 0 || teamwork > 100) return res.status(400).json({ success: false, message: "Teamwork must be between 0 and 100" });
      evaluation.teamwork = teamwork;
    }
    if (comments !== undefined) {
      if (comments.length > 2000) return res.status(400).json({ success: false, message: "Comments too long" });
      evaluation.comments = comments.trim();
    }
    
    const finalScore = calculateFinalScore(evaluation);
    evaluation.final_score = finalScore;
    
    await evaluation.save();
    
    res.json({ success: true, message: "Evaluation updated", evaluation: getSafeEvaluation(evaluation) });
  } catch (error) { next(error); }
};

const deleteEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    if (authUser.role !== "SUPERADMIN" && authUser.role !== "MENTOR") {
      return res.status(403).json({ success: false, message: "Only SUPERADMIN or mentors can delete evaluations" });
    }
    
    const evaluation = await Evaluation.findById(id);
    if (!evaluation) return res.status(404).json({ success: false, message: "Evaluation not found" });
    
    if (authUser.role === "MENTOR" && evaluation.mentor_id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: "You did not create this evaluation" });
    }
    
    await Evaluation.findByIdAndDelete(id);
    res.json({ success: true, message: "Evaluation deleted" });
  } catch (error) { next(error); }
};

const getPerformance = async (req, res, next) => {
  try {
    const { internId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(internId)) return res.status(400).json({ success: false, message: "Invalid intern ID" });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    
    const intern = await User.findById(internId);
    if (!intern) return res.status(404).json({ success: false, message: "Intern not found" });
    if (intern.role !== "INTERN") return res.status(400).json({ success: false, message: "User is not an intern" });
    
    if (authUser.role === "INTERN" && internId !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied. You can only view your own performance" });
    }
    
    if (authUser.role === "MENTOR") {
      const internInternships = await Internship.find({ intern_id: internId }).select("mentor_id internship_id");
      const isMentor = internInternships.some(internship => 
        internship.mentor_id && internship.mentor_id.toString() === authUser._id.toString()
      );
      if (!isMentor) {
        return res.status(403).json({ success: false, message: "You are not the mentor for this intern" });
      }
    }
    
    if (authUser.role === "ADMIN") {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: "No company assigned" });
      const internCompanies = await User.findById(internId).select("company_id");
      if (internCompanies.company_id && internCompanies.company_id.toString() !== companyId.toString()) {
        return res.status(403).json({ success: false, message: "This intern is not from your company" });
      }
    }
    
    const performance = await calculatePerformance(internId, authUser);
    
    res.json({ success: true, performance });
  } catch (error) { next(error); }
};

const calculatePerformance = async (internId, authUser) => {
  const intern = await User.findById(internId);
  if (!intern) throw new Error("Intern not found");
  
  const internships = await Internship.find({ intern_id: internId });
  
  let totalTaskPerformance = 0;
  let taskCount = 0;
  let totalDailyActivity = 0;
  let dailyUpdateCount = 0;
  let sentimentSummary = { positive_count: 0, negative_count: 0, neutral_count: 0, average_score: 0 };
  let sentimentCount = 0;
  
  const evaluations = await Evaluation.find({ intern_id: internId });
  let evaluationPerformance = 0;
  let evaluationCount = 0;
  
  for (const internship of internships) {
    const tasks = await Task.find({ internship_id: internship._id, intern_id: internId });
    
    for (const task of tasks) {
      taskCount++;
      totalTaskPerformance += task.progress;
      
      const dailyUpdates = await DailyUpdate.find({ task_id: task._id, intern_id: internId });
      
      for (const update of dailyUpdates) {
        dailyUpdateCount++;
        totalDailyActivity += update.progress;
        
        const sentiments = await Sentiment.find({ update_id: update._id });
        for (const sentiment of sentiments) {
          sentimentCount++;
          if (sentiment.sentiment === "POSITIVE") sentimentSummary.positive_count++;
          else if (sentiment.sentiment === "NEGATIVE") sentimentSummary.negative_count++;
          else sentimentSummary.neutral_count++;
          sentimentSummary.average_score += sentiment.score;
        }
      }
    }
  }
  
  if (sentimentCount > 0) {
    sentimentSummary.average_score = Math.round((sentimentSummary.average_score / sentimentCount) * 100) / 100;
  }
  
  const avgTaskProgress = taskCount > 0 ? Math.round((totalTaskPerformance / taskCount) * 100) / 100 : 0;
  const avgDailyActivity = dailyUpdateCount > 0 ? Math.round((totalDailyActivity / dailyUpdateCount) * 100) / 100 : 0;
  
  for (const evaluation of evaluations) {
    evaluationCount++;
    evaluationPerformance += evaluation.final_score;
  }
  
  const avgEvaluationScore = evaluationCount > 0 ? Math.round((evaluationPerformance / evaluationCount) * 100) / 100 : 0;
  
  const taskWeight = 0.30;
  const activityWeight = 0.20;
  const evaluationWeight = 0.40;
  const sentimentWeight = 0.10;
  
  const taskScore = avgTaskProgress * taskWeight;
  const activityScore = avgDailyActivity * activityWeight;
  const evaluationScore = avgEvaluationScore * evaluationWeight;
  const sentimentScore = (sentimentSummary.average_score * 100) * sentimentWeight;
  
  const totalPerformance = Math.round((taskScore + activityScore + evaluationScore + sentimentScore) * 100) / 100;
  
  let overallPerformance;
  if (totalPerformance >= 90) overallPerformance = "EXCELLENT";
  else if (totalPerformance >= 80) overallPerformance = "GOOD";
  else if (totalPerformance >= 60) overallPerformance = "AVERAGE";
  else if (totalPerformance >= 40) overallPerformance = "BELOW_AVERAGE";
  else overallPerformance = "POOR";
  
  return {
    intern_id: internId,
    intern_name: intern.name,
    total_tasks: taskCount,
    completed_tasks: await Task.countDocuments({ intern_id: internId, status: "COMPLETED" }),
    average_task_progress: avgTaskProgress,
    total_daily_updates: dailyUpdateCount,
    average_daily_activity: avgDailyActivity,
    total_hours_worked: await DailyUpdate.aggregate([
      { $match: { intern_id: new mongoose.Types.ObjectId(internId) } },
      { $group: { _id: null, total: { $sum: "$hours_worked" } } }
    ]).then(result => result.length > 0 ? result[0].total : 0),
    evaluation_count: evaluationCount,
    average_evaluation_score: avgEvaluationScore,
    latest_evaluation: evaluations.length > 0 ? evaluations.sort((a, b) => b.createdAt - a.createdAt)[0] : null,
    sentiment_summary: sentimentSummary,
    overall_score: totalPerformance,
    overall_performance: overallPerformance,
    calculated_at: new Date()
  };
};

const getPendingEvaluations = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const query = { status: 'PENDING' };

    if (authUser.role === 'MENTOR') {
      const companyId = authUser.company_id;
      if (!companyId) {
        return res.status(404).json({ success: false, message: 'No company assigned' });
      }

      const internIds = await Internship.find({ company_id: companyId })
        .distinct('intern_id');

      if (internIds.length === 0) {
        return res.json({ success: true, pending: 0 });
      }

      query.intern_id = { $in: internIds };
    }

    const pendingCount = await Evaluation.countDocuments(query);
    res.json({ success: true, pending: pendingCount });
  } catch (error) { next(error); }
};

const getMyEvaluations = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    if (authUser.role !== 'INTERN') {
      return res.status(403).json({ success: false, message: 'Only interns can view their own evaluations' });
    }

    const evaluations = await Evaluation.find({ intern_id: authUser._id })
      .populate('intern_id', 'name email')
      .populate('mentor_id', 'name email')
      .populate('internship_id', 'role_name')
      .sort({ created_at: -1 });

    res.json({ success: true, count: evaluations.length, evaluations: evaluations.map(getSafeEvaluation) });
  } catch (error) { next(error); }
};

const getMyPerformance = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    if (authUser.role !== 'INTERN') {
      return res.status(403).json({ success: false, message: 'Only interns can view their own performance' });
    }

    const performance = await calculatePerformance(authUser._id.toString(), authUser);

    res.json({ success: true, performance });
  } catch (error) { next(error); }
};

module.exports = {
  createEvaluation,
  getAllEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  getPerformance,
  getMyPerformance,
  getMyEvaluations,
  getSafeEvaluation,
  calculateFinalScore,
  calculatePerformance,
  getPendingEvaluations
};
