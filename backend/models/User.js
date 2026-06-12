import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  authProviderId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  email: { 
    type: String, 
    unique: true, 
    sparse: true, 
    lowercase: true, 
    trim: true 
  },
  
  displayName: { 
    type: String, 
    default: "" 
  },
  
  role: { 
    type: String, 
    enum: ["citizen", "operator", "supervisor", "admin"], 
    default: "citizen" 
  },
  
  profilePhoto: { 
    type: String, 
    default: "" 
  },
  
  lastLogin: { 
    type: Date, 
    default: null 
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  
  deletedAt: { 
    type: Date, 
    default: null 
  },
  
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    default: null 
  }
});

// Enforce unique index on email while allowing sparse values
userSchema.index({ email: 1 }, { unique: true, sparse: true });
// Pre-query hook to filter out soft-deleted users
userSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

userSchema.pre("aggregate", function(next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

export default mongoose.model("User", userSchema);