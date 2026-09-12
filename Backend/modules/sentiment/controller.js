const Sentiment = require("./model");
const DailyUpdate = require("../dailyUpdate/model");
const User = require("../auth/model");
const { analyzeSentiment } = require("../../services/sentimentClient");
const mongoose = require("mongoose");

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
    if (authUser.role === "INTERN" && sentiment.intern_id.toString() !== authUser._id.toString()) {
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
    } else {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: "No company assigned" });
      const companyIdStr = companyId.toString();
      const dailyUpdates = await DailyUpdate.find({ "intern_id.company_id": companyIdStr }).select("_id");
      const updateIds = dailyUpdates.map(d => d._id);
      query.update_id = { $in: updateIds };
    }
    if (req.query.sentiment) {
      if (["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(req.query.sentiment)) {
        query.sentiment = req.query.sentiment;
      }
    }
    const sentiments = await Sentiment.find(query).populate("update_id", "description").populate("intern_id", "name").sort({ created_at: -1 });
    res.json({ success: true, count: sentiments.length, sentiments: sentiments.map(getSafeSentiment) });
  } catch (error) { next(error); }
};

module.exports = {
  createSentiment,
  getSentimentByUpdateId,
  getAllSentiments,
  getSafeSentiment
};