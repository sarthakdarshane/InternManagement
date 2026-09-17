const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
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
    internship_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship ID is required']
    },
    report_period: {
      type: String,
      required: [true, 'Report period is required'],
      trim: true,
      maxlength: [100, 'Report period cannot be more than 100 characters']
    },
    duration_days: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
      default: 0
    },
    expected_working_days: {
      type: Number,
      min: [0, 'Expected working days cannot be negative'],
      default: 0
    },
    expected_tasks: {
      type: Number,
      min: [0, 'Expected tasks cannot be negative'],
      default: 0
    },
    completed_tasks: {
      type: Number,
      min: [0, 'Completed tasks cannot be negative'],
      default: 0
    },
    pending_tasks: {
      type: Number,
      min: [0, 'Pending tasks cannot be negative'],
      default: 0
    },
    delayed_tasks: {
      type: Number,
      min: [0, 'Delayed tasks cannot be negative'],
      default: 0
    },
    completion_percentage: {
      type: Number,
      min: [0, 'Completion percentage cannot be less than 0'],
      max: [100, 'Completion percentage cannot be more than 100'],
      default: 0
    },
    total_hours: {
      type: Number,
      min: [0, 'Total hours cannot be negative'],
      default: 0
    },
    overtime_hours: {
      type: Number,
      min: [0, 'Overtime hours cannot be negative'],
      default: 0
    },
    sentiment_summary: {
      positive_count: {
        type: Number,
        min: [0, 'Positive count cannot be negative'],
        default: 0
      },
      negative_count: {
        type: Number,
        min: [0, 'Negative count cannot be negative'],
        default: 0
      },
      neutral_count: {
        type: Number,
        min: [0, 'Neutral count cannot be negative'],
        default: 0
      },
      average_score: {
        type: Number,
        min: [0, 'Average score cannot be less than 0'],
        max: [1, 'Average score cannot be more than 1'],
        default: 0
      }
    },
    evaluation_score: {
      type: Number,
      min: [0, 'Evaluation score cannot be less than 0'],
      max: [100, 'Evaluation score cannot be more than 100'],
      default: null
    },
    overall_performance: {
      type: String,
      enum: {
        values: ['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'POOR'],
        message: 'Overall performance must be one of: EXCELLENT, GOOD, AVERAGE, BELOW_AVERAGE, POOR'
      },
      default: 'AVERAGE'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
reportSchema.index({ intern_id: 1 });
reportSchema.index({ company_id: 1 });
reportSchema.index({ internship_id: 1 });
reportSchema.index({ report_period: 1 });
reportSchema.index({ created_at: 1 });

// Compile model
const Report = mongoose.model('Report', reportSchema);

module.exports = Report;