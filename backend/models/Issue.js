import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
  imageUrl: { type: String, required: false },

  issueType: {
    type: String,
    enum: ["pothole", "sewer", "garbage", "construction", "infrastructure_damage", "public_safety_hazard", "other"],
    required: true,
  },

  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
  },

  affectedArea: {
    type: String,
    enum: ["Road", "School Zone", "Hospital Zone", "Market Area", "Residential Area", "Government Facility", "Public Utility", "Other"],
  },

  photos: {
    type: [String],
    default: [],
  },

  customIssueType: { type: String, default: null },

  communityConfirmations: { type: Number, default: 0 },

  duplicateGroupId: { type: String, default: null },

  address: { type: String, default: "" },

  description: { type: String, default: "" },

  expiresAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: { type: Date, default: Date.now },

  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  locationName: { type: String, default: "Unknown" },

  // GeoJSON Point for 2dsphere spatial index
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  votes: { type: Number, default: 0 },

  validationVotes: {
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 },
  },

  status: {
    type: String,
    enum: ["pending","in-progress", "resolved", "invalid","need-review"],
    default: "pending",
  },

  riskScore: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Low",
  },
  riskValue: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  resolvedAt: { type: Date, default: null },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  slaDeadline: { type: Date },
  slaStatus: {
    type: String,
    enum: ["OK", "Warning", "Breached"],
    default: "OK",
  },
  slaHoursRemaining: { type: Number },

  aiPrediction: { type: String, default: null },
  aiConfidence: { type: Number, default: null },
  userCategory: { type: String, default: null },
  finalCategory: { type: String, default: null },
  predictionMatched: { type: Boolean, default: null },

  // Soft delete support
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    default: null 
  }
});

// Sync coordinates hook for backward compatibility
issueSchema.pre("validate", function(next) {
  if (this.latitude !== undefined && this.longitude !== undefined) {
    this.location = {
      type: "Point",
      coordinates: [this.longitude, this.latitude]
    };
  }
  next();
});

// Indexes configuration
issueSchema.index({ location: "2dsphere" });
issueSchema.index({ status: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ riskScore: 1 });
issueSchema.index({ slaDeadline: 1 });
issueSchema.index({ issueType: 1 });
issueSchema.index({ isDeleted: 1 });

// Compound indexes
issueSchema.index({ latitude: 1, longitude: 1, status: 1 });
issueSchema.index({ status: 1, riskScore: 1 });

// Pre-query hook to filter out soft-deleted issues
issueSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

issueSchema.pre("aggregate", function(next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

export default mongoose.model("Issue", issueSchema);
