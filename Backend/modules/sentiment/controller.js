const Sentiment = require("./model");
const DailyUpdate = require("../dailyUpdate/model");
const Task = require("../task/model");
const Internship = require("../internship/model");
const User = require("../auth/model");
const { analyzeSentiment } = require("../../services/sentimentClient");
const mongoose = require("mongoose");

// Resolve the set of daily-update ids visible to a non-INTERN, non-SUPERADMIN
// caller. MENTOR -> only their own interns; ADMIN -> only their own company.
const resolveScopedUpdateIds = async (authUser) => {
  if (authUser.role === "MENTOR") {
    const internships = await Internship.find({ mentor_id: authUser._id }).select("_id");
    const tasks = await Task.find({ internship_id: { $in: internships.map(i => i._id) } }).select("_id");
    const updates = await DailyUpdate.find({ task_id: { $in: tasks.map(t => t._id) } }).select("_id");
    return updates.map(u => u._id);
  }
  if (authUser.role === "ADMIN") {
    if (!authUser.company_id) return null;
    const internships = await Internship.find({ company_id: authUser.company_id }).select("_id");
    const tasks = await Task.find({ internship_id: { $in: internships.map(i => i._id) } }).select("_id");
    const updates = await DailyUpdate.find({ task_id: { $in: tasks.map(t => t._id) } }).select("_id");
    return updates.map(u => u._id);
  }
  return [];
};

const getSafeSentiment = (sentiment) => ({
  id: sentiment._id,
  update_id: sentiment.update_id,
  intern_id: sentiment.intern_id,
  text_content: sentiment.text_content,
  sentiment: sentiment.sentiment,
  score: sentiment.score,
  created_at: sentiment.createdAt,
  updated_at: sentiment.updatedAt
});

const createSentiment = async (req, res, next) => {
  try {
    const { update_id, text_content } = req.body;
    if (!update_id) return res.status(400).json({ success: false, message: "Update ID required" });
    if (!text_content || !text_content.trim()) return res.status(400).json({ success: false, message: "Text content required" });
    if (!mongoose.Types.ObjectId.isValid(update_id)) return res.status(400).json({ success: false, message: "Invalid update ID" });
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    // Sentiment is produced from the intern's OWN daily update text.
    if (authUser.role !== "INTERN") {
      return res.status(403).json({ success: false, message: "Only interns can submit sentiment for their own updates" });
    }
    // BUSINESS RULE: only the INTERN who owns the daily update can analyse it.
    const dailyUpdate = await DailyUpdate.findById(update_id);
    if (!dailyUpdate) return res.status(404).json({ success: false, message: "Daily update not found" });
    if (dailyUpdate.intern_id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const existingSentiment = await Sentiment.findOne({ update_id });
    if (existingSentiment) return res.status(409).json({ success: false, message: "Sentiment already exists for this update" });
    const sentimentResult = await analyzeSentiment(text_content);
    const sentiment = new Sentiment({
      update_id,
      intern_id: authUser._id,
      text_content: text_content.trim(),
      sentiment: sentimentResult.sentiment,
      score: sentimentResult.score
    });
    await sentiment.save();
    res.status(201).json({ success: true, message: "Sentiment created", sentiment: getSafeSentiment(sentiment) });
  } catch (error) { next(error); }
};

const getSentimentByUpdateId = async (req, res, next) => {
  try {
    const { updateId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(updateId)) return res.status(400).json({ success: false, message: "Invalid update ID" });
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    const sentiment = await Sentiment.findOne({ update_id: updateId });
    if (!sentiment) return res.status(404).json({ success: false, message: "Sentiment not found" });

    // INTERN -> own only; MENTOR -> own interns only; ADMIN -> own company only;
    // SUPERADMIN -> no sentiment management.
    if (authUser.role === "INTERN") {
      if (sentiment.intern_id.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else if (authUser.role === "MENTOR" || authUser.role === "ADMIN") {
      const scopedUpdateIds = await resolveScopedUpdateIds(authUser);
      if (scopedUpdateIds === null) {
        return res.status(404).json({ success: false, message: "No company assigned" });
      }
      const allowed = scopedUpdateIds.some((uid) => uid.toString() === updateId.toString());
      if (!allowed) return res.status(403).json({ success: false, message: "Access denied" });
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.json({ success: true, sentiment: getSafeSentiment(sentiment) });
  } catch (error) { next(error); }
};

const getAllSentiments = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });
    let query = {};
    if (authUser.role === "INTERN") {
      query.intern_id = authUser._id;
    } else if (authUser.role === "MENTOR" || authUser.role === "ADMIN") {
      const scopedUpdateIds = await resolveScopedUpdateIds(authUser);
      if (scopedUpdateIds === null) return res.status(404).json({ success: false, message: "No company assigned" });
      query.update_id = { $in: scopedUpdateIds };
    } else {
      // SUPERADMIN has no sentiment management.
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (req.query.sentiment) {
      if (["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(req.query.sentiment)) {
        query.sentiment = req.query.sentiment;
      }
    }
    const sentiments = await Sentiment.find(query).populate("update_id", "description").populate("intern_id", "name").sort({ createdAt: -1 });
    res.json({ success: true, count: sentiments.length, sentiments: sentiments.map(getSafeSentiment) });
  } catch (error) { next(error); }
};

const getMySentiment = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: "User not found" });

    if (authUser.role !== "INTERN") {
      return res.status(403).json({ success: false, message: "Only interns can view their own sentiment data" });
    }

    const sentiments = await Sentiment.find({ intern_id: authUser._id }).sort({ createdAt: -1 });

    const positive = sentiments.filter(s => s.sentiment === "POSITIVE").length;
    const negative = sentiments.filter(s => s.sentiment === "NEGATIVE").length;
    const neutral = sentiments.filter(s => s.sentiment === "NEUTRAL").length;
    const averageScore = sentiments.length > 0
      ? Math.round((sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length) * 100) / 100
      : 0;

    res.json({
      success: true,
      sentiment: {
        positive,
        negative,
        neutral,
        average_score: averageScore,
        total: sentiments.length
      }
    });
  } catch (error) { next(error); }
};

module.exports = {
  createSentiment,
  getSentimentByUpdateId,
  getAllSentiments,
  getMySentiment,
  getSafeSentiment
};