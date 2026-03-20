const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'collocation.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

async function getDb() {
  if (db) return db;
  
  const SQL = await initSqlJs();
  
  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      displayName TEXT NOT NULL,
      role TEXT DEFAULT 'student' CHECK(role IN ('student', 'admin')),
      streak INTEGER DEFAULT 0,
      lastStudyDate TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      titleVi TEXT NOT NULL,
      description TEXT,
      descriptionVi TEXT,
      level TEXT NOT NULL CHECK(level IN ('B1', 'B2', 'B2-C1', 'C1', 'C1+')),
      orderIndex INTEGER NOT NULL,
      isGloballyLocked INTEGER DEFAULT 1,
      sourceReference TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS collocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lessonId INTEGER NOT NULL,
      collocation TEXT NOT NULL,
      meaningVi TEXT NOT NULL,
      example TEXT NOT NULL,
      exampleVi TEXT,
      type TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 5),
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lessonId) REFERENCES lessons(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      collocationId INTEGER NOT NULL,
      easinessFactor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      nextReview TEXT DEFAULT (datetime('now')),
      leitnerBox INTEGER DEFAULT 1 CHECK(leitnerBox BETWEEN 1 AND 5),
      totalReviews INTEGER DEFAULT 0,
      correctReviews INTEGER DEFAULT 0,
      lastQuality INTEGER DEFAULT 0,
      lastReviewDate TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (collocationId) REFERENCES collocations(id) ON DELETE CASCADE,
      UNIQUE(userId, collocationId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lesson_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      lessonId INTEGER NOT NULL,
      isUnlocked INTEGER DEFAULT 0,
      unlockedAt TEXT,
      unlockedBy INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lessonId) REFERENCES lessons(id) ON DELETE CASCADE,
      UNIQUE(userId, lessonId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      lessonId INTEGER,
      cardsStudied INTEGER DEFAULT 0,
      correctAnswers INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      sessionDate TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: convert sql.js result to array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || 0, changes: db.getRowsModified() };
}

module.exports = { getDb, saveDb, queryAll, queryOne, runSql };
