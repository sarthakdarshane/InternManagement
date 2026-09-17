const DailyUpdate = require("./model");
const Task = require("../task/model");
const Internship = require("../internship/model");
const User = require("../auth/model");
const mongoose = require("mongoose");

// Monday-Friday are working days; Saturday/Sunday are OFF.
const isWorkingDay = (date) => {
  const day = new Date(date).getUTCDay();
  return day >= 1 && day <= 5;
};

// Half-open [start, end) range covering one UTC calendar day.
const dayRange = (date) => {
  const d = new Date(date);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
};

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
    if (String(task.intern_id?._id || task.intern_id) !== String(authUser._id))
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

    // BUSINESS RULE: reports belong to working days. Saturday and Sunday are
    // OFF and must never create pending work or a new report.
    if (!isWorkingDay(update)) {
      return res.status(400).json({
        success: false,
        message:
          "Daily reports can only be submitted on working days (Monday-Friday). Saturday and Sunday are off.",
      });
    }

    // BUSINESS RULE: idempotent per intern per working date. Re-submitting or
    // editing the same day's report updates the existing record instead of
    // creating duplicates (so pending counts never inflate).
    const existingUpdate = await DailyUpdate.findOne({
      intern_id: authUser._id,
      update_date: dayRange(update),
    });
    if (existingUpdate) {
      existingUpdate.task_id = task_id;
      existingUpdate.description = description.trim();
      existingUpdate.progress = prog;
      existingUpdate.hours_worked = hours;
      existingUpdate.update_date = update;
      await existingUpdate.save();
      return res.json({
        success: true,
        message: "Daily update saved (existing report for this working day updated)",
        dailyUpdate: getSafeDailyUpdate(existingUpdate),
      });
    }

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
    } else if (authUser.role === "MENTOR") {
      // MENTOR: read-only observer scoped strictly to their OWN interns.
      const myInternships = await Internship.find({ mentor_id: authUser._id }).select("_id");
      const myTasks = await Task.find({
        internship_id: { $in: myInternships.map((i) => i._id) },
      }).select("_id");
      query.task_id = { $in: myTasks.map((t) => t._id) };
    } else if (authUser.role === "ADMIN") {
      // ADMIN: own company only (resolve internships first - internship_id is
      // a ref, so a nested company_id filter would never match).
      const companyId = authUser.company_id;
      if (!companyId)
        return res
          .status(404)
          .json({ success: false, message: "No company assigned" });
      const companyInternships = await Internship.find({
        company_id: companyId,
      }).select("_id");
      const companyTasks = await Task.find({
        internship_id: { $in: companyInternships.map((i) => i._id) },
      }).select("_id");
      query.task_id = { $in: companyTasks.map((t) => t._id) };
    } else {
      // SUPERADMIN has no daily-report management.
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });
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
    // Scope: INTERN -> own reports; MENTOR -> own interns only;
    // ADMIN -> own company only; SUPERADMIN -> no daily-report access.
    const taskInternId =
      dailyUpdate.intern_id && dailyUpdate.intern_id._id
        ? dailyUpdate.intern_id._id.toString()
        : dailyUpdate.intern_id
        ? dailyUpdate.intern_id.toString()
        : null;

    if (authUser.role === "INTERN") {
      if (taskInternId !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else if (authUser.role === "MENTOR") {
      const internship = await Internship.findOne({
        mentor_id: authUser._id,
        intern_id: taskInternId,
      }).select("_id");
      if (!internship) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else if (authUser.role === "ADMIN") {
      const taskId =
        dailyUpdate.task_id && dailyUpdate.task_id._id
          ? dailyUpdate.task_id._id
          : dailyUpdate.task_id;
      const task = await Task.findById(taskId).select("internship_id");
      const internship = task
        ? await Internship.findById(task.internship_id).select("company_id")
        : null;
      if (
        !authUser.company_id ||
        !internship ||
        internship.company_id?.toString() !== authUser.company_id.toString()
      ) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else {
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
    // BUSINESS RULE: only the INTERN who owns the report may edit it.
    if (authUser.role !== "INTERN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the intern can update their own daily report",
      });
    }
    const dailyUpdate = await DailyUpdate.findById(id);
    if (!dailyUpdate)
      return res
        .status(404)
        .json({ success: false, message: "Daily update not found" });
    if (dailyUpdate.intern_id.toString() !== authUser._id.toString()) {
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
    // SUPERADMIN has no daily-report management; ADMIN is limited to their own
    // company's reports.
    if (authUser.role !== "ADMIN")
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Only ADMIN can delete daily reports" });
    const dailyUpdate = await DailyUpdate.findById(id);
    if (!dailyUpdate)
      return res
        .status(404)
        .json({ success: false, message: "Daily update not found" });

    if (!authUser.company_id) {
      return res
        .status(404)
        .json({ success: false, message: "No company assigned" });
    }
    const task = await Task.findById(dailyUpdate.task_id).select("internship_id");
    const internship = task
      ? await Internship.findById(task.internship_id).select("company_id")
      : null;
    if (
      !internship ||
      internship.company_id?.toString() !== authUser.company_id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Report belongs to another company" });
    }

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
    // Scope: INTERN -> own tasks; MENTOR -> own interns only; ADMIN -> own
    // company only; SUPERADMIN -> no daily-report access.
    const ownerInternId = task.intern_id
      ? (task.intern_id._id || task.intern_id).toString()
      : null;

    if (authUser.role === "INTERN") {
      if (ownerInternId !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else if (authUser.role === "MENTOR") {
      const internship = await Internship.findById(task.internship_id).select(
        "mentor_id"
      );
      if (!internship || internship.mentor_id?.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else if (authUser.role === "ADMIN") {
      const internship = await Internship.findById(task.internship_id).select(
        "company_id"
      );
      if (
        !authUser.company_id ||
        !internship ||
        internship.company_id?.toString() !== authUser.company_id.toString()
      ) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else {
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
