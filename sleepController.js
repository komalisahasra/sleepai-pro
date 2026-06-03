const SleepLog = require('../models/SleepLog');

// In-memory fallback if MongoDB not available
let memoryLogs = [];
let useMemory = false;

mongoose_check = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

function analyzeSleep(data) {
  const { bedtime, wakeTime, quality, mood, notes } = data;
  const bed = new Date(`2000-01-01T${bedtime}:00`);
  let wake = new Date(`2000-01-01T${wakeTime}:00`);
  if (wake <= bed) wake = new Date(`2000-01-02T${wakeTime}:00`);
  let duration = (wake - bed) / 3600000;

  // Sleep stage simulation (realistic distribution)
  const deepSleep = parseFloat((duration * (0.15 + (quality / 10) * 0.05)).toFixed(1));
  const remSleep = parseFloat((duration * (0.20 + (mood / 10) * 0.05)).toFixed(1));
  const lightSleep = parseFloat((duration * 0.50).toFixed(1));
  const awake = parseFloat(Math.max(0, duration - deepSleep - remSleep - lightSleep).toFixed(1));

  let score = 0;
  const insights = [];
  const recommendations = [];

  // Duration score (40 pts)
  if (duration >= 7 && duration <= 9) { score += 40; insights.push("✅ Optimal sleep duration achieved (7–9h)."); }
  else if (duration >= 6) { score += 25; insights.push("⚠️ Slightly under recommended sleep duration."); recommendations.push("Aim for at least 7 hours of sleep each night."); }
  else if (duration > 9) { score += 22; insights.push("⚠️ Oversleeping can cause grogginess."); recommendations.push("Keep sleep between 7–9 hours for optimal recovery."); }
  else { score += 10; insights.push("❌ Severely insufficient sleep detected."); recommendations.push("Prioritize getting 7–9 hours of sleep urgently."); }

  // Quality score (30 pts)
  score += Math.round(quality * 3);
  if (quality >= 8) insights.push("✅ Excellent sleep quality — deep restorative cycles achieved.");
  else if (quality >= 5) { insights.push("⚠️ Moderate sleep quality — could be improved."); recommendations.push("Reduce screen time 1 hour before bed."); }
  else { insights.push("❌ Poor sleep quality detected."); recommendations.push("Try a cool, dark, quiet room and consistent schedule."); }

  // Mood score (20 pts)
  score += Math.round(mood * 2);
  if (mood >= 8) insights.push("✅ Excellent morning mood — sleep was highly restorative.");
  else if (mood >= 5) insights.push("⚠️ Moderate morning mood — sleep partially restorative.");
  else { insights.push("❌ Poor morning mood — sleep was not restorative."); recommendations.push("Try relaxation techniques: meditation or journaling before bed."); }

  // Bedtime analysis (10 pts)
  const bedHour = bed.getHours();
  if (bedHour >= 22 || bedHour === 0) { score += 10; insights.push("✅ Excellent bedtime (10pm–12am) aligns with circadian rhythm."); }
  else if (bedHour >= 20) { score += 7; insights.push("⚠️ Slightly early bedtime."); }
  else if (bedHour >= 1 && bedHour < 3) { score += 4; insights.push("⚠️ Late bedtime may disrupt circadian rhythm."); recommendations.push("Try sleeping before midnight for better hormonal balance."); }
  else if (bedHour >= 3) { score += 0; insights.push("❌ Very late bedtime severely disrupts circadian rhythm."); recommendations.push("Shift bedtime earlier by 30 mins each night until reaching 10–11pm."); }

  // Notes keyword AI
  if (notes) {
    const n = notes.toLowerCase();
    if (n.includes('stress') || n.includes('anxious') || n.includes('worry')) {
      insights.push("🧠 Stress/anxiety patterns detected — may suppress deep sleep.");
      recommendations.push("Practice 4-7-8 breathing or progressive muscle relaxation before bed.");
    }
    if (n.includes('coffee') || n.includes('caffeine') || n.includes('tea')) {
      insights.push("☕ Caffeine intake detected — may have delayed sleep onset.");
      recommendations.push("Avoid caffeine after 2pm for better sleep architecture.");
    }
    if (n.includes('exercise') || n.includes('workout') || n.includes('gym')) {
      insights.push("💪 Physical activity logged — promotes deeper slow-wave sleep.");
    }
    if (n.includes('alcohol') || n.includes('drink') || n.includes('wine') || n.includes('beer')) {
      insights.push("🍷 Alcohol detected — fragments sleep and suppresses REM cycles.");
      recommendations.push("Avoid alcohol within 3 hours of bedtime.");
    }
    if (n.includes('screen') || n.includes('phone') || n.includes('tv')) {
      insights.push("📱 Screen exposure before bed noted — reduces melatonin production.");
      recommendations.push("Use night mode or blue-light glasses after 8pm.");
    }
    if (n.includes('nap')) {
      insights.push("😴 Nap detected — may affect nighttime sleep pressure.");
      recommendations.push("Keep naps under 20 minutes and before 3pm.");
    }
  }

  const finalScore = Math.min(100, Math.round(score));
  const stage = finalScore >= 85 ? "Excellent" : finalScore >= 70 ? "Good" : finalScore >= 50 ? "Fair" : "Poor";
  const sleepDebt = parseFloat(Math.max(0, 8 - duration).toFixed(1));
  const recoveryScore = Math.min(100, Math.round((deepSleep / duration) * 100 * 2.5 + (mood * 5)));
  const consistencyScore = Math.min(100, Math.round(finalScore * 0.8 + quality * 2));

  return { score: finalScore, stage, duration: parseFloat(duration.toFixed(1)), sleepDebt, deepSleep, remSleep, lightSleep, awake, recoveryScore, consistencyScore, insights, recommendations };
}

// POST /api/sleep
exports.createLog = async (req, res) => {
  try {
    const analysis = analyzeSleep(req.body);
    const logData = { ...req.body, analysis };

    if (mongoose_check()) {
      const log = new SleepLog(logData);
      await log.save();
      return res.json(log);
    } else {
      const log = { _id: Date.now().toString(), ...logData, createdAt: new Date().toISOString() };
      memoryLogs.unshift(log);
      return res.json(log);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/history
exports.getHistory = async (req, res) => {
  try {
    if (mongoose_check()) {
      const logs = await SleepLog.find().sort({ createdAt: -1 }).limit(50);
      return res.json(logs);
    }
    res.json(memoryLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analysis
exports.getAnalysis = async (req, res) => {
  try {
    let logs = mongoose_check() ? await SleepLog.find().sort({ createdAt: -1 }).limit(30) : memoryLogs.slice(0, 30);
    if (!logs.length) return res.json({ avgScore: 0, avgDuration: 0, avgQuality: 0, avgMood: 0, totalLogs: 0, avgRecovery: 0 });

    const avgScore = Math.round(logs.reduce((a, b) => a + b.analysis.score, 0) / logs.length);
    const avgDuration = parseFloat((logs.reduce((a, b) => a + b.analysis.duration, 0) / logs.length).toFixed(1));
    const avgQuality = parseFloat((logs.reduce((a, b) => a + b.quality, 0) / logs.length).toFixed(1));
    const avgMood = parseFloat((logs.reduce((a, b) => a + b.mood, 0) / logs.length).toFixed(1));
    const avgRecovery = Math.round(logs.reduce((a, b) => a + (b.analysis.recoveryScore || 0), 0) / logs.length);
    const weekly = logs.slice(0, 7).map(l => ({ date: l.createdAt, score: l.analysis.score, duration: l.analysis.duration, quality: l.quality })).reverse();

    res.json({ avgScore, avgDuration, avgQuality, avgMood, avgRecovery, totalLogs: logs.length, weekly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/insights
exports.getInsights = async (req, res) => {
  try {
    let logs = mongoose_check() ? await SleepLog.find().sort({ createdAt: -1 }).limit(14) : memoryLogs.slice(0, 14);
    const insights = [];

    if (logs.length === 0) {
      return res.json([
        { icon: '🌙', text: 'Log your first sleep entry to get AI insights!', type: 'info' },
        { icon: '💡', text: 'Sleep before 11PM regularly for optimal recovery.', type: 'tip' },
        { icon: '🧠', text: 'REM sleep improves memory consolidation and creativity.', type: 'science' }
      ]);
    }

    const avgScore = logs.reduce((a, b) => a + b.analysis.score, 0) / logs.length;
    const avgDur = logs.reduce((a, b) => a + b.analysis.duration, 0) / logs.length;
    const avgMood = logs.reduce((a, b) => a + b.mood, 0) / logs.length;

    if (avgScore >= 80) insights.push({ icon: '🌟', text: `Outstanding! Your average sleep score is ${Math.round(avgScore)}/100 — elite level recovery.`, type: 'success' });
    else if (avgScore >= 65) insights.push({ icon: '✅', text: `Your average sleep score is ${Math.round(avgScore)}/100. Small improvements can push you to elite level.`, type: 'good' });
    else insights.push({ icon: '⚠️', text: `Average sleep score ${Math.round(avgScore)}/100. Focus on consistent bedtime and 7–9h sleep.`, type: 'warning' });

    if (avgDur < 7) insights.push({ icon: '⏰', text: `You're averaging ${avgDur.toFixed(1)}h — building sleep debt. Aim for 7–9h consistently.`, type: 'warning' });
    else insights.push({ icon: '✅', text: `Great sleep duration average: ${avgDur.toFixed(1)}h. Your body gets adequate recovery time.`, type: 'good' });

    if (avgMood >= 7) insights.push({ icon: '😊', text: 'High morning mood scores suggest your sleep is genuinely restorative.', type: 'success' });
    else insights.push({ icon: '😴', text: 'Low morning mood may indicate poor deep sleep. Try consistent sleep timing.', type: 'tip' });

    insights.push({ icon: '🧠', text: 'Tip: Keep your bedroom below 68°F (20°C) — cooler rooms increase deep sleep by up to 30%.', type: 'science' });
    insights.push({ icon: '💜', text: 'Your deep sleep cycles are crucial for physical recovery and immune health.', type: 'info' });

    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/sleep/:id
exports.deleteLog = async (req, res) => {
  try {
    if (mongoose_check()) {
      await SleepLog.findByIdAndDelete(req.params.id);
    } else {
      memoryLogs = memoryLogs.filter(l => l._id !== req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
