const express = require('express');
const { queryAll, queryOne, runSql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

function calculateSM2(prevEF, prevInterval, prevReps, quality) {
  let ef = prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;
  let interval, repetitions;
  if (quality < 3) { repetitions = 0; interval = 1; }
  else { repetitions = prevReps + 1; interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(prevInterval * ef); }
  const next = new Date(Date.now() + interval * 86400000);
  return { easinessFactor: Math.round(ef * 100) / 100, interval, repetitions, nextReview: next.toISOString() };
}

function calcLeitner(box, correct) { return correct ? Math.min(box + 1, 5) : 1; }

router.get('/due/:lessonId', authMiddleware, (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId), limit = parseInt(req.query.limit) || 20;
    const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    if (!lesson) return res.status(404).json({ error: 'Không tìm thấy bài học' });
    const access = queryOne('SELECT isUnlocked FROM lesson_access WHERE userId = ? AND lessonId = ?', [req.user.id, lessonId]);
    if (lesson.isGloballyLocked !== 0 && (!access || !access.isUnlocked) && req.user.role !== 'admin') return res.status(403).json({ error: 'Bài học chưa mở khóa' });
    const now = new Date().toISOString();
    const newCards = queryAll('SELECT c.*, 1 as leitnerBox, 0 as totalReviews FROM collocations c WHERE c.lessonId = ? AND c.id NOT IN (SELECT collocationId FROM progress WHERE userId = ?) LIMIT ?', [lessonId, req.user.id, limit]);
    const dueCards = queryAll('SELECT c.*, p.easinessFactor, p.interval, p.repetitions, p.nextReview, p.leitnerBox, p.totalReviews, p.correctReviews FROM collocations c JOIN progress p ON p.collocationId = c.id AND p.userId = ? WHERE c.lessonId = ? AND p.nextReview <= ? ORDER BY p.nextReview ASC LIMIT ?', [req.user.id, lessonId, now, limit]);
    const cards = [...dueCards, ...newCards].slice(0, limit);
    const total = queryOne('SELECT COUNT(*) as count FROM collocations WHERE lessonId = ?', [lessonId]);
    res.json({ cards, stats: { total: total.count, newCount: newCards.length, due: dueCards.length } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.get('/due-all', authMiddleware, (req, res) => {
  try {
    const now = new Date().toISOString(), limit = parseInt(req.query.limit) || 30;
    const cards = queryAll('SELECT c.*, p.easinessFactor, p.interval, p.repetitions, p.nextReview, p.leitnerBox, p.totalReviews, p.correctReviews, l.title as lessonTitle FROM collocations c JOIN progress p ON p.collocationId = c.id AND p.userId = ? JOIN lessons l ON c.lessonId = l.id LEFT JOIN lesson_access la ON la.lessonId = l.id AND la.userId = ? WHERE p.nextReview <= ? AND (l.isGloballyLocked = 0 OR la.isUnlocked = 1) ORDER BY p.nextReview ASC LIMIT ?', [req.user.id, req.user.id, now, limit]);
    res.json({ cards, count: cards.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/answer', authMiddleware, (req, res) => {
  try {
    const { collocationId, quality } = req.body;
    if (quality === undefined || quality < 0 || quality > 5) return res.status(400).json({ error: 'Quality phải từ 0-5' });
    if (!collocationId) return res.status(400).json({ error: 'Thiếu collocationId' });
    const isCorrect = quality >= 3;
    let progress = queryOne('SELECT * FROM progress WHERE userId = ? AND collocationId = ?', [req.user.id, collocationId]);
    if (!progress) {
      const sm2 = calculateSM2(2.5, 0, 0, quality);
      const lb = calcLeitner(1, isCorrect);
      runSql("INSERT INTO progress (userId, collocationId, easinessFactor, interval, repetitions, nextReview, leitnerBox, totalReviews, correctReviews, lastQuality, lastReviewDate, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'))", [req.user.id, collocationId, sm2.easinessFactor, sm2.interval, sm2.repetitions, sm2.nextReview, lb, isCorrect ? 1 : 0, quality]);
    } else {
      const sm2 = calculateSM2(progress.easinessFactor, progress.interval, progress.repetitions, quality);
      const lb = calcLeitner(progress.leitnerBox, isCorrect);
      runSql("UPDATE progress SET easinessFactor=?, interval=?, repetitions=?, nextReview=?, leitnerBox=?, totalReviews=totalReviews+1, correctReviews=correctReviews+?, lastQuality=?, lastReviewDate=datetime('now'), updatedAt=datetime('now') WHERE userId=? AND collocationId=?", [sm2.easinessFactor, sm2.interval, sm2.repetitions, sm2.nextReview, lb, isCorrect ? 1 : 0, quality, req.user.id, collocationId]);
    }
    progress = queryOne('SELECT * FROM progress WHERE userId = ? AND collocationId = ?', [req.user.id, collocationId]);
    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const user = queryOne('SELECT lastStudyDate, streak FROM users WHERE id = ?', [req.user.id]);
    if (user.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = user.lastStudyDate === yesterday ? user.streak + 1 : 1;
      runSql("UPDATE users SET lastStudyDate=?, streak=?, updatedAt=datetime('now') WHERE id=?", [today, newStreak, req.user.id]);
    }
    res.json({ progress, isCorrect });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.get('/stats', authMiddleware, (req, res) => {
  try {
    const uid = req.user.id, now = new Date().toISOString();
    const totalCards = queryOne('SELECT COUNT(*) as count FROM collocations c JOIN lessons l ON c.lessonId=l.id LEFT JOIN lesson_access la ON la.lessonId=l.id AND la.userId=? WHERE l.isGloballyLocked=0 OR la.isUnlocked=1', [uid]).count;
    const studied = queryOne('SELECT COUNT(*) as count FROM progress WHERE userId=? AND totalReviews>0', [uid]).count;
    const mastered = queryOne('SELECT COUNT(*) as count FROM progress WHERE userId=? AND leitnerBox>=4', [uid]).count;
    const due = queryOne('SELECT COUNT(*) as count FROM progress WHERE userId=? AND nextReview<=?', [uid, now]).count;
    const boxes = queryAll('SELECT leitnerBox, COUNT(*) as count FROM progress WHERE userId=? GROUP BY leitnerBox ORDER BY leitnerBox', [uid]);
    const sessions = queryAll('SELECT * FROM study_sessions WHERE userId=? ORDER BY sessionDate DESC LIMIT 7', [uid]);
    const user = queryOne('SELECT streak, lastStudyDate FROM users WHERE id=?', [uid]);
    const acc = queryOne('SELECT COALESCE(SUM(correctReviews),0) as correct, COALESCE(SUM(totalReviews),0) as total FROM progress WHERE userId=?', [uid]);
    res.json({ totalCards, studiedCards: studied, masteredCards: mastered, dueCards: due, newCards: totalCards - studied, streak: user.streak || 0, accuracy: acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : 0, boxDistribution: boxes, recentSessions: sessions });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/session', authMiddleware, (req, res) => {
  try {
    const { lessonId, cardsStudied, correctAnswers, duration } = req.body;
    runSql('INSERT INTO study_sessions (userId, lessonId, cardsStudied, correctAnswers, duration) VALUES (?, ?, ?, ?, ?)', [req.user.id, lessonId || null, cardsStudied || 0, correctAnswers || 0, duration || 0]);
    res.json({ message: 'Đã lưu phiên học' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.get('/quiz/:lessonId', authMiddleware, (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId), count = parseInt(req.query.count) || 10;
    const collocations = queryAll('SELECT * FROM collocations WHERE lessonId = ? ORDER BY RANDOM() LIMIT ?', [lessonId, count]);
    const all = queryAll('SELECT * FROM collocations');
    const questions = collocations.map(col => {
      const parts = col.collocation.split(' ');
      const bi = Math.floor(Math.random() * parts.length);
      const correct = parts[bi];
      const blanked = parts.map((p, i) => i === bi ? '______' : p).join(' ');
      const wrongs = all.filter(c => c.id !== col.id).map(c => { const cp = c.collocation.split(' '); return cp[Math.min(bi, cp.length - 1)]; }).filter(w => w && w !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
      return { id: col.id, question: blanked, meaning: col.meaningVi, example: col.example, options: [correct, ...wrongs].sort(() => Math.random() - 0.5), correctAnswer: correct, collocation: col.collocation, type: col.type };
    });
    res.json({ questions });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

module.exports = router;
