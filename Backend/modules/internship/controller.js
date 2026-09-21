const Internship = require('./model');
const User = require('../auth/model');
const Company = require('../company/model');
const mongoose = require('mongoose');

const getSimpleInternship = (i) => ({
  id: i._id, intern_id: i.intern_id, company_id: i.company_id,
  role_name: i.role_name, start_date: i.start_date, end_date: i.end_date,
  mentor_id: i.mentor_id, status: i.status, created_at: i.createdAt, updated_at: i.updatedAt
});


// Create an internship.
// BUSINESS RULES:
//  - only a company ADMIN creates internships, and only for their own company
//  - intern_id is OPTIONAL. Internships are normally created OPEN (no intern);
//    an INTERN then requests it and the assigned MENTOR approves, which sets
//    intern_id and activates the internship.
const createInternship = async (req, res, next) => {
  try {
    const { intern_id, company_id, role_name, start_date, end_date, status, mentor_id } = req.body;

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });

    if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN can create internships' });
    }
    if (!authUser.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });

    const targetCompanyId = company_id || authUser.company_id;
    if (!mongoose.Types.ObjectId.isValid(String(targetCompanyId))) return res.status(400).json({ success: false, message: 'Invalid company ID' });
    if (String(targetCompanyId) !== String(authUser.company_id)) {
      return res.status(403).json({ success: false, message: 'Can only create internships for your own company' });
    }
    if (!role_name || !role_name.trim()) return res.status(400).json({ success: false, message: 'Role name required' });
    if (!start_date) return res.status(400).json({ success: false, message: 'Start date required' });

    const company = await Company.findById(targetCompanyId);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const start = new Date(start_date);
    if (isNaN(start.getTime())) return res.status(400).json({ success: false, message: 'Invalid start date' });
    const end = end_date ? new Date(end_date) : null;
    if (end && isNaN(end.getTime())) return res.status(400).json({ success: false, message: 'Invalid end date' });
    if (end && end < start) return res.status(400).json({ success: false, message: 'End date before start date' });

    // Optional mentor. A mentor belongs to exactly one company, so a mentor of
    // another company can never be attached to this internship.
    let assignedMentorId = null;
    if (mentor_id) {
      if (!mongoose.Types.ObjectId.isValid(String(mentor_id))) return res.status(400).json({ success: false, message: 'Invalid mentor ID' });
      const mentor = await User.findById(mentor_id);
      if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });
      if (mentor.role !== 'MENTOR') return res.status(400).json({ success: false, message: 'User is not a mentor' });
      if (!mentor.company_id) return res.status(400).json({ success: false, message: 'Mentor has no company assignment' });
      if (String(mentor.company_id) !== String(targetCompanyId)) {
        return res.status(403).json({ success: false, message: 'Mentor belongs to another company' });
      }
      assignedMentorId = mentor._id;
    }

    // Optional intern (backward compatible). Without intern_id the internship
    // stays OPEN for intern requests.
    let assignedInternId = null;
    if (intern_id) {
      if (!mongoose.Types.ObjectId.isValid(String(intern_id))) return res.status(400).json({ success: false, message: 'Invalid intern ID' });
      const intern = await User.findById(intern_id);
      if (!intern) return res.status(404).json({ success: false, message: 'Intern not found' });
      if (intern.role !== 'INTERN') return res.status(400).json({ success: false, message: 'User is not an intern' });
      if (intern.company_id && String(intern.company_id) !== String(targetCompanyId)) {
        return res.status(400).json({ success: false, message: 'Intern belongs to different company' });
      }
      const existing = await Internship.findOne({ intern_id, status: { $in: ['PLANNED', 'ACTIVE'] } }).select('_id');
      if (existing) return res.status(409).json({ success: false, message: 'Intern already has a planned or active internship' });
      if (!intern.company_id) { intern.company_id = targetCompanyId; await intern.save(); }
      assignedInternId = intern._id;
    }

    const validStatuses = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    const internshipStatus = status && validStatuses.includes(status)
      ? status
      : (assignedInternId ? 'ACTIVE' : 'PLANNED');

    const internship = new Internship({
      intern_id: assignedInternId,
      company_id: targetCompanyId,
      role_name: role_name.trim(),
      start_date: start,
      end_date: end,
      mentor_id: assignedMentorId,
      status: internshipStatus,
      requests: []
    });
    await internship.save();
    res.status(201).json({ success: true, message: 'Internship created', internship: getSimpleInternship(internship) });
  } catch (error) { next(error); }
};

const getAllInternships = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    
    let query = {};
    if (authUser.role === 'SUPERADMIN') {
      if (req.query.company_id && mongoose.Types.ObjectId.isValid(req.query.company_id)) query.company_id = req.query.company_id;
    } else if (authUser.role === 'ADMIN') {
      if (!authUser.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });
      query.company_id = authUser.company_id;
    } else if (authUser.role === 'MENTOR') {
      query.mentor_id = req.user.user_id;
    } else if (authUser.role === 'INTERN') {
      query.intern_id = req.user.user_id;
    } else return res.status(403).json({ success: false, message: 'Access denied' });
    
    const internships = await Internship.find(query).populate('intern_id', 'name email role').populate('company_id', 'name').populate('mentor_id', 'name email role').sort({ created_at: -1 });
    const list = internships.map((i) => {
      const base = getSimpleInternship(i);
      // An INTERN may always see the status of their own request(s).
      if (authUser.role === 'INTERN') {
        const myRequest = (i.requests || []).find((r) => String(r.intern_id) === String(authUser._id));
        base.my_request_status = myRequest ? myRequest.status : null;
      }
      return base;
    });
    res.json({ success: true, count: list.length, internships: list });
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
    if (authUser.role === 'SUPERADMIN') ok = true;
    else if (authUser.role === 'ADMIN' && authUser.company_id?.toString() === internship.company_id?._id?.toString()) ok = true;
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

// GET /api/internships/available - OPEN internships (no intern assigned yet)
// that an INTERN can request. Includes the caller's own request status.
const getAvailableInternships = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    if (authUser.role !== 'INTERN') return res.status(403).json({ success: false, message: 'Access denied. Only interns can browse available internships' });

    const query = { intern_id: null, status: 'PLANNED' };
    if (req.query.company_id && mongoose.Types.ObjectId.isValid(req.query.company_id)) {
      query.company_id = req.query.company_id;
    }

    const internships = await Internship.find(query)
      .populate('company_id', 'name')
      .populate('mentor_id', 'name email')
      .sort({ createdAt: -1 });

    const list = internships.map((i) => {
      const myRequest = (i.requests || []).find((r) => String(r.intern_id) === String(authUser._id));
      return {
        ...getSimpleInternship(i),
        company: i.company_id ? { id: i.company_id._id, name: i.company_id.name } : null,
        mentor: i.mentor_id ? { id: i.mentor_id._id, name: i.mentor_id.name, email: i.mentor_id.email } : null,
        my_request_status: myRequest ? myRequest.status : null
      };
    });

    res.json({ success: true, count: list.length, internships: list });
  } catch (error) { next(error); }
};

// POST /api/internships/:id/request - an INTERN requests an OPEN internship.
// The assigned MENTOR approves/rejects. Only approval assigns intern_id.
// BUSINESS RULES: an intern cannot create/approve internships, cannot approve
// their own or anybody else's request, and cannot request an internship from
// a company they already belong to a different one of (cross-company guard
// happens at approval time).
const requestInternship = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const authUser = await User.findById(req.user.user_id);
    if (!authUser) return res.status(401).json({ success: false, message: 'User not found' });
    if (authUser.role !== 'INTERN') return res.status(403).json({ success: false, message: 'Access denied. Only interns can request an internship' });

    const internship = await Internship.findById(id);
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    if (internship.intern_id) return res.status(409).json({ success: false, message: 'Internship is already assigned to an intern' });
    if (internship.status !== 'PLANNED') return res.status(409).json({ success: false, message: 'Internship is not open for requests' });

    const openInternship = await Internship.findOne({ intern_id: authUser._id, status: { $in: ['PLANNED', 'ACTIVE'] } }).select('_id');
    if (openInternship) return res.status(409).json({ success: false, message: 'You already have a planned or active internship' });

    // One-internship rule: a PENDING request on ANY internship blocks a new
    // request elsewhere (second request while pending -> 409).
    const pendingElsewhere = await Internship.findOne({ _id: { $ne: internship._id }, requests: { $elemMatch: { intern_id: authUser._id, status: 'PENDING' } } }).select('_id');
    if (pendingElsewhere) return res.status(409).json({ success: false, message: 'You already have a pending internship request' });

    const existingRequest = (internship.requests || []).find((r) => String(r.intern_id) === String(authUser._id));
    if (existingRequest && existingRequest.status === 'PENDING') {
      return res.status(409).json({ success: false, message: 'You already have a pending request for this internship' });
    }
    if (existingRequest && existingRequest.status === 'APPROVED') {
      return res.status(409).json({ success: false, message: 'You are already approved for this internship' });
    }

    if (existingRequest) {
      // A previously REJECTED request may be re-submitted.
      existingRequest.status = 'PENDING';
      existingRequest.requested_at = new Date();
      existingRequest.decided_at = null;
      existingRequest.decided_by = null;
    } else {
      internship.requests.push({ intern_id: authUser._id, status: 'PENDING' });
    }

    await internship.save();
    const savedRequest = (internship.requests || []).find((r) => String(r.intern_id) === String(authUser._id));
    res.status(201).json({
      success: true,
      message: 'Internship request submitted. Awaiting mentor approval.',
      request: { id: savedRequest._id, internship_id: internship._id, intern_id: authUser._id, status: savedRequest.status }
    });
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
    
    if (authUser.role === 'ADMIN' && authUser.company_id?.toString() !== internship.company_id?._id?.toString()) return res.status(403).json({ success: false, message: 'Can only update own company' });
    if (authUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN can update internships' });
    
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
    
    // Only the company ADMIN may assign mentors. SUPERADMIN does not manage
    // interns/mentors, so it never gets here.
    if (authUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN can assign mentors' });
    if (!authUser.company_id) return res.status(404).json({ success: false, message: 'No company assigned' });
    if (authUser.company_id.toString() !== internship.company_id?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Can only assign for own company' });
    }
    
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
    
    // Internship lifecycle is company business: ADMIN only. SUPERADMIN has no
    // internship operations.
    if (authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only ADMIN can change internship status' });
    }
    
    const internship = await Internship.findById(id);
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found' });
    
    // ADMIN can only change status for their own company
    if (!authUser.company_id || authUser.company_id.toString() !== internship.company_id.toString()) {
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
    
    // Only valid lifecycle transitions are permitted for the company ADMIN.
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot transition from ${currentStatus} to ${status}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}` });
    }
    
    internship.status = status;
    await internship.save();
    
    res.json({ success: true, message: `Status changed to ${status}`, internship: getSimpleInternship(internship) });
  } catch (error) { next(error); }
};

// Upload offer letter
const uploadOfferLetter = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Lazy-load Cloudinary only when an upload is attempted
    const { cloudinary } = require('../../config/cloudinary');

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

    // Authorization: the offer letter belongs to the INTERN.
    // Only the approved INTERN may upload their own offer letter.
    // MENTOR/ADMIN/SUPERADMIN may never upload.
    if (authUser.role !== 'INTERN') {
      return res.status(403).json({ success: false, message: 'Only the intern can upload their own offer letter' });
    }
    if (!internship.intern_id || internship.intern_id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only upload the offer letter for your own internship' });
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

    // GET /offer-letter access:
    //  - INTERN  : own internship only
    //  - MENTOR  : own assigned interns only (verify/review)
    //  - ADMIN   : own company only (view only, never upload/delete)
    //  - SUPERADMIN has no offer-letter access at all
    if (authUser.role === 'INTERN') {
      if (!internship.intern_id || internship.intern_id.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (authUser.role === 'MENTOR') {
      if (!internship.mentor_id || internship.mentor_id.toString() !== authUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (authUser.role === 'ADMIN') {
      if (!authUser.company_id || authUser.company_id.toString() !== internship.company_id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else {
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

    // Only the intern who owns the internship may delete their offer letter.
    // MENTOR/ADMIN/SUPERADMIN can never delete an offer letter.
    if (authUser.role !== 'INTERN') {
      return res.status(403).json({ success: false, message: 'Only the intern can delete their own offer letter' });
    }
    if (!internship.intern_id || internship.intern_id.toString() !== authUser._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own offer letter' });
    }

    if (internship.offer_letter?.public_id) {
      try {
        // Lazy-load Cloudinary only when a delete is actually attempted
        const { cloudinary } = require('../../config/cloudinary');
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

const getMyInternship = async (req, res, next) => {
  try {
    const authUser = await User.findById(req.user.user_id);
    if (!authUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // This endpoint is intern-scoped only. SUPERADMIN has no intern-report
    // functionality and MENTOR/ADMIN use their own scoped endpoints.
    if (authUser.role !== 'INTERN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = { intern_id: authUser._id, status: { $in: ['PLANNED', 'ACTIVE'] } };

    const internship = await Internship.findOne(query).populate('company_id');
    if (!internship) {
      return res.json({
        success: true,
        internship: null,
        message: 'No active internship found'
      });
    }

    res.json({
      success: true,
      internship: {
        ...getSimpleInternship(internship),
        _id: internship._id,
        company_id: internship.company_id ? { _id: internship.company_id._id, name: internship.company_id.name } : null,
        offer_letter: internship.offer_letter || null
      }
    });
  } catch (error) { next(error); }
};

module.exports = {
  createInternship,
  getAllInternships,
  getInternshipById,
  getAvailableInternships,
  requestInternship,
  updateInternship,
  assignMentor,
  changeStatus,
  getSimpleInternship,
  uploadOfferLetter,
  getOfferLetter,
  deleteOfferLetter,
  getMyInternship
};
