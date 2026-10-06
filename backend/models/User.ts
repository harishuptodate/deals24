import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerifiedAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
