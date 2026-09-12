const mongoose = require('mongoose');

const sentimentSchema = new mongoose.Schema(
  {
    update_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyUpdate',
      required: [true, 'Update ID is required']
    },
    intern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Intern ID is required']
    },
    text_content: {
      type: String,
      required: [true, 'Text content is required'],
      trim: true,
      maxlength: [5000, 'Text content cannot be more than 5000 characters']
    },
    sentiment: {
      type: String,
      required: [true, 'Sentiment is required'],
      enum: {
        values: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'],
        message: 'Sentiment must be one of: POSITIVE, NEGATIVE, NEUTRAL'
      }
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be less than 0'],
      max: [1, 'Score cannot be more than 1']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
sentimentSchema.index({ update_id: 1 });
sentimentSchema.index({ intern_id: 1 });
sentimentSchema.index({ sentiment: 1 });
sentimentSchema.index({ created_at: 1 });

// Compile model
const Sentiment = mongoose.model('Sentiment', sentimentSchema);

module.exports = Sentiment;
