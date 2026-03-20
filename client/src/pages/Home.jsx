import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/study/stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const progress = stats && stats.totalCards > 0 ? Math.round((stats.masteredCards / stats.totalCards) * 100) : 0;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Xin chào, {user.displayName}! 👋</h1>
        <p>Hãy cùng luyện tập collocations hôm nay</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.streak || 0}</div>
          <div className="stat-label">🔥 Chuỗi ngày học</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.dueCards || 0}</div>
          <div className="stat-label">📋 Cần ôn hôm nay</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.masteredCards || 0}</div>
          <div className="stat-label">⭐ Đã thành thạo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.accuracy || 0}%</div>
          <div className="stat-label">🎯 Độ chính xác</div>
        </div>
      </div>

      <div className="section">
        <h2>Tiến trình tổng quan</h2>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Hoàn thành</span>
            <span style={{ color: 'var(--accent)' }}>{progress}%</span>
          </div>
          <div className="progress-bar-container" style={{ height: '12px' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>{stats?.studiedCards || 0} đã học</span>
            <span>{stats?.newCards || 0} chưa học</span>
            <span>{stats?.totalCards || 0} tổng cộng</span>
          </div>
        </div>
      </div>

      {stats?.boxDistribution && stats.boxDistribution.length > 0 && (
        <div className="section">
          <h2>Hộp Leitner</h2>
          <div className="leitner-container">
            {[1, 2, 3, 4, 5].map(box => {
              const item = stats.boxDistribution.find(b => b.leitnerBox === box);
              const labels = ['Mới', 'Tập', 'Nhớ', 'Giỏi', 'Xong'];
              return (
                <div key={box} className="leitner-box">
                  <div className="box-number">Hộp {box}</div>
                  <div className="box-count">{item?.count || 0}</div>
                  <div className="box-label">{labels[box - 1]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="section">
        <h2>Bắt đầu học</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/lessons" className="btn btn-primary btn-lg">📖 Xem bài học</Link>
          {stats?.dueCards > 0 && <Link to="/lessons" className="btn btn-warning btn-lg">⚡ Ôn tập ({stats.dueCards} thẻ)</Link>}
        </div>
      </div>
    </div>
  );
}
