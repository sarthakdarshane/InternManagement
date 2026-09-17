const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't return password by default
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['SUPERADMIN', 'ADMIN', 'MENTOR', 'INTERN'],
        message: 'Role must be one of: SUPERADMIN, ADMIN, MENTOR, INTERN'
      }
    },
    // Session/token version: incremented to invalidate previously issued JWTs.
    // Included when a JWT is issued and verified against the DB on each request,
    // so a stale token can never authorize a user after a role migration.
    token_version: {
      type: Number,
      default: 0,
      select: false
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes (email already has unique: true above, so no need to index it again)
userSchema.index({ company_id: 1 });
userSchema.index({ role: 1 });

// Compile model
const User = mongoose.model('User', userSchema);

module.exports = User;
