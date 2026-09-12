const Internship = require('./model');
const User = require('../auth/model');
const Company = require('../company/model');
const mongoose = require('mongoose');
const { cloudinary } = require('../../config/cloudinary');

const getSimpleInternship = (i) => ({
  id: i._id, intern_id: i.intern_id, company_id: i.company_id,
  role_name: i.role_name, start_date: i.start_date, end_date: i.end_date,
  mentor_id: i.mentor_id, status: i.status, created_at: i.createdAt, updated_at: i.updatedAt
});

const createInternship = async (req, res, next) => {
  try {
    const { intern_id, company_id, role_name, start_date, end_date, status } = req.body;
    if (!intern_id) return res.status(400).json({ success: false, message: 'Intern ID required' });
    if (!company_id) return res.status(400).json({ success: false, message: 'Company ID required' });
    if (!role_name || !role_name.trim()) return res.status(400).json({ success: false, message: 'Role name required' });
    if (!start_date) return res.status(400).json({ success: false, message: 'Start date required' });
    if (!mongoose.Types.ObjectId.isValid(intern_id)) return res.status(400).json({ success: false, message: 'Invalid intern ID' });
    if (!mongoose.Types.ObjectId.isValid(company_id)) return res.status(400).json({ success: false, message: 'Invalid company ID' });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    
    const intern = await User.findById(intern_id);
    if (!intern) return res.status(404).json({ success: false, message: 'Intern not found' });
    if (intern.role !== 'INTERN') return res.status(400).json({ success: false, message: 'User is not an intern' });
    
    const company = await Company.findById(company_id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    
    if (authUser.role === 'HR' && authUser.company_id?.toString() !== company_id) return res.status(403).json({ success: false, message: 'Can only create for your company' });
    if (authUser.role !== 'ADMIN' && authUser.role !== 'HR') return res.status(403).json({ success: false, message: 'Access denied' });
    
    // Check for existing active or planned internship
    const existing = await Internship.findOne({ intern_id, status: { $in: ['PLANNED', 'ACTIVE'] } });
    if (existing) return res.status(409).json({ success: false, message: 'Intern already has a planned or active internship' });
    
    if (intern.company_id && intern.company_id.toString() !== company_id) return res.status(400).json({ success: false, message: 'Intern belongs to different company' });
    if (!intern.company_id) { intern.company_id = company_id; await intern.save(); }
    
    const start = new Date(start_date);
    const end = end_date ? new Date(end_date) : null;
    if (end && end < start) return res.status(400).json({ success: false, message: 'End date before start date' });
    
    // Validate status
    const validStatuses = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    const internshipStatus = status && validStatuses.includes(status) ? status : 'ACTIVE';
    
    const internship = new Internship({ intern_id, company_id, role_name: role_name.trim(), start_date: start, end_date: end, mentor_id: null, status: internshipStatus });
    await internship.save();
    res.status(201).json({ success: true, message: 'Internship created', internship: getSimpleInternship(internship) });
  } catch (error) { next(error); }
};

const getAllInternships = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    
    let query = {};
    if (authUser.role === 'ADMIN') {
      if (req.query.company_id && mongoose.Types.ObjectId.isValid(req.query.company_id)) query.company_id = req.query.company_id;
    } else if (authUser.role === 'HR') {
      if (!authUser.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });
      query.company_id = authUser.company_id;
    } else if (authUser.role === 'MENTOR') {
      query.mentor_id = req.user.user_id;
    } else if (authUser.role === 'INTERN') {
      query.intern_id = req.user.user_id;
    } else return res.status(403).json({ success: false, message: 'Access denied' });
    
    const internships = await Internship.find(query).populate('intern_id', 'name email role').populate('company_id', 'name').populate('mentor_id', 'name email role').sort({ created_at: -1 });
    res.json({ success: true, count: internships.length, internships: internships.map(getSimpleInternship) });
  } catch (error) { next(error); }
};

const getInternshipById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
    const internship = await Internship.findById(id).populate('intern_id', 'name email role company_id').populate('company_id', 'name').populate('mentor_id', 'name email role company_id');
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    
    let ok = false;
    if (authUser.role === 'ADMIN') ok = true;
    else if (authUser.role === 'HR' && authUser.company_id?.toString() === internship.company_id?._id?.toString()) ok = true;
    else if (authUser.role === 'MENTOR' && internship.mentor_id?._id?.toString() === req.user.user_id) ok = true;
    else if (authUser.role === 'INTERN' && internship.intern_id?._id?.toString() === req.user.user_id) ok = true;
    if (!ok) return res.status(403).json({ success: false, message: 'Access denied' });
    
    const getSafeInternship = async (i) => ({
      id: i._id,
      intern_id: i.intern_id ? { id: i.intern_id._id, name: i.intern_id.name, email: i.intern_id.email, role: i.intern_id.role, company_id: i.intern_id.company_id } : null,
      company_id: i.company_id ? { id: i.company_id._id, name: i.company_id.name } : null,
      role_name: i.role_name, start_date: i.start_date, end_date: i.end_date,
      mentor_id: i.mentor_id ? { id: i.mentor_id._id, name: i.mentor_id.name, email: i.mentor_id.email, role: i.mentor_id.role, company_id: i.mentor_id.company_id } : null,
      status: i.status, created_at: i.createdAt, updated_at: i.updatedAt
    });
    res.json({ success: true, internship: await getSafeInternship(internship) });
  } catch (error) { next(error); }
};

const updateInternship = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role_name, start_date, end_date, status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    
    const internship = await Internship.findById(id).populate('company_id');
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    
    if (authUser.role === 'HR' && authUser.company_id?.toString() !== internship.company_id?._id?.toString()) return res.status(403).json({ success: false, message: 'Can only update own company' });
    if (authUser.role !== 'ADMIN' && authUser.role !== 'HR') return res.status(403).json({ success: false, message: 'Access denied' });
    
    if (role_name !== undefined) { if (!role_name.trim()) return res.status(400).json({ success: false, message: 'Role cannot be empty' }); internship.role_name = role_name.trim(); }
    if (start_date !== undefined) {
      const s = new Date(start_date);
      if (isNaN(s.getTime())) return res.status(400).json({ success: false, message: 'Invalid date' });
      if (internship.end_date && new Date(internship.end_date) < s) return res.status(400).json({ success: false, message: 'End before start' });
      internship.start_date = s;
    }
    if (end_date !== undefined) {
      if (end_date) {
        const e = new Date(end_date);
        if (isNaN(e.getTime())) return res.status(400).json({ success: false, message: 'Invalid date' });
        if (e < internship.start_date) return res.status(400).json({ success: false, message: 'End before start' });
        internship.end_date = e;
      } else internship.end_date = null;
    }
    if (status !== undefined) { if (!['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' }); internship.status = status; }
    
    await internship.save();
    res.json({ success: true, message: 'Updated', internship: getSimpleInternship(internship) });
  } catch (error) { next(error); }
};

const assignMentor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mentor_id } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    
    const internship = await Internship.findById(id).populate('company_id');
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    
    if (authUser.role === 'HR' && authUser.company_id?.toString() !== internship.company_id?._id?.toString()) return res.status(403).json({ success: false, message: 'Can only assign for own company' });
    if (authUser.role !== 'ADMIN' && authUser.role !== 'HR') return res.status(403).json({ success: false, message: 'Access denied' });
    
    if (!mentor_id) {
      internship.mentor_id = null;
      await internship.save();
      return res.json({ success: true, message: 'Mentor unassigned', internship: getSimpleInternship(internship) });
    }
    
    if (!mongoose.Types.ObjectId.isValid(mentor_id)) return res.status(400).json({ success: false, message: 'Invalid mentor ID' });
    const mentor = await User.findById(mentor_id);
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });
    if (mentor.role !== 'MENTOR') return res.status(400).json({ success: false, message: 'Not a mentor' });
    if (!mentor.company_id) return res.status(400).json({ success: false, message: 'Mentor needs company' });
    if (mentor.company_id.toString() !== internship.company_id?._id?.toString()) return res.status(403).json({ success: false, message: 'Mentor must be from same company' });
    
    internship.mentor_id = mentor_id;
    await internship.save();
    res.json({ success: true, message: 'Mentor assigned', internship: getSimpleInternship(internship) });
  } catch (error) { next(error); }
};

const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    if (!status || !['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be one of: PLANNED, ACTIVE, COMPLETED, CANCELLED' });
    }
    
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    
    if (authUser.role !== 'ADMIN' && authUser.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN or HR can change status' });
    }
    
    const internship = await Internship.findById(id);
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    
    // HR can only change status for their own company
    if (authUser.role === 'HR' && authUser.company_id?.toString() !== internship.company_id.toString()) {
      return res.status(403).json({ success: false, message: 'Can only change status for your company' });
    }
    
    // Validate status transitions
    const validTransitions = {
      'PLANNED': ['ACTIVE', 'CANCELLED'],
      'ACTIVE': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };
    
    const currentStatus = internship.status;
    const allowedTransitions = validTransitions[currentStatus] || [];
    
    // Allow any transition for ADMIN, but validate for HR
    if (authUser.role === 'HR' && !allowedTransitions.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot transition from ${currentStatus} to ${status}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}` });
    }
    
    internship.status = status;
    await internship.save();
    
    res.json({ success: true, message: `Status changed to ${status}`, internship: getSimpleInternship(internship) });
  } catch (error) { next(error); }
};

module.exports = { createInternship, getAllInternships, getInternshipById, updateInternship, assignMentor, changeStatus, getSimpleInternship };

// Upload offer letter
const uploadOfferLetter = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate internship exists
    const internship = await Internship.findById(id);
    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    // Authenticate user
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Authorization checks
    if (authUser.role === 'INTERN') {
      if (internship.intern_id.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only upload offer letter for your own internship' });
      }
    } else if (authUser.role === 'MENTOR') {
      if (internship.mentor_id?.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only upload offer letter for your assigned intern' });
      }
    } else if (authUser.role === 'HR') {
      if (authUser.company_id?.toString() !== internship.company_id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only upload offer letter for your company' });
      }
    } else if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete old offer letter if exists
    if (internship.offer_letter?.public_id) {
      try {
        await cloudinary.uploader.destroy(internship.offer_letter.public_id);
      } catch (destroyError) {
        console.error('Error deleting old file:', destroyError);
      }
    }

    // Save new offer letter
    internship.offer_letter = {
      url: req.file.path,
      public_id: req.file.filename,
      original_name: req.file.originalname,
      uploaded_at: new Date()
    };

    await internship.save();

    res.status(200).json({
      success: true,
      message: 'Offer letter uploaded successfully',
      offer_letter: {
        url: internship.offer_letter.url,
        original_name: internship.offer_letter.original_name,
        uploaded_at: internship.offer_letter.uploaded_at
      }
    });
  } catch (error) {
    console.error('Upload offer letter error:', error);
    next(error);
  }
};

module.exports = { 
  createInternship, 
  getAllInternships, 
  getInternshipById, 
  updateInternship, 
  assignMentor, 
  changeStatus, 
  getSimpleInternship,
  uploadOfferLetter
};

// Get offer letter
const getOfferLetter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const internship = await Internship.findById(id);
    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (authUser.role === 'INTERN') {
      if (internship.intern_id.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (authUser.role === 'MENTOR') {
      if (internship.mentor_id?.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (authUser.role === 'HR') {
      if (authUser.company_id?.toString() !== internship.company_id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!internship.offer_letter?.url) {
      return res.status(404).json({ success: false, message: 'No offer letter uploaded' });
    }

    res.json({
      success: true,
      offer_letter: {
        url: internship.offer_letter.url,
        original_name: internship.offer_letter.original_name,
        uploaded_at: internship.offer_letter.uploaded_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete offer letter
const deleteOfferLetter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const internship = await Internship.findById(id);
    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (authUser.role === 'INTERN') {
      if (internship.intern_id.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only delete your own offer letter' });
      }
    } else if (authUser.role === 'MENTOR') {
      if (internship.mentor_id?.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (authUser.role === 'HR') {
      if (authUser.company_id?.toString() !== internship.company_id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (internship.offer_letter?.public_id) {
      try {
        await cloudinary.uploader.destroy(internship.offer_letter.public_id);
      } catch (destroyError) {
        console.error('Error deleting file:', destroyError);
      }
    }

    internship.offer_letter = {
      url: null,
      public_id: null,
      original_name: null,
      uploaded_at: null
    };

    await internship.save();

    res.json({
      success: true,
      message: 'Offer letter deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInternship,
  getAllInternships,
  getInternshipById,
  updateInternship,
  assignMentor,
  changeStatus,
  getSimpleInternship,
  uploadOfferLetter,
  getOfferLetter,
  deleteOfferLetter
};
