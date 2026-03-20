import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Progress() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/study/stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!stats) return <div className="container"><div className="empty-state"><span className="emoji">📊</span><p>Không có dữ liệu</p></div></div>;

  const progress = stats.totalCards > 0 ? Math.round((stats.masteredCards / stats.totalCards) * 100) : 0;
  const studiedPct = stats.totalCards > 0 ? Math.round((stats.studiedCards / stats.totalCards) * 100) : 0;

  return (
    <div className="container">
      <div className="page-header">
        <h1>📊 Tiến trình học tập</h1>
        <p>Theo dõi quá trình luyện tập collocations của bạn</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">🔥 Chuỗi ngày</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.studiedCards}</div>
          <div className="stat-label">📖 Đã học</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.masteredCards}</div>
          <div className="stat-label">⭐ Thành thạo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.accuracy}%</div>
          <div className="stat-label">🎯 Chính xác</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.dueCards}</div>
          <div className="stat-label">📋 Cần ôn</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.newCards}</div>
          <div className="stat-label">🆕 Chưa học</div>
        </div>
      </div>

      <div className="section">
        <h2>Tiến trình tổng quan</h2>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span>Đã học</span><span style={{ color: 'var(--info)' }}>{studiedPct}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${studiedPct}%`, background: 'var(--info)' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span>Thành thạo</span><span style={{ color: 'var(--success)' }}>{progress}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill success" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Hộp Leitner — Phân bố thẻ</h2>
        <div className="leitner-container">
          {[1, 2, 3, 4, 5].map(box => {
            const item = stats.boxDistribution.find(b => b.leitnerBox === box);
            const labels = ['Mới học', 'Đang tập', 'Ghi nhớ', 'Giỏi', 'Thành thạo'];
            const intervals = ['Hàng ngày', '2 ngày', '4 ngày', '7 ngày', '14 ngày'];
            return (
              <div key={box} className="leitner-box">
                <div className="box-number">Hộp {box}</div>
                <div className="box-count">{item?.count || 0}</div>
                <div className="box-label">{labels[box - 1]}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>({intervals[box - 1]})</div>
              </div>
            );
          })}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          💡 Trả lời đúng → thẻ tiến lên hộp cao hơn. Trả lời sai → thẻ quay về Hộp 1.
        </p>
      </div>
    </div>
  );
}
