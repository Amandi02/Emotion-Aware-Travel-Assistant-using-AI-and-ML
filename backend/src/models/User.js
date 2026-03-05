import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const pointsHistorySchema = new mongoose.Schema(
  {
    amount:        { type: Number, required: true },
    reason:        { type: String, default: '' },
    placeId:       { type: String, default: '' },
    placeName:     { type: String, default: '' },
    placeAddress:  { type: String, default: '' },
    emissionLevel: { type: String, default: '' },
    createdAt:     { type: Date, default: Date.now },
  },
  { _id: false }
);

const donationHistorySchema = new mongoose.Schema(
  {
    amountCents:     { type: Number, required: true },
    pointsUsed:      { type: Number, required: true },
    charityId:       { type: String, default: '' },
    charityName:     { type: String, default: '' },
    stripeSessionId: { type: String, default: '' },
    status:          { type: String, default: 'pending' },
    createdAt:       { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      trim:     true,
    },
    password: {
      type:      String,
      required:  true,
      minlength: 6,
      select:    false,
    },
    name: {
      type:    String,
      trim:    true,
      default: '',
    },
    // ── Eco-points ────────────────────────────────────────────────────────────
    points: {
      type:    Number,
      default: 0,
      min:     0,
    },
    pointsHistory:  { type: [pointsHistorySchema],  default: [] },
    donationHistory:{ type: [donationHistorySchema], default: [] },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
