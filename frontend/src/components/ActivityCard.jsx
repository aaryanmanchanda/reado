import React from 'react';

const ActivityCard = ({ loading, error, comments, bookmarks, bookInfoMap }) => (
  <div
    className="activity-card"
    style={{
      background: 'var(--bg-main)',
      borderRadius: 18,
      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
      padding: '1.5rem 1.5rem 1.2rem 1.5rem',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 18,
      flex: '0 1 100%',
      minWidth: 340,
      maxWidth: 600,
      marginLeft: '10vw',
      overflowY: 'auto',
      marginTop: 0,
    }}
  >
    <h3 style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.3rem', margin: 0, marginBottom: 10 }}>Recent Activity</h3>
    {loading ? (
      <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Loading...</div>
    ) : error ? (
      <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{error}</div>
    ) : (
      <>
        <div style={{ width: '100%' }}>
          <div className="activity-section-label" style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Recently Commented Books</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.length === 0 && <div style={{ color: 'var(--text-main)', opacity: 0.7 }}>No recent comments.</div>}
            {comments.map((c, i) => {
              const info = bookInfoMap[c.bookId] || {};
              return (
                <div key={c._id || i} className="activity-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="activity-cover" style={{ width: 44, height: 64, background: '#eee', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {info.thumbnail ? (
                      <img src={info.thumbnail} alt={info.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <span style={{ fontSize: 18, color: '#bbb' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                    <div className="activity-title" style={{ fontWeight: 600, color: 'var(--text-main)', textAlign: 'left' }}>{info.title || 'Book'}</div>
                    <div className="activity-excerpt" style={{ fontSize: '0.98rem', opacity: 0.7, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                      {c.nsfw ? 'Hidden for profanity' : `"${c.text?.slice(0, 60) || ''}${c.text && c.text.length > 60 ? '…' : ''}"`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ width: '100%', marginTop: 18 }}>
          <div className="activity-section-label" style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Recent Bookmarks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bookmarks.length === 0 && <div style={{ color: 'var(--text-main)', opacity: 0.7 }}>No recent bookmarks.</div>}
            {bookmarks.map((b, i) => {
              const info = bookInfoMap[b.bookId] || {};
              return (
                <div key={b.bookId + '-' + b.page} className="activity-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="activity-cover" style={{ width: 44, height: 64, background: '#eee', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {info.thumbnail ? (
                      <img src={info.thumbnail} alt={info.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <span style={{ fontSize: 18, color: '#bbb' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                    <div className="activity-title" style={{ fontWeight: 600, color: 'var(--text-main)', textAlign: 'left' }}>{info.title || 'Book'}</div>
                    <div className="activity-meta" style={{ fontSize: '0.98rem', opacity: 0.7, textAlign: 'left' }}>Page {b.page}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    )}
  </div>
);

export default ActivityCard;


