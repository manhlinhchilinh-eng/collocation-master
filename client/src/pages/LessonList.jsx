import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function LessonList() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/lessons').then(r => setLessons(r.data.lessons)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Bài học Collocations</h1>
        <p>Từ cơ bản B1 đến nâng cao C1+ — Luyện thi THPT Chuyên Ngoại ngữ</p>
      </div>

      <div className="lesson-grid">
        {lessons.map(lesson => {
          const isLocked = lesson.isGloballyLocked === 1 && !lesson.isUnlocked;
          const progress = lesson.totalCards > 0 ? Math.round((lesson.masteredCards / lesson.totalCards) * 100) : 0;
          return (
            <div key={lesson.id} className={`lesson-card ${isLocked ? 'locked' : ''}`}>
              {isLocked && <span className="lock-icon">🔒</span>}
              <span className={`level-badge level-${lesson.level}`}>{lesson.level}</span>
              <h3>{lesson.title}</h3>
              <div className="lesson-vi">{lesson.titleVi}</div>
              <div className="lesson-desc">{lesson.description}</div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="lesson-stats">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {lesson.studiedCards || 0}/{lesson.totalCards} đã học
                </span>
                <span style={{ fontSize: '0.85rem', color: progress === 100 ? 'var(--success)' : 'var(--accent)' }}>
                  {progress}%
                </span>
              </div>
              {!isLocked && (
                <div className="lesson-actions">
                  <Link to={`/study/${lesson.id}`} className="btn btn-primary btn-sm">📖 Học</Link>
                  <Link to={`/quiz/${lesson.id}`} className="btn btn-secondary btn-sm">🧪 Quiz</Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
