import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },

  issueType: {
    type: String,
    enum: ["pothole", "sewer", "garbage", "construction"],
    required: true,
  },
  
expiresAt: {
  type: Date,
  default: Date.now,
},
createAdt: { type: Date, default: Date.now },


  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },

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
    enum: ["Low", "Medium", "High"],
    default: "Low",
  },

  createdAt: { type: Date, default: Date.now },
  reportedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
},

});


export default mongoose.model("Issue", issueSchema);

