import React from 'react';

const Recommendations = ({ recLoading, recError, recommendations }) => (
  <div
    style={{
      background: 'var(--bg-main)',
      borderRadius: 18,
      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
      padding: '1.5rem 1.5rem 1.2rem 1.5rem',
      color: 'var(--text-main)',
      width: '100%',
      marginTop: 8,
      minHeight: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: '1.2rem',
      letterSpacing: 0.2,
      flexDirection: 'column',
    }}
  >
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.2rem', marginBottom: 10, textAlign: 'left' }}>
        Book Recommendations For You
      </div>
      <div style={{ height: 15 }} />
      {recLoading ? (
        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Loading recommendations...</div>
      ) : recError ? (
        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{recError}</div>
      ) : recommendations.length === 0 ? (
        <div style={{ color: 'var(--text-main)', opacity: 0.7 }}>No recommendations yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, justifyContent: 'flex-start', width: '100%' }}>
          {recommendations.map((rec, i) => (
            <div key={rec.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 140 }}>
              <div style={{ width: 90, height: 130, background: '#eee', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 }}>
                {rec.thumbnail ? (
                  <img src={rec.thumbnail} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <span style={{ fontSize: 18, color: '#bbb' }} />
                )}
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', textAlign: 'center', fontSize: '1rem', marginTop: 2 }}>{rec.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default Recommendations;


