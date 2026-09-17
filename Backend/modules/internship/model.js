const mongoose = require('mongoose');

// Internship request subdocument: interns request an available internship;
// the assigned mentor approves or rejects.
const requestSchema = new mongoose.Schema(
  {
    intern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Intern ID is required']
    },
    status: {
      type: String,
      required: [true, 'Request status is required'],
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED'],
        message: 'Request status must be one of: PENDING, APPROVED, REJECTED'
      },
      default: 'PENDING'
    },
    requested_at: {
      type: Date,
      default: Date.now
    },
    decided_at: {
      type: Date,
      default: null
    },
    decided_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { _id: true }
);

const internshipSchema = new mongoose.Schema(
  {
    // The APPROVED intern. Null while the internship is still available for requests.
    intern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required']
    },
    role_name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [100, 'Role name cannot be more than 100 characters']
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required']
    },
    end_date: {
      type: Date,
      default: null
    },
    mentor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
        message: 'Status must be one of: PLANNED, ACTIVE, COMPLETED, CANCELLED'
      },
      default: 'PLANNED'
    },
    requests: {
      type: [requestSchema],
      default: []
    },
    offer_letter: {
      url: {
        type: String,
        default: null
      },
      public_id: {
        type: String,
        default: null
      },
      original_name: {
        type: String,
        default: null
      },
      uploaded_at: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

// Validate end_date is not before start_date
internshipSchema.pre('validate', function (next) {
  if (this.end_date && this.start_date) {
    if (this.end_date < this.start_date) {
      next(new Error('End date cannot be earlier than start date'));
    } else {
      next();
    }
  } else {
    next();
  }
});

// Indexes
internshipSchema.index({ intern_id: 1 });
internshipSchema.index({ company_id: 1 });
internshipSchema.index({ mentor_id: 1 });
internshipSchema.index({ status: 1 });
internshipSchema.index({ 'requests.intern_id': 1 });
// An intern can hold at most one open (PLANNED/ACTIVE) internship.
internshipSchema.index(
  { intern_id: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      intern_id: { $type: 'objectId' },
      status: { $in: ['PLANNED', 'ACTIVE'] }
    }
  }
);

// Compile model
const Internship = mongoose.model('Internship', internshipSchema);

module.exports = Internship;
