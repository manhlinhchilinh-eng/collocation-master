const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
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
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) res.sendFile(path.join(publicPath, 'index.html'));
  else res.status(404).json({ error: 'API not found' });
});

async function start() {
  await getDb();
  console.log('✅ Database initialized');
  autoSeed();
  console.log('✅ Data seeded');
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}
start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
