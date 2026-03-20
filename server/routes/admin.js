const express = require('express');
const { queryAll, queryOne, runSql } = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', (req, res) => {
  try {
    const s = queryOne("SELECT COUNT(*) as c FROM users WHERE role='student'").c;
    const l = queryOne('SELECT COUNT(*) as c FROM lessons').c;
    const co = queryOne('SELECT COUNT(*) as c FROM collocations').c;
    const a = queryOne("SELECT COUNT(DISTINCT userId) as c FROM study_sessions WHERE date(sessionDate)=date('now')").c;
    const rs = queryAll("SELECT u.id,u.username,u.displayName,u.streak,u.lastStudyDate,u.createdAt,(SELECT COUNT(*) FROM progress WHERE userId=u.id AND totalReviews>0) as studiedCards,(SELECT COUNT(*) FROM progress WHERE userId=u.id AND leitnerBox>=4) as masteredCards FROM users u WHERE u.role='student' ORDER BY u.createdAt DESC LIMIT 10");
    res.json({ totalStudents: s, totalLessons: l, totalCollocations: co, activeToday: a, recentStudents: rs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.get('/students', (req, res) => {
  try {
    const students = queryAll("SELECT u.id,u.username,u.displayName,u.email,u.streak,u.lastStudyDate,u.createdAt,(SELECT COUNT(*) FROM progress WHERE userId=u.id AND totalReviews>0) as studiedCards,(SELECT COUNT(*) FROM progress WHERE userId=u.id AND leitnerBox>=4) as masteredCards,(SELECT COALESCE(SUM(correctReviews),0) FROM progress WHERE userId=u.id) as totalCorrect,(SELECT COALESCE(SUM(totalReviews),0) FROM progress WHERE userId=u.id) as totalReviews FROM users u WHERE u.role='student' ORDER BY u.lastStudyDate DESC");
    res.json({ students });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.get('/students/:id', (req, res) => {
  try {
    const st = queryOne("SELECT id,username,displayName,email,streak,lastStudyDate,createdAt FROM users WHERE id=? AND role='student'", [parseInt(req.params.id)]);
    if (!st) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    const lp = queryAll("SELECT l.id,l.title,l.titleVi,l.level,(SELECT COUNT(*) FROM collocations WHERE lessonId=l.id) as totalCards,(SELECT COUNT(*) FROM progress p JOIN collocations c ON p.collocationId=c.id WHERE p.userId=? AND c.lessonId=l.id AND p.totalReviews>0) as studiedCards,(SELECT COUNT(*) FROM progress p JOIN collocations c ON p.collocationId=c.id WHERE p.userId=? AND c.lessonId=l.id AND p.leitnerBox>=4) as masteredCards,COALESCE((SELECT isUnlocked FROM lesson_access WHERE lessonId=l.id AND userId=?),0) as isUnlocked FROM lessons l ORDER BY l.orderIndex", [st.id, st.id, st.id]);
    const bd = queryAll('SELECT leitnerBox,COUNT(*) as count FROM progress WHERE userId=? GROUP BY leitnerBox ORDER BY leitnerBox', [st.id]);
    const wk = queryAll('SELECT c.collocation,c.meaningVi,c.type,p.easinessFactor,p.totalReviews,p.correctReviews,p.leitnerBox FROM progress p JOIN collocations c ON p.collocationId=c.id WHERE p.userId=? AND p.totalReviews>=2 AND p.easinessFactor<2.0 ORDER BY p.easinessFactor ASC LIMIT 20', [st.id]);
    res.json({ student: st, lessonProgress: lp, boxDistribution: bd, weakCards: wk });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/lessons', (req, res) => {
  try {
    const { title, titleVi, description, descriptionVi, level, orderIndex, sourceReference } = req.body;
    if (!title || !titleVi || !level) return res.status(400).json({ error: 'Thiếu thông tin' });
    const max = queryOne('SELECT COALESCE(MAX(orderIndex),0) as m FROM lessons').m;
    const r = runSql('INSERT INTO lessons (title,titleVi,description,descriptionVi,level,orderIndex,sourceReference,isGloballyLocked) VALUES (?,?,?,?,?,?,?,1)', [title, titleVi, description || '', descriptionVi || '', level, orderIndex || max + 1, sourceReference || '']);
    res.status(201).json({ lesson: queryOne('SELECT * FROM lessons WHERE id=?', [r.lastInsertRowid]) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.put('/lessons/:id', (req, res) => {
  try {
    const l = queryOne('SELECT * FROM lessons WHERE id=?', [parseInt(req.params.id)]);
    if (!l) return res.status(404).json({ error: 'Không tìm thấy' });
    const b = req.body;
    runSql('UPDATE lessons SET title=?,titleVi=?,description=?,descriptionVi=?,level=?,orderIndex=?,sourceReference=? WHERE id=?', [b.title||l.title, b.titleVi||l.titleVi, b.description!==undefined?b.description:l.description, b.descriptionVi!==undefined?b.descriptionVi:l.descriptionVi, b.level||l.level, b.orderIndex||l.orderIndex, b.sourceReference!==undefined?b.sourceReference:l.sourceReference, l.id]);
    res.json({ lesson: queryOne('SELECT * FROM lessons WHERE id=?', [l.id]) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/lessons/:id/unlock', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    runSql('UPDATE lessons SET isGloballyLocked=0 WHERE id=?', [id]);
    const students = queryAll("SELECT id FROM users WHERE role='student'");
    for (const s of students) runSql("INSERT OR REPLACE INTO lesson_access (userId,lessonId,isUnlocked,unlockedAt,unlockedBy) VALUES (?,?,1,datetime('now'),?)", [s.id, id, req.user.id]);
    res.json({ message: 'Đã mở khóa bài học' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/lessons/:id/lock', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    runSql('UPDATE lessons SET isGloballyLocked=1 WHERE id=?', [id]);
    runSql('UPDATE lesson_access SET isUnlocked=0 WHERE lessonId=?', [id]);
    res.json({ message: 'Đã khóa bài học' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/collocations', (req, res) => {
  try {
    const { lessonId, collocations } = req.body;
    if (!lessonId || !collocations || !Array.isArray(collocations)) return res.status(400).json({ error: 'Thiếu thông tin' });
    for (const c of collocations) runSql('INSERT INTO collocations (lessonId,collocation,meaningVi,example,exampleVi,type,difficulty) VALUES (?,?,?,?,?,?,?)', [lessonId, c.collocation, c.meaningVi, c.example, c.exampleVi || '', c.type, c.difficulty || 1]);
    res.status(201).json({ message: `Đã thêm ${collocations.length} collocations` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.delete('/students/:id/reset', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    runSql('DELETE FROM progress WHERE userId=?', [id]);
    runSql('DELETE FROM study_sessions WHERE userId=?', [id]);
    runSql('UPDATE users SET streak=0,lastStudyDate=NULL WHERE id=?', [id]);
    res.json({ message: 'Đã reset tiến trình' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Lỗi server' }); }
});

module.exports = router;
