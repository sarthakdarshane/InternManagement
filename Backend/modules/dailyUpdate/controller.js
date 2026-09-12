const DailyUpdate = require("./model");
const Task = require("../task/model");
const User = require("../auth/model");
const mongoose = require("mongoose");

const getSafeDailyUpdate = (update) => ({
  id: update._id,
  task_id: update.task_id,
  intern_id: update.intern_id,
  update_date: update.update_date,
  description: update.description,
  progress: update.progress,
  hours_worked: update.hours_worked,
  created_at: update.createdAt,
  updated_at: update.updatedAt,
});

const createDailyUpdate = async (req, res, next) => {
  try {
    const { task_id, update_date, description, progress, hours_worked } =
      req.body;
    if (!task_id)
      return res
        .status(400)
        .json({ success: false, message: "Task ID required" });
    if (!update_date)
      return res
        .status(400)
        .json({ success: false, message: "Update date required" });
    if (!description || !description.trim())
      return res
        .status(400)
        .json({ success: false, message: "Description required" });
    if (progress === undefined)
      return res
        .status(400)
        .json({ success: false, message: "Progress required" });
    if (hours_worked === undefined)
      return res
        .status(400)
        .json({ success: false, message: "Hours worked required" });
    if (!mongoose.Types.ObjectId.isValid(task_id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid task ID" });
    const authUser = await User.findById(req.user.user_id);
    if (!authUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (authUser.role !== "INTERN")
      return res
        .status(403)
        .json({
          success: false,
          message: "Only interns can create daily updates",
        });
    const task = await Task.findById(task_id)
      .populate("internship_id", "company_id")
      .populate("intern_id", "company_id");
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    if (task.intern_id.toString() !== authUser._id.toString())
      return res
        .status(403)
        .json({ success: false, message: "This is not your task" });
    const intern = await User.findById(authUser._id);
    if (!intern)
      return res
        .status(404)
        .json({ success: false, message: "Intern not found" });
    if (
      intern.company_id &&
      task.internship_id &&
      task.internship_id.company_id
    ) {
      if (
        intern.company_id.toString() !==
        task.internship_id.company_id._id.toString()
      )
        return res
          .status(400)
          .json({
            success: false,
            message: "Intern does not belong to this company",
          });
    }
    const update = new Date(update_date);
    if (isNaN(update.getTime()))
      return res
        .status(400)
        .json({ success: false, message: "Invalid update date" });
    const prog = Math.min(100, Math.max(0, progress));
    const hours = Math.max(0, hours_worked);
    const dailyUpdate = new DailyUpdate({
      task_id,
      intern_id: authUser._id,
      update_date: update,
      description: description.trim(),
      progress: prog,
      hours_worked: hours,
    });
    await dailyUpdate.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Daily update created",
        dailyUpdate: getSafeDailyUpdate(dailyUpdate),
      });
  } catch (error) {
    next(error);
  }
};

const getAllDailyUpdates = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    let query = {};
    if (authUser.role === "INTERN") {
      query.intern_id = authUser._id;
    } else {
      const companyId = authUser.company_id;
      if (!companyId)
        return res
          .status(404)
          .json({ success: false, message: "No company assigned" });
      const companyIdStr = companyId.toString();
      const tasks = await Task.find({
        "internship_id.company_id": companyIdStr,
      }).select("_id");
      const taskIds = tasks.map((t) => t._id);
      query.task_id = { $in: taskIds };
    }
    if (req.query.start_date) {
      const startDate = new Date(req.query.start_date);
      if (!isNaN(startDate.getTime())) {
        if (query.update_date) {
          query.update_date.$gte = startDate;
        } else {
          query.update_date = { $gte: startDate };
        }
      }
    }
    if (req.query.end_date) {
      const endDate = new Date(req.query.end_date);
      if (!isNaN(endDate.getTime())) {
        if (query.update_date) {
          query.update_date.$lte = endDate;
        } else {
          query.update_date = { $lte: endDate };
        }
      }
    }
    const dailyUpdates = await DailyUpdate.find(query)
      .populate("task_id", "task_name status")
      .populate("intern_id", "name email")
      .sort({ update_date: -1 });
    res.json({
      success: true,
      count: dailyUpdates.length,
      dailyUpdates: dailyUpdates.map(getSafeDailyUpdate),
    });
  } catch (error) {
    next(error);
  }
};

const getDailyUpdateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });
    const authUser = await User.findById(req.user.user_id);
    if (!authUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    const dailyUpdate = await DailyUpdate.findById(id)
      .populate("task_id", "task_name status")
      .populate("intern_id", "name email");
    if (!dailyUpdate)
      return res
        .status(404)
        .json({ success: false, message: "Daily update not found" });
    if (
      authUser.role === "INTERN" &&
      dailyUpdate.intern_id &&
      dailyUpdate.intern_id._id.toString() !== authUser._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.json({ success: true, dailyUpdate: getSafeDailyUpdate(dailyUpdate) });
  } catch (error) {
    next(error);
  }
};

const updateDailyUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });
    const authUser = await User.findById(req.user.user_id);
    if (!authUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    const dailyUpdate = await DailyUpdate.findById(id);
    if (!dailyUpdate)
      return res
        .status(404)
        .json({ success: false, message: "Daily update not found" });
    if (
      authUser.role === "INTERN" &&
      dailyUpdate.intern_id.toString() !== authUser._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const { description, progress, hours_worked } = req.body;
    if (description !== undefined) {
      if (!description.trim())
        return res
          .status(400)
          .json({ success: false, message: "Description cannot be empty" });
      if (description.length > 5000)
        return res
          .status(400)
          .json({ success: false, message: "Description too long" });
      dailyUpdate.description = description.trim();
    }
    if (progress !== undefined)
      dailyUpdate.progress = Math.min(100, Math.max(0, progress));
    if (hours_worked !== undefined)
      dailyUpdate.hours_worked = Math.max(0, hours_worked);
    await dailyUpdate.save();
    res.json({
      success: true,
      message: "Daily update updated",
      dailyUpdate: getSafeDailyUpdate(dailyUpdate),
    });
  } catch (error) {
    next(error);
  }
};

const deleteDailyUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });
    const authUser = await User.findById(req.user.user_id);
    if (!authUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (authUser.role !== "ADMIN" && authUser.role !== "HR")
      return res
        .status(403)
        .json({ success: false, message: "Only admins or HR can delete" });
    const dailyUpdate = await DailyUpdate.findById(id);
    if (!dailyUpdate)
      return res
        .status(404)
        .json({ success: false, message: "Daily update not found" });
    await DailyUpdate.findByIdAndDelete(id);
    res.json({ success: true, message: "Daily update deleted" });
  } catch (error) {
    next(error);
  }
};

const getMyDailyUpdates = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    if (authUser.role !== "INTERN")
      return res
        .status(403)
        .json({
          success: false,
          message: "Only interns can view their updates",
        });
    const dailyUpdates = await DailyUpdate.find({ intern_id: authUser._id })
      .populate("task_id", "task_name status")
      .sort({ update_date: -1 });
    res.json({
      success: true,
      count: dailyUpdates.length,
      dailyUpdates: dailyUpdates.map(getSafeDailyUpdate),
    });
  } catch (error) {
    next(error);
  }
};

const getDailyUpdatesByTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid task ID" });
    const authUser = await User.findById(req.user.user_id);
    if (!authUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    const task = await Task.findById(taskId).populate(
      "intern_id",
      "company_id",
    );
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    if (
      authUser.role === "INTERN" &&
      task.intern_id &&
      task.intern_id._id.toString() !== authUser._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const dailyUpdates = await DailyUpdate.find({ task_id: taskId })
      .populate("task_id", "task_name status")
      .populate("intern_id", "name email")
      .sort({ update_date: -1 });
    res.json({
      success: true,
      count: dailyUpdates.length,
      dailyUpdates: dailyUpdates.map(getSafeDailyUpdate),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDailyUpdate,
  getAllDailyUpdates,
  getDailyUpdateById,
  updateDailyUpdate,
  deleteDailyUpdate,
  getMyDailyUpdates,
  getDailyUpdatesByTask,
  getSafeDailyUpdate,
};
