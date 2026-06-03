const mongoose = require('mongoose');

const sleepLogSchema = new mongoose.Schema({
  bedtime: { type: String, required: true },
  wakeTime: { type: String, required: true },
  quality: { type: Number, min: 1, max: 10, required: true },
  mood: { type: Number, min: 1, max: 10, required: true },
  notes: { type: String, default: '' },
  analysis: {
    score: Number,
    stage: String,
    duration: Number,
    sleepDebt: Number,
    deepSleep: Number,
    remSleep: Number,
    lightSleep: Number,
    awake: Number,
    recoveryScore: Number,
    consistencyScore: Number,
    insights: [String],
    recommendations: [String]
  }
}, { timestamps: true });

module.exports = mongoose.model('SleepLog', sleepLogSchema);
