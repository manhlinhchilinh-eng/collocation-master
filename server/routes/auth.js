const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryAll, queryOne, runSql } = require('../config/db');
const { authMiddleware, JWT_SECRET, JWT_EXPIRES } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || !password || !displayName) return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    if (username.length < 3) return res.status(400).json({ error: 'Tên đăng nhập phải từ 3 ký tự' });
    if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

    const hashed = bcrypt.hashSync(password, 10);
    const result = runSql('INSERT INTO users (username, password, displayName, email, role) VALUES (?, ?, ?, ?, ?)', [username, hashed, displayName, email || null, 'student']);
    const user = queryOne('SELECT id, username, displayName, role FROM users WHERE id = ?', [result.lastInsertRowid]);

    // Auto-unlock global lessons
    const lessons = queryAll('SELECT id FROM lessons WHERE isGloballyLocked = 0');
    for (const l of lessons) {
      runSql("INSERT OR IGNORE INTO lesson_access (userId, lessonId, isUnlocked, unlockedAt) VALUES (?, ?, 1, datetime('now'))", [user.id, l.id]);
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7*24*60*60*1000 });
    res.status(201).json({ user, token });
  } catch (err) { console.error('Register error:', err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });

    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7*24*60*60*1000 });
    res.json({ user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role }, token });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, displayName, email, role, streak, lastStudyDate, createdAt FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json({ user });
  } catch (err) { console.error('Get me error:', err); res.status(500).json({ error: 'Lỗi server' }); }
});

router.post('/logout', (req, res) => { res.clearCookie('token'); res.json({ message: 'Đăng xuất thành công' }); });

module.exports = router;
