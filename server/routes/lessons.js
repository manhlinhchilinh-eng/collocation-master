const express = require('express');
const { queryAll, queryOne } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    const lessons = queryAll(`
      SELECT l.*,
        COALESCE((SELECT isUnlocked FROM lesson_access WHERE lessonId = l.id AND userId = ?), 0) as isUnlocked,
        (SELECT COUNT(*) FROM collocations WHERE lessonId = l.id) as totalCards,
        (SELECT COUNT(*) FROM progress p JOIN collocations c ON p.collocationId = c.id WHERE p.userId = ? AND c.lessonId = l.id AND p.leitnerBox >= 4) as masteredCards,
        (SELECT COUNT(*) FROM progress p JOIN collocations c ON p.collocationId = c.id WHERE p.userId = ? AND c.lessonId = l.id AND p.totalReviews > 0) as studiedCards
      FROM lessons l ORDER BY l.orderIndex ASC
    `, [req.user.id, req.user.id, req.user.id]);
    res.json({ lessons });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [parseInt(req.params.id)]);
    if (!lesson) return res.status(404).json({ error: 'Không tìm thấy bài học' });

    const access = queryOne('SELECT isUnlocked FROM lesson_access WHERE userId = ? AND lessonId = ?', [req.user.id, lesson.id]);
    const isUnlocked = lesson.isGloballyLocked === 0 || (access && access.isUnlocked === 1);
    if (!isUnlocked && req.user.role !== 'admin') return res.status(403).json({ error: 'Bài học này chưa được mở khóa' });

    const collocations = queryAll(`
      SELECT c.*, p.easinessFactor, p.interval, p.repetitions, p.nextReview, p.leitnerBox, p.totalReviews, p.correctReviews, p.lastQuality
      FROM collocations c LEFT JOIN progress p ON p.collocationId = c.id AND p.userId = ?
      WHERE c.lessonId = ? ORDER BY c.id ASC
    `, [req.user.id, lesson.id]);
    res.json({ lesson: { ...lesson, isUnlocked }, collocations });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

module.exports = router;
