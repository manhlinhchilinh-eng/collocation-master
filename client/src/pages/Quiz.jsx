import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function Quiz() {
  const { lessonId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/study/quiz/${lessonId}?count=10`).then(r => {
      setQuestions(r.data.questions);
      if (r.data.questions.length === 0) setComplete(true);
    }).catch(console.error).finally(() => setLoading(false));
  }, [lessonId]);

  const handleSelect = async (option) => {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);
    const isCorrect = option === questions[currentIndex].correctAnswer;
    setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));

    // Update SM-2 progress
    try {
      await api.post('/study/answer', {
        collocationId: questions[currentIndex].id,
        quality: isCorrect ? 4 : 1,
      });
    } catch (err) { console.error(err); }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setComplete(true);
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setSelected(null);
    setShowResult(false);
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  if (complete) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="container">
        <div className="study-complete">
          <span className="emoji">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</span>
          <h2>Kết quả Quiz</h2>
          <div className="stats-grid" style={{ maxWidth: '400px', margin: '1.5rem auto' }}>
            <div className="stat-card">
              <div className="stat-value">{score.correct}/{score.total}</div>
              <div className="stat-label">Số câu đúng</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{pct}%</div>
              <div className="stat-label">Tỷ lệ chính xác</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/study/${lessonId}`} className="btn btn-primary">📖 Ôn tập lại</Link>
            <Link to="/lessons" className="btn btn-secondary">📚 Bài học khác</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="container">
      <div className="page-header">
        <h1>🧪 Quiz</h1>
      </div>

      <div className="study-progress">
        <div className="progress-bar-container" style={{ flex: 1 }}>
          <div className="progress-bar-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
        <span className="counter">{currentIndex + 1} / {questions.length}</span>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Điền từ còn thiếu:</p>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>{q.question}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>💡 {q.meaning}</p>
      </div>

      <div>
        {q.options.map((opt, i) => {
          let cls = 'quiz-option';
          if (showResult) {
            if (opt === q.correctAnswer) cls += ' correct';
            else if (opt === selected) cls += ' incorrect';
          } else if (opt === selected) cls += ' selected';
          return (
            <button key={i} className={cls} onClick={() => handleSelect(opt)} disabled={showResult}>
              {opt}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ color: selected === q.correctAnswer ? 'var(--success)' : 'var(--danger)', marginBottom: '0.5rem', fontWeight: 600 }}>
            {selected === q.correctAnswer ? '✅ Chính xác!' : `❌ Sai rồi! Đáp án: ${q.correctAnswer}`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Collocation: <strong style={{ color: 'var(--text-primary)' }}>{q.collocation}</strong>
          </p>
          <button className="btn btn-primary" onClick={nextQuestion}>
            {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo →'}
          </button>
        </div>
      )}
    </div>
  );
}
