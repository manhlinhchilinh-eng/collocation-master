import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function NuancePractice() {
  const { lessonId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    api.get(`/study/nuance/${lessonId}?count=8`).then(r => {
      setQuestions(r.data.questions);
      if (r.data.questions.length === 0) setComplete(true);
    }).catch(console.error).finally(() => setLoading(false));
  }, [lessonId]);

  const handleSelect = async (option) => {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);
    setExplanation(option.explanation);
    const isCorrect = option.correct;
    setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));

    try {
      await api.post('/study/answer', {
        collocationId: questions[currentIndex].id,
        quality: isCorrect ? 4 : 1,
      });
    } catch (err) { console.error(err); }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) { setComplete(true); return; }
    setCurrentIndex(prev => prev + 1);
    setSelected(null);
    setShowResult(false);
    setExplanation('');
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  if (complete) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="container">
        <div className="study-complete">
          <span className="emoji">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'}</span>
          <h2>Kết quả Luyện Sắc Thái</h2>
          <div className="stats-grid" style={{ maxWidth: '400px', margin: '1.5rem auto' }}>
            <div className="stat-card">
              <div className="stat-value">{score.correct}/{score.total}</div>
              <div className="stat-label">Số câu đúng</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{pct}%</div>
              <div className="stat-label">Độ chính xác</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {pct >= 80 ? 'Xuất sắc! Bạn nắm rất tốt sắc thái các cụm từ.' :
             pct >= 50 ? 'Khá tốt! Hãy luyện thêm để phân biệt tốt hơn.' :
             'Cần luyện thêm! Hãy ôn lại các flashcard trước.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/study/${lessonId}`} className="btn btn-primary">📖 Ôn flashcard</Link>
            <Link to={`/quiz/${lessonId}`} className="btn btn-secondary">🧪 Làm Quiz</Link>
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
        <h1>🎯 Luyện Sắc Thái</h1>
        <p style={{ color: 'var(--text-muted)' }}>Chọn collocation phù hợp nhất với ngữ cảnh</p>
      </div>

      <div className="study-progress">
        <div className="progress-bar-container" style={{ flex: 1 }}>
          <div className="progress-bar-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
        <span className="counter">{currentIndex + 1} / {questions.length}</span>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            {q.type}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Chọn collocation đúng trong câu sau:</p>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', lineHeight: 1.6 }}>
          "{q.context}"
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>💡 Nghĩa: <em>{q.meaning}</em></p>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {q.options.map((opt, i) => {
          let cls = 'quiz-option';
          if (showResult) {
            if (opt.correct) cls += ' correct';
            else if (opt === selected && !opt.correct) cls += ' incorrect';
          } else if (opt === selected) cls += ' selected';
          return (
            <button key={i} className={cls} onClick={() => handleSelect(opt)} disabled={showResult}
              style={{ textAlign: 'left', fontSize: '1.05rem', padding: '1rem 1.25rem' }}>
              {opt.text}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', borderLeft: `3px solid ${selected?.correct ? 'var(--success)' : 'var(--danger)'}` }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            {explanation}
          </p>
          <button className="btn btn-primary" onClick={nextQuestion} style={{ marginTop: '1rem' }}>
            {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo →'}
          </button>
        </div>
      )}
    </div>
  );
}
