const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  waId: { type: String, required: true, unique: true }, // customer WhatsApp ID
  name: { type: String }, // Extracted by AI or from profile
  history: [{
    role: { type: String, enum: ['user', 'assistant', 'system'] },
    content: { type: String }
  }],
  status: { type: String, enum: ['active', 'handed_off', 'closed'], default: 'active' },
  category: { type: String },
  useCase: { type: String },
  budgetRange: { type: String },
  step: { type: Number, default: 1 },
  page: { type: Number, default: 1 },
  lastActive: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
