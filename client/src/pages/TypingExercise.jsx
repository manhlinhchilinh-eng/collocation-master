import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function TypingExercise() {
  const { lessonId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/study/typing/${lessonId}?count=10`).then(r => {
      setQuestions(r.data.questions);
      if (r.data.questions.length === 0) setComplete(true);
    }).catch(console.error).finally(() => setLoading(false));
  }, [lessonId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (showResult || !input.trim()) return;
    const q = questions[currentIndex];
    const correct = input.trim().toLowerCase() === q.answer;
    setIsCorrect(correct);
    setShowResult(true);
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    try {
      await api.post('/study/answer', { collocationId: q.id, quality: correct ? 5 : 1 });
    } catch (err) { console.error(err); }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) { setComplete(true); return; }
    setCurrentIndex(prev => prev + 1);
    setInput('');
    setShowResult(false);
    setIsCorrect(false);
    setShowHint(false);
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  if (complete) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="container">
        <div className="study-complete">
          <span className="emoji">{pct >= 80 ? '🏆' : pct >= 50 ? '✍️' : '💪'}</span>
          <h2>Kết quả Luyện Viết</h2>
          <div className="stats-grid" style={{ maxWidth: '400px', margin: '1.5rem auto' }}>
            <div className="stat-card"><div className="stat-value">{score.correct}/{score.total}</div><div className="stat-label">Đúng</div></div>
            <div className="stat-card"><div className="stat-value">{pct}%</div><div className="stat-label">Chính xác</div></div>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {pct >= 80 ? 'Xuất sắc! Bạn nhớ rất tốt các collocations.' :
             pct >= 50 ? 'Khá tốt! Hãy dùng flashcard để ôn lại.' :
             'Cần luyện thêm! Hãy quay lại ôn flashcard trước.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/study/${lessonId}`} className="btn btn-primary">📖 Ôn flashcard</Link>
            <Link to="/lessons" className="btn btn-secondary">📚 Bài khác</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="container">
      <div className="page-header">
        <h1>✍️ Luyện Viết</h1>
        <p style={{ color: 'var(--text-muted)' }}>Đọc nghĩa và gõ đúng collocation tiếng Anh</p>
      </div>

      <div className="study-progress">
        <div className="progress-bar-container" style={{ flex: 1 }}>
          <div className="progress-bar-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
        <span className="counter">{currentIndex + 1} / {questions.length}</span>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{q.type}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{q.wordCount} từ</span>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>🇻🇳 Nghĩa tiếng Việt:</p>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--accent)', marginBottom: '1rem' }}>{q.meaningVi}</h2>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>🇬🇧 Ví dụ:</p>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>{q.meaningEn}</p>
        </div>

        {showHint && !showResult && (
          <div style={{ background: 'var(--card-bg)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--warning)' }}>💡 Gợi ý: <strong>{q.hint}</strong></span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Gõ collocation tiếng Anh..."
            disabled={showResult} autoFocus
            style={{
              width: '100%', padding: '1rem', fontSize: '1.2rem', fontFamily: 'monospace',
              background: showResult ? (isCorrect ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)') : 'var(--bg-secondary)',
              border: `2px solid ${showResult ? (isCorrect ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}`,
              borderRadius: '8px', color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {!showResult && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Kiểm tra</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowHint(true)} style={{ opacity: showHint ? 0.5 : 1 }}>💡 Gợi ý</button>
            </div>
          )}
        </form>
      </div>

      {showResult && (
        <div className="card" style={{ padding: '1.5rem', borderLeft: `3px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}` }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
            {isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng!'}
          </p>
          {!isCorrect && (
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              Đáp án: <strong style={{ color: 'var(--accent)', fontSize: '1.15rem' }}>{q.answer}</strong>
            </p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Bạn đã gõ: <span style={{ fontFamily: 'monospace' }}>{input}</span>
          </p>
          <button className="btn btn-primary" onClick={nextQuestion}>
            {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo →'}
          </button>
        </div>
      )}
    </div>
  );
}
