import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  sessionId: { type: String, required: true, unique: true },
}, { timestamps: true });

export const Session = mongoose.model('Session', sessionSchema);
