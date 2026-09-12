const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    internship_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship ID is required']
    },
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
    task_name: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
      maxlength: [200, 'Task name cannot be more than 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
      default: ''
    },
    assigned_date: {
      type: Date,
      required: [true, 'Assigned date is required']
    },
    due_date: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'],
        message: 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED, DELAYED'
      },
      default: 'PENDING'
    },
    progress: {
      type: Number,
      required: [true, 'Progress is required'],
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot be more than 100'],
      default: 0
    },
    hours_worked: {
      type: Number,
      required: [true, 'Hours worked is required'],
      min: [0, 'Hours worked cannot be negative'],
      default: 0
    },
    completion_date: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Validate completion_date when status is COMPLETED
taskSchema.pre('validate', function (next) {
  if (this.status === 'COMPLETED' && !this.completion_date) {
    this.completion_date = new Date();
  }
  if (this.status !== 'COMPLETED' && this.completion_date) {
    this.completion_date = null;
  }
  next();
});

// Indexes
taskSchema.index({ internship_id: 1 });
taskSchema.index({ intern_id: 1 });
taskSchema.index({ mentor_id: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ assigned_date: 1 });

// Compile model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
