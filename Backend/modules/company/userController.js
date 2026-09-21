const User = require('../auth/model');
const Company = require('../company/model');
const Internship = require('../internship/model');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const getSafeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  company_id: u.company_id,
  created_at: u.createdAt,
  updated_at: u.updatedAt
});

// createHR kept for endpoint compatibility (POST /api/users/hr): it now creates an ADMIN user.
// BUSINESS RULE: ONE company = ONE ADMIN, and ONE ADMIN = ONE company.
const createHR = async (req, res, next) => {
  try {
    const { name, email, password, company_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name required' });
    if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email required' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be 6+ chars' });
    if (!company_id) return res.status(400).json({ success: false, message: 'Company ID required' });
    if (!mongoose.Types.ObjectId.isValid(String(company_id))) return res.status(400).json({ success: false, message: 'Invalid company ID' });

    const company = await Company.findById(company_id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    // ONE company = ONE ADMIN. A second ADMIN for the same company is rejected
    // instead of silently reassigning/deleting the existing one.
    const existingAdmin = await User.findOne({ role: 'ADMIN', company_id }).select('_id name email');
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'This company already has an ADMIN. One company can have only one ADMIN.'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: 'ADMIN',
      company_id
    });
    await user.save();
    res.status(201).json({ success: true, message: 'Admin user created', user: getSafeUser(user) });
  } catch (error) { next(error); }
};

// BUSINESS RULE: a MENTOR belongs to exactly ONE company and can never be
// reassigned to a different company. Only a company ADMIN may create mentor
// accounts, and only for their own company (SUPERADMIN has no mentor
// assignment capability).
const createMentor = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    let { company_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name required' });
    if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email required' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be 6+ chars' });

    const authUser = await User.findById(req.user.user_id).select('role company_id');
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only a company ADMIN can create mentors' });
    }
    if (!authUser.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });

    // The mentor belongs to the ADMIN's own company; a different company is rejected.
    if (company_id && String(company_id) !== String(authUser.company_id)) {
      return res.status(403).json({ success: false, message: 'Can only create mentors for your own company' });
    }
    company_id = authUser.company_id;

    const company = await Company.findById(company_id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: 'MENTOR',
      company_id
    });
    await user.save();
    res.status(201).json({ success: true, message: 'Mentor created', user: getSafeUser(user) });
  } catch (error) {
    // Race-safe global uniqueness: if two requests pass the pre-check
    // simultaneously, MongoDB's unique email index rejects the second one.
    // Surface that as 409 (not 500) without touching password behavior.
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    next(error);
  }
};

// GET /api/users/mentors - mentors of the ADMIN's own company with intern counts.
// Consumed by the company ADMIN dashboard (mentor list + intern counts).
const getCompanyMentors = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id).select('role company_id');
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    // SUPERADMIN is platform-level only: no mentor management.
    if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only a company ADMIN can view company mentors' });
    }
    const companyId = authUser.company_id;
    if (!companyId) return res.status(404).json({ success: false, message: 'No company assigned' });

    const mentors = await User.find({ role: 'MENTOR', company_id: companyId })
      .select('name email createdAt')
      .sort({ createdAt: -1 });

    // Per-mentor intern count is derived from the internships each mentor owns
    // (one internship per mentor/intern pair), plus the company-wide total.
    const internships = await Internship.find({ company_id: companyId }).select('mentor_id intern_id');

    const countByMentor = new Map();
    const companyInternIds = new Set();
    for (const i of internships) {
      if (i.intern_id) companyInternIds.add(String(i.intern_id));
      if (!i.mentor_id || !i.intern_id) continue;
      const key = String(i.mentor_id);
      if (!countByMentor.has(key)) countByMentor.set(key, new Set());
      countByMentor.get(key).add(String(i.intern_id));
    }

    res.json({
      success: true,
      company_id: companyId,
      count: mentors.length,
      total_interns: companyInternIds.size,
      total_mentors: mentors.length,
      mentors: mentors.map((m) => ({
        ...getSafeUser(m),
        intern_count: countByMentor.has(String(m._id)) ? countByMentor.get(String(m._id)).size : 0
      }))
    });
  } catch (error) { next(error); }
};

const getUsers = async (req, res, next) => {
  try {
    const authRole = req.user.role;
    const requestedRole = (req.query.role || '').trim().toUpperCase();

    const allowedRoles = ['SUPERADMIN', 'ADMIN', 'MENTOR', 'INTERN'];
    const filterByRole = requestedRole && allowedRoles.includes(requestedRole)
      ? { role: requestedRole }
      : null;

    if (authRole === 'SUPERADMIN') {
      const query = { ...(filterByRole ? filterByRole : {}) };
      const users = await User.find(query).select('-password').sort({ created_at: -1 });
      res.json({ success: true, count: users.length, users: users.map(getSafeUser) });
    } else if (authRole === 'ADMIN' || authRole === 'MENTOR') {
      const current = await User.findById(req.user.user_id).select('company_id');
      if (!current?.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });

      const query = { company_id: current.company_id };
      if (filterByRole) query.role = filterByRole.role;

      const users = await User.find(query).select('-password').sort({ created_at: -1 });
      res.json({ success: true, count: users.length, users: users.map(getSafeUser) });
    } else {
      const user = await User.findById(req.user.user_id).select('-password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, count: 1, users: [getSafeUser(user)] });
    }
  } catch (error) { next(error); }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
    const role = req.user.role;
    if (role === 'SUPERADMIN') {
      const user = await User.findById(id).select('-password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, user: getSafeUser(user) });
    } else if (role === 'ADMIN' || role === 'MENTOR') {
      const current = await User.findById(req.user.user_id).select('company_id');
      if (!current?.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });
      const user = await User.findOne({ _id: id, company_id: current.company_id }).select('-password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found or no permission' });
      res.json({ success: true, user: getSafeUser(user) });
    } else {
      if (id !== req.user.user_id) return res.status(403).json({ success: false, message: 'Can only view own info' });
      const user = await User.findById(id).select('-password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, user: getSafeUser(user) });
    }
  } catch (error) { next(error); }
};

module.exports = { createHR, createMentor, getCompanyMentors, getUsers, getUserById, getSafeUser };
