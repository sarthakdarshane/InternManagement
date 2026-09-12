const mongoose = require('mongoose');

const dailyUpdateSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required']
    },
    intern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Intern ID is required']
    },
    update_date: {
      type: Date,
      required: [true, 'Update date is required']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot be more than 5000 characters']
    },
    progress: {
      type: Number,
      required: [true, 'Progress is required'],
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot be more than 100']
    },
    hours_worked: {
      type: Number,
      required: [true, 'Hours worked is required'],
      min: [0, 'Hours worked cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
dailyUpdateSchema.index({ task_id: 1 });
dailyUpdateSchema.index({ intern_id: 1 });
dailyUpdateSchema.index({ update_date: 1 });
dailyUpdateSchema.index({ intern_id: 1, update_date: 1 });

// Compile model
const DailyUpdate = mongoose.model('DailyUpdate', dailyUpdateSchema);

module.exports = DailyUpdate;
