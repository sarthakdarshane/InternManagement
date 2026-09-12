const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema(
  {
    intern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Intern ID is required']
    },
    mentor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentor ID is required']
    },
    internship_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship ID is required']
    },
    evaluation_period: {
      type: String,
      required: [true, 'Evaluation period is required'],
      trim: true,
      maxlength: [100, 'Evaluation period cannot be more than 100 characters']
    },
    communication: {
      type: Number,
      required: [true, 'Communication score is required'],
      min: [0, 'Communication score cannot be less than 0'],
      max: [100, 'Communication score cannot be more than 100']
    },
    technical_skill: {
      type: Number,
      required: [true, 'Technical skill score is required'],
      min: [0, 'Technical skill score cannot be less than 0'],
      max: [100, 'Technical skill score cannot be more than 100']
    },
    punctuality: {
      type: Number,
      required: [true, 'Punctuality score is required'],
      min: [0, 'Punctuality score cannot be less than 0'],
      max: [100, 'Punctuality score cannot be more than 100']
    },
    task_completion: {
      type: Number,
      required: [true, 'Task completion score is required'],
      min: [0, 'Task completion score cannot be less than 0'],
      max: [100, 'Task completion score cannot be more than 100']
    },
    teamwork: {
      type: Number,
      required: [true, 'Teamwork score is required'],
      min: [0, 'Teamwork score cannot be less than 0'],
      max: [100, 'Teamwork score cannot be more than 100']
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [2000, 'Comments cannot be more than 2000 characters'],
      default: ''
    },
    final_score: {
      type: Number,
      min: [0, 'Final score cannot be less than 0'],
      max: [100, 'Final score cannot be more than 100'],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
evaluationSchema.index({ intern_id: 1 });
evaluationSchema.index({ mentor_id: 1 });
evaluationSchema.index({ internship_id: 1 });
evaluationSchema.index({ created_at: 1 });

// Compile model
const Evaluation = mongoose.model('Evaluation', evaluationSchema);

module.exports = Evaluation;
