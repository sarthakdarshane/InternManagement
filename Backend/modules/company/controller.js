const Company = require('./model');
const User = require('../auth/model');
const mongoose = require('mongoose');

const getSafeCompany = (c) => ({
  id: c._id,
  name: c.name,
  address: c.address || '',
  contact_name: c.contact_name || '',
  contact_email: c.contact_email || '',
  contact_phone: c.contact_phone || '',
  description: c.description || '',
  created_at: c.createdAt,
  updated_at: c.updatedAt
});

const createCompany = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required' });
    }
    const existing = await Company.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Company already exists' });
    }
    const company = new Company({
      name: name.trim(),
      address: req.body.address?.trim() || '',
      contact_name: req.body.contact_name?.trim() || '',
      contact_email: req.body.contact_email?.trim() || '',
      contact_phone: req.body.contact_phone?.trim() || '',
      description: req.body.description?.trim() || ''
    });
    await company.save();
    res.status(201).json({ success: true, message: 'Company created', company: getSafeCompany(company) });
  } catch (error) { next(error); }
};

const getAllCompanies = async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      const companies = await Company.find().sort({ created_at: -1 });
      res.json({ success: true, count: companies.length, companies: companies.map(getSafeCompany) });
    } else {
      const user = await User.findById(req.user.user_id).select('company_id');
      if (!user?.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });
      const company = await Company.findById(user.company_id);
      if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
      res.json({ success: true, count: 1, companies: [getSafeCompany(company)] });
    }
  } catch (error) { next(error); }
};

const getCompanyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (req.user.role === 'ADMIN') {
      res.json({ success: true, company: getSafeCompany(company) });
    } else {
      const user = await User.findById(req.user.user_id).select('company_id');
      if (!user?.company_id || user.company_id.toString() !== id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      res.json({ success: true, company: getSafeCompany(company) });
    }
  } catch (error) { next(error); }
};

const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Only admins can update companies' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    
    const { name, address, contact_name, contact_email, contact_phone, description } = req.body;
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      const existing = await Company.findOne({ name: name.trim(), _id: { $ne: id } });
      if (existing) return res.status(409).json({ success: false, message: 'Company name already exists' });
      company.name = name.trim();
    }
    if (address !== undefined) company.address = address.trim();
    if (contact_name !== undefined) company.contact_name = contact_name.trim();
    if (contact_email !== undefined) company.contact_email = contact_email.trim();
    if (contact_phone !== undefined) company.contact_phone = contact_phone.trim();
    if (description !== undefined) company.description = description.trim();
    await company.save();
    res.json({ success: true, message: 'Company updated', company: getSafeCompany(company) });
  } catch (error) { next(error); }
};

const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Only admins can delete companies' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    const usersCount = await User.countDocuments({ company_id: id });
    if (usersCount > 0) return res.status(400).json({ success: false, message: `Cannot delete. ${usersCount} users assigned.` });
    await Company.findByIdAndDelete(id);
    res.json({ success: true, message: 'Company deleted' });
  } catch (error) { next(error); }
};

module.exports = { createCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany, getSafeCompany };
