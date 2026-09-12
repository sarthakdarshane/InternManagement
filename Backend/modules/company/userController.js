const User = require('../auth/model');
const Company = require('../company/model');
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

const createHR = async (req, res, next) => {
  try {
    const { name, email, password, company_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name required' });
    if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email required' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be 6+ chars' });
    if (!company_id) return res.status(400).json({ success: false, message: 'Company ID required' });
    
    const company = await Company.findById(company_id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
    
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: 'HR',
      company_id
    });
    await user.save();
    res.status(201).json({ success: true, message: 'HR created', user: getSafeUser(user) });
  } catch (error) { next(error); }
};

const createMentor = async (req, res, next) => {
  try {
    const { name, email, password, company_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name required' });
    if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email required' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be 6+ chars' });
    if (!company_id) return res.status(400).json({ success: false, message: 'Company ID required' });
    
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
  } catch (error) { next(error); }
};

const getUsers = async (req, res, next) => {
  try {
    const role = req.user.role;
    if (role === 'ADMIN') {
      const users = await User.find().select('-password').sort({ created_at: -1 });
      res.json({ success: true, count: users.length, users: users.map(getSafeUser) });
    } else if (role === 'HR' || role === 'MENTOR') {
      const current = await User.findById(req.user.user_id).select('company_id');
      if (!current?.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });
      const users = await User.find({ company_id: current.company_id }).select('-password').sort({ created_at: -1 });
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
    if (role === 'ADMIN') {
      const user = await User.findById(id).select('-password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, user: getSafeUser(user) });
    } else if (role === 'HR' || role === 'MENTOR') {
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

module.exports = { createHR, createMentor, getUsers, getUserById, getSafeUser };
