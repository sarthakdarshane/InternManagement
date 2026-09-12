const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema(
  {
    intern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Intern ID is required']
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
      default: 'ACTIVE'
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

// Compile model
const Internship = mongoose.model('Internship', internshipSchema);

module.exports = Internship;
