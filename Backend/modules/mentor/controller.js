const Internship = require('../internship/model');
const Task = require('../task/model');
const DailyUpdate = require('../dailyUpdate/model');
const Sentiment = require('../sentiment/model');
const Evaluation = require('../evaluation/model');
const Report = require('../report/model');
const User = require('../auth/model');
const { calculatePerformance } = require('../evaluation/controller');

const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

// Working day helper: Monday-Friday only; Saturday/Sunday are OFF.
const isWorkingDay = (d) => {
  const day = new Date(d).getUTCDay();
  return day >= 1 && day <= 5;
};

// Derive (never store) the pending/missed daily count for an intern:
// for every working day from the internship start date up to today,
// any day WITHOUT a COMPLETED daily task counts as pending/missed.
// Weekends never count, so interns are never penalized for Saturday/Sunday.
const derivePendingDailyCount = async (internId, internship) => {
  const start = internship.start_date ? new Date(internship.start_date) : null;
  if (!start) return 0;
  const today = new Date();
  const end = internship.end_date && new Date(internship.end_date) < today ? new Date(internship.end_date) : today;
  const startDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  if (endDate < startDate) return 0;

  const completedTasks = await Task.find({ intern_id: internId, status: 'COMPLETED' }).select('task_date assigned_date');
  const completedDays = new Set(completedTasks.map((t) => dateKey(t.task_date || t.assigned_date)));

  let pending = 0;
  for (const d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!isWorkingDay(d)) continue; // weekend: no task, no pending count
    if (!completedDays.has(dateKey(d))) pending++;
  }
  return pending;
};

const overallStatusFor = (internship, pendingTasks, pendingDailyCount) => {
  if (!internship) return 'NO_INTERNSHIP';
  if (internship.status === 'COMPLETED') return 'INTERNSHIP_COMPLETED';
  if (internship.status === 'CANCELLED') return 'INTERNSHIP_CANCELLED';
  if (internship.status === 'PLANNED') return 'AWAITING_START';
  if (pendingDailyCount > 0) return 'BEHIND';
  if (pendingTasks > 0) return 'IN_PROGRESS';
  return 'ON_TRACK';
};
// ONE-CLICK MENTOR DASHBOARD:
// a single request returning the consolidated status of ALL of the mentor's
// own interns (and only their own interns). No per-intern follow-up calls.
const getDashboardSummary = async (req, res, next) => {
  try {
    const mentorId = req.user.user_id;

    const internships = await Internship.find({ mentor_id: mentorId, status: { $in: ['PLANNED', 'ACTIVE', 'COMPLETED'] } })
      .populate('intern_id', 'name email role company_id')
      .populate('company_id', 'name')
      .sort({ createdAt: -1 });

    const mentor = await User.findById(mentorId).select('name email company_id');

    // One entry per intern (prefer the ACTIVE internship, else the latest)
    const byIntern = new Map();
    for (const internship of internships) {
      if (!internship.intern_id) continue;
      const key = String(internship.intern_id._id);
      const existing = byIntern.get(key);
      if (!existing) { byIntern.set(key, internship); continue; }
      if (internship.status === 'ACTIVE' && existing.status !== 'ACTIVE') byIntern.set(key, internship);
    }

    const interns = [];
    for (const internship of byIntern.values()) {
      const internId = internship.intern_id._id;

      const [totalTasks, completedTasks, dailyUpdateCount, latestUpdate, latestSentiment, latestEvaluation, reportCount, latestReport, pendingDailyCount] = await Promise.all([
        Task.countDocuments({ intern_id: internId }),
        Task.countDocuments({ intern_id: internId, status: 'COMPLETED' }),
        DailyUpdate.countDocuments({ intern_id: internId }),
        DailyUpdate.findOne({ intern_id: internId }).sort({ update_date: -1 }).select('progress update_date'),
        Sentiment.findOne({ intern_id: internId }).sort({ createdAt: -1 }).select('sentiment score createdAt'),
        Evaluation.findOne({ intern_id: internId }).sort({ createdAt: -1 }).select('final_score evaluation_period createdAt'),
        Report.countDocuments({ intern_id: internId }),
        Report.findOne({ intern_id: internId }).sort({ createdAt: -1 }).select('report_period overall_performance'),
        derivePendingDailyCount(internId, internship)
      ]);

      const pendingTasks = totalTasks - completedTasks;
      let performance = null;
      try {
        performance = await calculatePerformance(String(internId), { _id: mentorId, role: 'MENTOR' });
      } catch (e) { performance = null; }
      interns.push({
        intern_id: internId,
        intern_name: internship.intern_id.name,
        intern_email: internship.intern_id.email,
        internship: {
          id: internship._id,
          role_name: internship.role_name,
          status: internship.status,
          start_date: internship.start_date,
          end_date: internship.end_date,
          company: internship.company_id ? { id: internship.company_id._id, name: internship.company_id.name } : null,
          approval_status: internship.status === 'ACTIVE' ? 'APPROVED_ACTIVE' : internship.status
        },
        offer_letter_status: internship.offer_letter?.url ? 'UPLOADED' : 'NOT_UPLOADED',
        task_stats: {
          total_assigned: totalTasks,
          completed: completedTasks,
          pending: pendingTasks
        },
        daily_update_count: dailyUpdateCount,
        pending_daily_count: pendingDailyCount,
        latest_progress: latestUpdate ? latestUpdate.progress : 0,
        latest_sentiment: latestSentiment
          ? { sentiment: latestSentiment.sentiment, score: latestSentiment.score, at: latestSentiment.createdAt }
          : null,
        performance_score: performance ? performance.overall_score : null,
        performance_rating: performance ? performance.overall_performance : null,
        evaluation_status: latestEvaluation
          ? { evaluated: true, final_score: latestEvaluation.final_score, period: latestEvaluation.evaluation_period }
          : { evaluated: false },
        report_availability: {
          available: reportCount > 0,
          count: reportCount,
          latest_period: latestReport ? latestReport.report_period : null
        },
        overall_status: overallStatusFor(internship, pendingTasks, pendingDailyCount)
      });
    }

    res.json({
      success: true,
      mentor: mentor ? { id: mentor._id, name: mentor.name, email: mentor.email, company_id: mentor.company_id } : null,
      intern_count: interns.length,
      interns
    });
  } catch (error) { next(error); }
};

// Internship requests waiting for THIS mentor's decision (own interns only).
const getInternshipRequests = async (req, res, next) => {
  try {
    const mentorId = req.user.user_id;
    const internships = await Internship.find({ mentor_id: mentorId })
      .populate('company_id', 'name')
      .populate('requests.intern_id', 'name email role');

    const requests = [];
    for (const internship of internships) {
      for (const r of internship.requests || []) {
        if (r.status !== 'PENDING' || !r.intern_id) continue;
        requests.push({
          request_id: r._id,
          internship: {
            id: internship._id,
            role_name: internship.role_name,
            status: internship.status,
            company: internship.company_id ? { id: internship.company_id._id, name: internship.company_id.name } : null
          },
          intern: {
            id: r.intern_id._id,
            name: r.intern_id.name,
            email: r.intern_id.email
          },
          requested_at: r.requested_at
        });
      }
    }

    res.json({ success: true, count: requests.length, requests });
  } catch (error) { next(error); }
};

// Find a PENDING request by id, scoped to internships owned by this mentor.
const findPendingRequest = async (mentorId, requestId) => {
  const internships = await Internship.find({ mentor_id: mentorId });
  for (const internship of internships) {
    if (!internship.requests) continue;
    const request = internship.requests.id(requestId);
    if (request) return { internship, request };
  }
  return null;
};

// PUT /api/mentor/internship-requests/:requestId/approve
// APPROVAL is the only place where intern_id gets assigned. The mentor can only
// decide requests belonging to their own internships, and a request can never
// approve the request of an intern that already holds an open internship.
const approveInternshipRequest = async (req, res, next) => {
  try {
    const mentorId = req.user.user_id;
    const { requestId } = req.params;

    const found = await findPendingRequest(mentorId, requestId);
    if (!found) return res.status(404).json({ success: false, message: 'Request not found for this mentor' });
    const { internship, request } = found;

    if (request.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Request already ${request.status}` });
    }
    if (internship.intern_id) {
      return res.status(409).json({ success: false, message: 'Internship already assigned to an intern' });
    }
    if (internship.status !== 'PLANNED') {
      return res.status(409).json({ success: false, message: `Internship is ${internship.status} and cannot be approved` });
    }
    if (!internship.mentor_id || internship.mentor_id.toString() !== String(mentorId)) {
      return res.status(403).json({ success: false, message: 'Not your internship' });
    }

    const intern = await User.findById(request.intern_id);
    if (!intern) return res.status(404).json({ success: false, message: 'Intern not found' });
    if (intern.role !== 'INTERN') return res.status(400).json({ success: false, message: 'User is not an intern' });

    // Cross-company guard: an intern (and a mentor) belongs to exactly one company.
    if (intern.company_id && intern.company_id.toString() !== internship.company_id.toString()) {
      return res.status(403).json({ success: false, message: 'Intern belongs to another company' });
    }

    // One open internship per intern.
    const otherOpen = await Internship.findOne({
      _id: { $ne: internship._id },
      intern_id: intern._id,
      status: { $in: ['PLANNED', 'ACTIVE'] }
    }).select('_id role_name company_id');
    if (otherOpen) {
      return res.status(409).json({ success: false, message: 'Intern already has a planned or active internship' });
    }

    // All other PENDING requests of this intern can no longer be approved.
    await Internship.updateMany(
      { _id: { $ne: internship._id }, 'requests.intern_id': intern._id, 'requests.status': 'PENDING' },
      { $set: { 'requests.$[r].status': 'REJECTED', 'requests.$[r].decided_at': new Date(), 'requests.$[r].decided_by': mentorId } },
      { arrayFilters: [{ 'r.intern_id': intern._id, 'r.status': 'PENDING' }] }
    );

    request.status = 'APPROVED';
    request.decided_at = new Date();
    request.decided_by = mentorId;

    internship.intern_id = intern._id;
    internship.status = 'ACTIVE';

    if (!intern.company_id) intern.company_id = internship.company_id;
    await intern.save();
    await internship.save();

    res.json({
      success: true,
      message: 'Internship request approved. Intern assigned and internship activated.',
      internship: {
        id: internship._id,
        intern_id: intern._id,
        intern_name: intern.name,
        company_id: internship.company_id,
        mentor_id: internship.mentor_id,
        role_name: internship.role_name,
        status: internship.status
      }
    });
  } catch (error) { next(error); }
};

// PUT /api/mentor/internship-requests/:requestId/reject
const rejectInternshipRequest = async (req, res, next) => {
  try {
    const mentorId = req.user.user_id;
    const { requestId } = req.params;

    const found = await findPendingRequest(mentorId, requestId);
    if (!found) return res.status(404).json({ success: false, message: 'Request not found for this mentor' });
    const { internship, request } = found;

    if (request.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Request already ${request.status}` });
    }

    request.status = 'REJECTED';
    request.decided_at = new Date();
    request.decided_by = mentorId;
    await internship.save();

    res.json({
      success: true,
      message: 'Internship request rejected',
      request: { id: request._id, internship_id: internship._id, intern_id: request.intern_id, status: request.status }
    });
  } catch (error) { next(error); }
};

// GET /api/mentor/interns - the mentor's OWN interns (observer scope only).
const getMyInterns = async (req, res, next) => {
  try {
    const mentorId = req.user.user_id;

    const internships = await Internship.find({ mentor_id: mentorId })
      .populate('intern_id', 'name email role company_id')
      .populate('company_id', 'name')
      .sort({ createdAt: -1 });

    const interns = internships
      .filter((i) => i.intern_id)
      .map((i) => ({
        intern_id: i.intern_id._id,
        name: i.intern_id.name,
        email: i.intern_id.email,
        internship: {
          id: i._id,
          role_name: i.role_name,
          status: i.status,
          start_date: i.start_date,
          end_date: i.end_date,
          company: i.company_id ? { id: i.company_id._id, name: i.company_id.name } : null
        },
        offer_letter_status: i.offer_letter?.url ? 'UPLOADED' : 'NOT_UPLOADED'
      }));

    res.json({ success: true, count: interns.length, interns });
  } catch (error) { next(error); }
};

// GET /api/mentor/interns/:internId - profile of ONE of the mentor's own interns.
// Scoped strictly: an intern the mentor does not mentor is 403.
const getInternProfile = async (req, res, next) => {
  try {
    const mentorId = req.user.user_id;
    const { internId } = req.params;

    const internship = await Internship.findOne({ mentor_id: mentorId, intern_id: internId })
      .populate('intern_id', 'name email role company_id createdAt')
      .populate('company_id', 'name');

    if (!internship || !internship.intern_id) {
      return res.status(403).json({ success: false, message: 'Access denied. This intern is not assigned to you' });
    }

    const intern = internship.intern_id;

    const [totalTasks, completedTasks, dailyUpdateCount, latestUpdate, evaluations, reportCount, pendingDailyCount] = await Promise.all([
      Task.countDocuments({ intern_id: intern._id }),
      Task.countDocuments({ intern_id: intern._id, status: 'COMPLETED' }),
      DailyUpdate.countDocuments({ intern_id: intern._id }),
      DailyUpdate.findOne({ intern_id: intern._id }).sort({ update_date: -1 }).select('progress update_date description'),
      Evaluation.find({ intern_id: intern._id }).select('final_score evaluation_period createdAt').sort({ createdAt: -1 }),
      Report.countDocuments({ intern_id: intern._id }),
      derivePendingDailyCount(intern._id, internship)
    ]);

    res.json({
      success: true,
      intern: {
        intern_id: intern._id,
        name: intern.name,
        email: intern.email,
        joined_at: intern.createdAt,
        internship: {
          id: internship._id,
          role_name: internship.role_name,
          status: internship.status,
          start_date: internship.start_date,
          end_date: internship.end_date,
          company: internship.company_id ? { id: internship.company_id._id, name: internship.company_id.name } : null
        },
        offer_letter_status: internship.offer_letter?.url ? 'UPLOADED' : 'NOT_UPLOADED',
        task_stats: { total_assigned: totalTasks, completed: completedTasks, pending: totalTasks - completedTasks },
        daily_update_count: dailyUpdateCount,
        pending_daily_count: pendingDailyCount,
        latest_progress: latestUpdate ? latestUpdate.progress : 0,
        latest_update: latestUpdate || null,
        evaluations: evaluations.map((e) => ({
          final_score: e.final_score,
          period: e.evaluation_period,
          at: e.createdAt
        })),
        report_availability: { available: reportCount > 0, count: reportCount },
        overall_status: overallStatusFor(internship, totalTasks - completedTasks, pendingDailyCount)
      }
    });
  } catch (error) { next(error); }
};

module.exports = { getDashboardSummary, getInternshipRequests, approveInternshipRequest, rejectInternshipRequest, getMyInterns, getInternProfile };

