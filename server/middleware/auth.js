const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'collocation-master-secret-key-change-in-production-2024';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function authMiddleware(req, res, next) {
  try {
    // Check Authorization header first, then cookie
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để tiếp tục' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET, JWT_EXPIRES };
