const Task = require('./model');
const Internship = require('../internship/model');
const User = require('../auth/model');
const mongoose = require('mongoose');

const getSafeTask = (task) => ({
  id: task._id,
  internship_id: task.internship_id,
  intern_id: task.intern_id,
  mentor_id: task.mentor_id,
  task_name: task.task_name,
  description: task.description || '',
  assigned_date: task.assigned_date,
  task_date: task.task_date,
  due_date: task.due_date,
  status: task.status,
  progress: task.progress,
  hours_worked: task.hours_worked,
  completion_date: task.completion_date,
  created_at: task.createdAt,
  updated_at: task.updatedAt
});

// ---- BUSINESS RULE HELPERS (minimum required rules) ----
// task_date is the normalized working date (UTC midnight). The unique
// {intern_id, task_date} index enforces one task per intern per working date.
const normalizeTaskDate = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Monday-Friday are working days; Saturday/Sunday are off.
const isWorkingDay = (date) => {
  const day = new Date(date).getUTCDay();
  return day >= 1 && day <= 5;
};

const createTask = async (req, res, next) => {
  try {
    const { internship_id, intern_id, mentor_id, task_name, description, assigned_date, due_date, status, progress, hours_worked } = req.body;

    if (!internship_id) return res.status(400).json({ success: false, message: 'Internship ID required' });
    if (!intern_id) return res.status(400).json({ success: false, message: 'Intern ID required' });
    if (!mentor_id) return res.status(400).json({ success: false, message: 'Mentor ID required' });
    if (!task_name || !task_name.trim()) return res.status(400).json({ success: false, message: 'Task name required' });
    if (!assigned_date) return res.status(400).json({ success: false, message: 'Assigned date required' });

    if (!mongoose.Types.ObjectId.isValid(internship_id)) return res.status(400).json({ success: false, message: 'Invalid internship ID' });
    if (!mongoose.Types.ObjectId.isValid(intern_id)) return res.status(400).json({ success: false, message: 'Invalid intern ID' });
    if (!mongoose.Types.ObjectId.isValid(mentor_id)) return res.status(400).json({ success: false, message: 'Invalid mentor ID' });

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    // BUSINESS RULE: only ADMIN creates/assigns tasks. MENTOR cannot create or
    // assign tasks, and SUPERADMIN cannot mutate tasks.
    if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN can create tasks' });
    }

    const internship = await Internship.findById(internship_id);
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });

    const intern = await User.findById(intern_id);
    if (!intern) return res.status(404).json({ success: false, message: 'Intern not found' });
    if (intern.role !== 'INTERN') return res.status(400).json({ success: false, message: 'User is not an intern' });

    const mentor = await User.findById(mentor_id);
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });
    if (mentor.role !== 'MENTOR') return res.status(400).json({ success: false, message: 'User is not a mentor' });

    if (authUser.role === 'ADMIN' && authUser.company_id?.toString() !== internship.company_id.toString()) {
      return res.status(403).json({ success: false, message: 'Can only create tasks for your company' });
    }

    if (intern.company_id && intern.company_id.toString() !== internship.company_id.toString()) {
      return res.status(400).json({ success: false, message: 'Intern does not belong to this company' });
    }

    if (mentor.company_id && mentor.company_id.toString() !== internship.company_id.toString()) {
      return res.status(400).json({ success: false, message: 'Mentor does not belong to this company' });
    }

    if (internship.intern_id && internship.intern_id.toString() !== intern_id) {
      return res.status(400).json({ success: false, message: 'Intern does not belong to this internship' });
    }

    if (internship.mentor_id && internship.mentor_id.toString() !== mentor_id) {
      return res.status(400).json({ success: false, message: 'Mentor is not assigned to this internship' });
    }

    const assigned = new Date(assigned_date);
    if (isNaN(assigned.getTime())) return res.status(400).json({ success: false, message: 'Invalid assigned date' });

    const due = due_date ? new Date(due_date) : null;
    if (due && due < assigned) return res.status(400).json({ success: false, message: 'Due date cannot be before assigned date' });

    // BUSINESS RULE: one task per intern per working date (Mon-Fri only).
    // task_date is the UTC-midnight normalization keyed by the unique index.
    const taskDate = normalizeTaskDate(assigned);
    if (!isWorkingDay(taskDate)) {
      return res.status(400).json({ success: false, message: 'Tasks can only be assigned on working days (Monday-Friday). Saturday and Sunday are off.' });
    }

    // Idempotent duplicate guard; the unique {intern_id, task_date} index is
    // the race-safe backstop (surfaces as E11000 -> 409 below).
    const existingTask = await Task.findOne({ intern_id: intern_id, task_date: taskDate }).select('_id');
    if (existingTask) {
      return res.status(409).json({ success: false, message: 'This intern already has a task for this working date' });
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'];
    const taskStatus = status && validStatuses.includes(status) ? status : 'PENDING';
    const taskProgress = progress !== undefined ? Math.min(100, Math.max(0, progress)) : 0;
    const taskHours = hours_worked !== undefined ? Math.max(0, hours_worked) : 0;

    const task = new Task({
      internship_id,
      intern_id,
      mentor_id,
      task_name: task_name.trim(),
      description: description?.trim() || '',
      assigned_date: assigned,
      task_date: taskDate,
      due_date: due,
      status: taskStatus,
      progress: taskProgress,
      hours_worked: taskHours
    });

    try {
      await task.save();
    } catch (saveError) {
      // Duplicate working-date task raced past the pre-check (unique index).
      if (saveError.code === 11000) {
        return res.status(409).json({ success: false, message: 'This intern already has a task for this working date' });
      }
      throw saveError;
    }
    res.status(201).json({ success: true, message: 'Task created', task: getSafeTask(task) });
  } catch (error) { next(error); }
};

const getAllTasks = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    let query = {};

    if (authUser.role === 'SUPERADMIN') {
      if (req.query.company_id && mongoose.Types.ObjectId.isValid(req.query.company_id)) {
        const companyId = req.query.company_id;
        const internships = await Internship.find({ company_id: companyId }).select('_id');
        query.internship_id = { $in: internships.map(i => i._id) };
      }
    } else if (authUser.role === 'ADMIN' || authUser.role === 'MENTOR') {
      if (!authUser.company_id) {
        return res.status(404).json({ success: false, message: 'No company assigned' });
      }

      const companyId = authUser.company_id;
      const internships = await Internship.find({ company_id: companyId }).select('_id');
      query.internship_id = { $in: internships.map(i => i._id) };

      if (authUser.role === 'MENTOR' && req.query.my_assigned === 'true') {
        query.mentor_id = authUser._id;
      }
    } else {
      query.intern_id = authUser._id;
    }

    if (req.query.status && ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    const tasks = await Task.find(query)
      .populate('internship_id', 'role_name status')
      .populate('intern_id', 'name email')
      .populate('mentor_id', 'name email')
      .sort({ assigned_date: -1 });

    res.json({ success: true, count: tasks.length, tasks: tasks.map(getSafeTask) });
  } catch (error) { next(error); }
};

const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    const task = await Task.findById(id)
      .populate('internship_id', 'role_name status company_id')
      .populate('intern_id', 'name email company_id')
      .populate('mentor_id', 'name email company_id');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (authUser.role === 'SUPERADMIN') {
      // SUPERADMIN can view any task
    } else if (authUser.role === 'ADMIN' || authUser.role === 'MENTOR') {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: 'No company assigned' });

      const taskCompanyId = task.internship_id?.company_id?._id || task.intern_id?.company_id?._id;
      if (companyId.toString() !== taskCompanyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. Task belongs to another company' });
      }
    } else {
      if (task.intern_id?._id.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. This is not your task' });
      }
    }

    res.json({ success: true, task: getSafeTask(task) });
  } catch (error) { next(error); }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    // BUSINESS RULE: only ADMIN mutates tasks. MENTOR cannot update tasks and
    // SUPERADMIN cannot mutate tasks.
    if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN can update tasks' });
    }

    const task = await Task.findById(id)
      .populate('internship_id', 'company_id')
      .populate('intern_id', 'company_id')
      .populate('mentor_id', 'company_id');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (authUser.role === 'ADMIN' || authUser.role === 'MENTOR') {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: 'No company assigned' });

      const taskCompanyId = task.internship_id?.company_id?._id || task.intern_id?.company_id?._id;
      if (companyId.toString() !== taskCompanyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. Task belongs to another company' });
      }
    }

    const { task_name, description, assigned_date, due_date, status, progress, hours_worked } = req.body;

    if (task_name !== undefined) {
      if (!task_name.trim()) return res.status(400).json({ success: false, message: 'Task name cannot be empty' });
      if (task_name.trim().length > 200) return res.status(400).json({ success: false, message: 'Task name cannot exceed 200 characters' });
      task.task_name = task_name.trim();
    }

    if (description !== undefined) {
      task.description = description.trim();
    }

    if (assigned_date !== undefined) {
      const assigned = new Date(assigned_date);
      if (isNaN(assigned.getTime())) return res.status(400).json({ success: false, message: 'Invalid assigned date' });

      if (task.due_date && new Date(task.due_date) < assigned) {
        return res.status(400).json({ success: false, message: 'Due date cannot be before assigned date' });
      }

      // Keep task_date in sync with assigned_date (one task per intern per
      // working date; weekends rejected).
      const nextTaskDate = normalizeTaskDate(assigned);
      if (!isWorkingDay(nextTaskDate)) {
        return res.status(400).json({ success: false, message: 'Tasks can only be assigned on working days (Monday-Friday). Saturday and Sunday are off.' });
      }
      const taskInternId = task.intern_id?._id || task.intern_id;
      const clash = await Task.findOne({ intern_id: taskInternId, task_date: nextTaskDate, _id: { $ne: task._id } }).select('_id');
      if (clash) {
        return res.status(409).json({ success: false, message: 'This intern already has a task for this working date' });
      }

      task.assigned_date = assigned;
      task.task_date = nextTaskDate;
    }

    if (due_date !== undefined) {
      if (due_date) {
        const due = new Date(due_date);
        if (isNaN(due.getTime())) return res.status(400).json({ success: false, message: 'Invalid due date' });
        if (due < task.assigned_date) return res.status(400).json({ success: false, message: 'Due date cannot be before assigned date' });
        task.due_date = due;
      } else {
        task.due_date = null;
      }
    }

    if (status !== undefined) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'];
      if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
      task.status = status;
    }

    if (progress !== undefined) {
      const prog = Math.min(100, Math.max(0, progress));
      if (task.status === 'COMPLETED' && prog < 100) {
        return res.status(400).json({ success: false, message: 'Completed tasks must have 100% progress' });
      }
      task.progress = prog;
    }

    if (hours_worked !== undefined) {
      const hours = Math.max(0, hours_worked);
      task.hours_worked = hours;
    }

    try {
      await task.save();
    } catch (saveError) {
      // Duplicate working-date task raced past the pre-check (unique index).
      if (saveError.code === 11000) {
        return res.status(409).json({ success: false, message: 'This intern already has a task for this working date' });
      }
      throw saveError;
    }
    res.json({ success: true, message: 'Task updated', task: getSafeTask(task) });
  } catch (error) { next(error); }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    // BUSINESS RULE: only ADMIN deletes tasks; SUPERADMIN cannot mutate tasks.
    if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN can delete tasks' });
    }

    const task = await Task.findById(id)
      .populate('internship_id', 'company_id');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (authUser.role === 'ADMIN') {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: 'No company assigned' });

      const taskCompanyId = task.internship_id?.company_id?._id;
      if (companyId.toString() !== taskCompanyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. Task belongs to another company' });
      }
    }

    await Task.findByIdAndDelete(id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) { next(error); }
};

const getMyTasks = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    if (authUser.role !== 'INTERN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only interns can view their tasks' });
    }

    const tasks = await Task.find({ intern_id: authUser._id })
      .populate('internship_id', 'role_name status')
      .populate('mentor_id', 'name email')
      .sort({ assigned_date: -1 });

    res.json({ success: true, count: tasks.length, tasks: tasks.map(getSafeTask) });
  } catch (error) { next(error); }
};

const getMyAssignedTasks = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    if (authUser.role !== 'MENTOR') {
      return res.status(403).json({ success: false, message: 'Access denied. Only mentors can view their assigned tasks' });
    }

    const tasks = await Task.find({ mentor_id: authUser._id })
      .populate('internship_id', 'role_name status')
      .populate('intern_id', 'name email')
      .sort({ assigned_date: -1 });

    res.json({ success: true, count: tasks.length, tasks: tasks.map(getSafeTask) });
  } catch (error) { next(error); }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, progress, hours_worked } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED, DELAYED' });
    }

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    // BUSINESS RULES: ADMIN may update task status; an INTERN may update the
    // status/report (status, progress, hours) of their OWN task only. MENTOR
    // cannot update tasks, and SUPERADMIN cannot mutate tasks.
    const isIntern = authUser.role === 'INTERN';
    if (authUser.role !== 'ADMIN' && !isIntern) {
      return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN or the task owner (INTERN) can update task status' });
    }

    const task = await Task.findById(id)
      .populate('internship_id', 'company_id')
      .populate('intern_id', 'company_id')
      .populate('mentor_id', 'company_id');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (isIntern) {
      const taskInternId = task.intern_id?._id || task.intern_id;
      if (!taskInternId || taskInternId.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. This is not your task' });
      }
    } else {
      const companyId = authUser.company_id;
      if (!companyId) return res.status(404).json({ success: false, message: 'No company assigned' });

      const taskCompanyId = task.internship_id?.company_id?._id || task.intern_id?.company_id?._id;
      if (companyId.toString() !== taskCompanyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. Task belongs to another company' });
      }
    }

    task.status = status;

    if (progress !== undefined) {
      const prog = Math.min(100, Math.max(0, progress));
      if (status === 'COMPLETED' && prog < 100) {
        return res.status(400).json({ success: false, message: 'Completed tasks must have 100% progress' });
      }
      task.progress = prog;
    }

    if (hours_worked !== undefined) {
      task.hours_worked = Math.max(0, hours_worked);
    }

    await task.save();
    res.json({ success: true, message: `Task status updated to ${status}`, task: getSafeTask(task) });
  } catch (error) { next(error); }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getMyTasks,
  getMyAssignedTasks,
  updateTaskStatus,
  getSafeTask,
  normalizeTaskDate,
  isWorkingDay
};
