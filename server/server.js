const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./config/db');
const { autoSeed } = require('./seed/seedData');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Quá nhiều yêu cầu' } }));
app.use('/api', rateLimit({ windowMs: 60*1000, max: 100, message: { error: 'Quá nhiều yêu cầu' } }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/study', require('./routes/study'));
app.use('/api/admin', require('./routes/admin'));

const publicPath = path.join(__dirname, 'public');
const indexPath = path.join(publicPath, 'index.html');

// Serve static files
app.use(express.static(publicPath));

// SPA catch-all - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API not found' });
  }
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#e2e8f0">
        <h1>🚧 Building...</h1>
        <p>Frontend is being built. Please wait a moment and refresh.</p>
        <p style="color:#94a3b8;font-size:14px">If this persists, check the build logs on Render dashboard.</p>
      </body></html>
    `);
  }
});

async function start() {
  await getDb();
  console.log('✅ Database initialized');
  autoSeed();
  console.log('✅ Data seeded');
  console.log('📁 Public path:', publicPath);
  console.log('📁 index.html exists:', fs.existsSync(indexPath));
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}
start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
