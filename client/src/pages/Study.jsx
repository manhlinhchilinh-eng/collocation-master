import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function Study() {
  const { lessonId } = useParams();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });
  const [lesson, setLesson] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/study/due/${lessonId}`),
      api.get(`/lessons/${lessonId}`),
    ]).then(([dueRes, lessonRes]) => {
      setCards(dueRes.data.cards);
      setLesson(lessonRes.data.lesson);
      if (dueRes.data.cards.length === 0) setComplete(true);
    }).catch(console.error).finally(() => setLoading(false));
  }, [lessonId]);

  const handleRate = async (quality) => {
    const card = cards[currentIndex];
    try {
      const res = await api.post('/study/answer', { collocationId: card.id, quality });
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (res.data.isCorrect ? 1 : 0),
      }));
    } catch (err) { console.error(err); }

    setFlipped(false);
    if (currentIndex + 1 >= cards.length) {
      setComplete(true);
      api.post('/study/session', { lessonId: parseInt(lessonId), cardsStudied: sessionStats.total + 1, correctAnswers: sessionStats.correct }).catch(() => {});
    } else {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  if (complete) {
    return (
      <div className="container">
        <div className="study-complete">
          <span className="emoji">🎉</span>
          <h2>Hoàn thành phiên học!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Bạn đã ôn {sessionStats.total} thẻ — Đúng: {sessionStats.correct}/{sessionStats.total}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/quiz/${lessonId}`} className="btn btn-primary">🧪 Làm Quiz</Link>
            <Link to="/lessons" className="btn btn-secondary">📚 Bài học khác</Link>
            <Link to="/" className="btn btn-secondary">🏠 Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="container">
      <div className="page-header">
        <h1>{lesson?.titleVi || 'Học Flashcard'}</h1>
        <p>{lesson?.title}</p>
      </div>

      <div className="study-progress">
        <div className="progress-bar-container" style={{ flex: 1 }}>
          <div className="progress-bar-fill" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}></div>
        </div>
        <span className="counter">{currentIndex + 1} / {cards.length}</span>
      </div>

      <div className="flashcard-container" onClick={() => setFlipped(!flipped)}>
        <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <span className="type-badge">{card.type}</span>
            <h2>{card.collocation}</h2>
            <p className="flashcard-hint">Nhấn để lật thẻ</p>
          </div>
          <div className="flashcard-back">
            <div className="meaning">{card.meaningVi}</div>
            <div className="example">"{card.example}"</div>
          </div>
        </div>
      </div>

      {flipped && (
        <div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            Bạn nhớ collocation này như thế nào?
          </p>
          <div className="rating-buttons">
            <button className="rating-btn fail" onClick={() => handleRate(0)}>😵 Quên hoàn toàn</button>
            <button className="rating-btn hard" onClick={() => handleRate(2)}>😰 Sai</button>
            <button className="rating-btn" onClick={() => handleRate(3)}>🤔 Khó nhớ</button>
            <button className="rating-btn good" onClick={() => handleRate(4)}>😊 Nhớ được</button>
            <button className="rating-btn easy" onClick={() => handleRate(5)}>🤩 Dễ dàng</button>
          </div>
        </div>
      )}
    </div>
  );
}
