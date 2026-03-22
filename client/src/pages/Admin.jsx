import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true);
    try {
      if (t === 'dashboard') {
        const r = await api.get('/admin/dashboard');
        setData(r.data);
      } else if (t === 'students') {
        const r = await api.get('/admin/students');
        setStudents(r.data.students);
      } else if (t === 'lessons') {
        const r = await api.get('/lessons');
        setLessons(r.data.lessons);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleLesson = async (id, isLocked) => {
    try {
      if (isLocked) await api.post(`/admin/lessons/${id}/unlock`);
      else await api.post(`/admin/lessons/${id}/lock`);
      loadTab('lessons');
    } catch (err) { console.error(err); }
  };

  const resetStudent = async (id) => {
    if (!confirm('Bạn có chắc muốn reset tiến trình học sinh này?')) return;
    try {
      await api.delete(`/admin/students/${id}/reset`);
      loadTab('students');
    } catch (err) { console.error(err); }
  };

  const viewStudent = async (id) => {
    try {
      const r = await api.get(`/admin/students/${id}`);
      setSelectedStudent(r.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <p>Quản lý bài học và học sinh</p>
      </div>

      <div className="admin-tabs">
        {['dashboard', 'lessons', 'students'].map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setSelectedStudent(null); }}>
            {t === 'dashboard' ? '📊 Tổng quan' : t === 'lessons' ? '📚 Bài học' : '👥 Học sinh'}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <>
          {tab === 'dashboard' && data && (
            <div>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-value">{data.totalStudents}</div><div className="stat-label">Học sinh</div></div>
                <div className="stat-card"><div className="stat-value">{data.totalLessons}</div><div className="stat-label">Bài học</div></div>
                <div className="stat-card"><div className="stat-value">{data.totalCollocations}</div><div className="stat-label">Collocations</div></div>
                <div className="stat-card"><div className="stat-value">{data.activeToday}</div><div className="stat-label">Học hôm nay</div></div>
              </div>
              <div className="section">
                <h2>Học sinh gần đây</h2>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Tên</th><th>Đã học</th><th>Thành thạo</th><th>Chuỗi</th><th>Lần cuối</th></tr></thead>
                    <tbody>
                      {data.recentStudents.map(s => (
                        <tr key={s.id}>
                          <td>{s.displayName}</td>
                          <td>{s.studiedCards}</td>
                          <td>{s.masteredCards}</td>
                          <td>{s.streak || 0}🔥</td>
                          <td>{s.lastStudyDate || 'Chưa học'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'lessons' && (
            <div className="section">
              <h2>Quản lý bài học</h2>
              <div className="table-container">
                <table>
                  <thead><tr><th>STT</th><th>Bài học</th><th>Level</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {lessons.map(l => (
                      <tr key={l.id}>
                        <td>{l.orderIndex}</td>
                        <td><strong>{l.titleVi}</strong><br/><span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{l.title}</span></td>
                        <td><span className={`level-badge level-${l.level}`}>{l.level}</span></td>
                        <td>{l.isGloballyLocked ? <span className="badge badge-danger">🔒 Khóa</span> : <span className="badge badge-success">🔓 Mở</span>}</td>
                        <td>
                          <button className={`btn btn-sm ${l.isGloballyLocked ? 'btn-success' : 'btn-danger'}`} onClick={() => toggleLesson(l.id, l.isGloballyLocked)}>
                            {l.isGloballyLocked ? 'Mở khóa' : 'Khóa'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'students' && !selectedStudent && (
            <div className="section">
              <h2>Danh sách học sinh</h2>
              <div className="table-container">
                <table>
                  <thead><tr><th>Tên</th><th>Đã học</th><th>Thành thạo</th><th>Chính xác</th><th>Chuỗi</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.displayName}</strong><br/><span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>@{s.username}</span></td>
                        <td>{s.studiedCards}</td>
                        <td>{s.masteredCards}</td>
                        <td>{s.totalReviews > 0 ? Math.round((s.totalCorrect / s.totalReviews) * 100) : 0}%</td>
                        <td>{s.streak || 0}🔥</td>
                        <td style={{display:'flex',gap:'0.5rem'}}>
                          <button className="btn btn-sm btn-primary" onClick={() => viewStudent(s.id)}>Chi tiết</button>
                          <button className="btn btn-sm btn-danger" onClick={() => resetStudent(s.id)}>Reset</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'students' && selectedStudent && (
            <div className="section">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedStudent(null)} style={{marginBottom:'1rem'}}>← Quay lại</button>
              <h2>{selectedStudent.student.displayName}</h2>
              <p style={{color:'var(--text-muted)',marginBottom:'1.5rem'}}>@{selectedStudent.student.username} | Streak: {selectedStudent.student.streak || 0}🔥</p>
              
              <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
                <button className="btn btn-sm btn-success" onClick={async () => {
                  const lockedIds = selectedStudent.lessonProgress.filter(lp => !lp.isUnlocked).map(lp => lp.id);
                  if (lockedIds.length === 0) return;
                  await api.post('/study/student-lesson', { studentId: selectedStudent.student.id, lessonIds: lockedIds, unlock: true });
                  viewStudent(selectedStudent.student.id);
                }}>🔓 Mở tất cả bài</button>
                <button className="btn btn-sm btn-danger" onClick={async () => {
                  const openIds = selectedStudent.lessonProgress.filter(lp => lp.isUnlocked).map(lp => lp.id);
                  if (openIds.length === 0) return;
                  await api.post('/study/student-lesson', { studentId: selectedStudent.student.id, lessonIds: openIds, unlock: false });
                  viewStudent(selectedStudent.student.id);
                }}>🔒 Khóa tất cả</button>
              </div>

              <h3 style={{marginBottom:'0.75rem'}}>Tiến trình & Khóa/Mở bài</h3>
              <div className="table-container" style={{marginBottom:'1.5rem'}}>
                <table>
                  <thead><tr><th>Bài học</th><th>Level</th><th>Đã học</th><th>Thành thạo</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {selectedStudent.lessonProgress.map(lp => {
                      const pct = lp.totalCards > 0 ? Math.round((lp.masteredCards / lp.totalCards) * 100) : 0;
                      return (
                        <tr key={lp.id}>
                          <td>{lp.titleVi}<br/><span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>{lp.title}</span></td>
                          <td><span className={`level-badge level-${lp.level}`}>{lp.level}</span></td>
                          <td>{lp.studiedCards}/{lp.totalCards}</td>
                          <td>
                            <span style={{color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--text-muted)'}}>
                              {lp.masteredCards}/{lp.totalCards} ({pct}%)
                            </span>
                          </td>
                          <td>{lp.isUnlocked ? <span className="badge badge-success">Mở</span> : <span className="badge badge-danger">Khóa</span>}</td>
                          <td>
                            <button
                              className={`btn btn-sm ${lp.isUnlocked ? 'btn-danger' : 'btn-success'}`}
                              onClick={async () => {
                                await api.post('/study/student-lesson', {
                                  studentId: selectedStudent.student.id,
                                  lessonIds: [lp.id],
                                  unlock: !lp.isUnlocked
                                });
                                viewStudent(selectedStudent.student.id);
                              }}
                            >{lp.isUnlocked ? '🔒 Khóa' : '🔓 Mở'}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedStudent.weakCards.length > 0 && (
                <>
                  <h3 style={{marginBottom:'0.75rem'}}>Điểm yếu cần cải thiện</h3>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Collocation</th><th>Nghĩa</th><th>Đúng/Tổng</th><th>Hộp</th></tr></thead>
                      <tbody>
                        {selectedStudent.weakCards.map((wc, i) => (
                          <tr key={i}>
                            <td><strong>{wc.collocation}</strong></td>
                            <td>{wc.meaningVi}</td>
                            <td>{wc.correctReviews}/{wc.totalReviews}</td>
                            <td>Hộp {wc.leitnerBox}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
