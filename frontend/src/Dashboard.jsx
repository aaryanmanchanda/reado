import React, { useState, useEffect } from "react";
import './ProgressBar.css';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProfileCard from './components/ProfileCard';
import ActivityCard from './components/ActivityCard';
import Recommendations from './components/Recommendations';
import { COLORWAYS, NAVBAR_HEIGHT, applyThemeVariables } from './theme';
import { fetchBookInfoById, fetchBookInfoByTitle } from './utils/bookCache';
import apiFetch from './utils/apiFetch';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;

const Dashboard = () => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    return savedTheme || 'natureFresh';
  });
  const [user, setUser] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [comments, setComments] = useState([]);
  const [bookInfoMap, setBookInfoMap] = useState({}); // { bookId: { title, thumbnail } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);

  useEffect(() => {
    applyThemeVariables(theme);
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, [theme]);

  // Fetch bookmarks and comments for the user
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user._id) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch bookmarks
        const bmRes = await apiFetch(`${API_URL}/users/${user._id}/bookmarks`);
        const bookmarksData = bmRes.ok ? await bmRes.json() : [];
        // Fetch comments (all by user)
        const cmRes = await apiFetch(`${API_URL}/comments?userId=${user._id}`);
        let commentsData = cmRes.ok ? await cmRes.json() : [];
        // Fallback: filter by userId on frontend if backend does not support userId query
        if (Array.isArray(commentsData) && commentsData.length && commentsData[0].userId) {
          // If userId is an object (populated), check ._id
          commentsData = commentsData.filter(c => (typeof c.userId === 'object' ? c.userId._id : c.userId) === user._id);
        }
        // Sort and limit
        const sortedBookmarks = [...bookmarksData].sort((a, b) => b.page - a.page).slice(0, 3);
        const sortedComments = [...commentsData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
        setBookmarks(sortedBookmarks);
        setComments(sortedComments);
        // Collect unique bookIds
        const bookIds = Array.from(new Set([
          ...sortedBookmarks.map(b => b.bookId),
          ...sortedComments.map(c => c.bookId)
        ]));
        // Fetch book info from Google Books API (with caching)
        const infoMap = {};
        await Promise.all(bookIds.map(async (bookId) => {
          if (!bookId) return;
          const bookInfo = await fetchBookInfoById(bookId);
          infoMap[bookId] = {
            title: bookInfo.title,
            thumbnail: bookInfo.thumbnail
          };
        }));
        setBookInfoMap(infoMap);
      } catch (err) {
        setError('Failed to load activity.');
      } finally {
        setLoading(false);
      }
    };
    if (user && user._id) fetchData();
  }, [user]);

  // Helper to get book info from Google Books API by title (uses cache utility)
  // Note: This function name conflicts with the imported one, so we'll use the imported function directly

  // Fetch recommendations from OpenRouter when bookmarks change
  useEffect(() => {
    async function getRecommendations() {
      setRecLoading(true);
      setRecError(null);
      setRecommendations([]);
      try {
        if (!bookmarks.length) {
          setRecLoading(false);
          return;
        }
        // Get titles from bookmarks
        const titles = bookmarks.map(b => {
          const info = bookInfoMap[b.bookId];
          return info?.title || '';
        }).filter(Boolean);
        if (!titles.length) {
          setRecLoading(false);
          return;
        }
        // Compose prompt
        if (!OPENROUTER_API_KEY) {
          console.warn('OpenRouter API key not configured. Recommendations feature disabled.');
          setRecommendations([]);
          setLoading(false);
          return;
        }
        
        const prompt = `I recently bookmarked these books: ${titles.join(', ')}. Please recommend 6 other books I might enjoy, just return a JSON array of book titles only, no explanation.`;
        // Call OpenRouter API
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful book recommendation assistant.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 200,
          })
        });
        if (!resp.ok) throw new Error('Failed to fetch recommendations');
        const data = await resp.json();
        // Try to parse JSON array from response
        let titlesArr = [];
        try {
          const match = data.choices[0].message.content.match(/\[.*\]/s);
          if (match) {
            titlesArr = JSON.parse(match[0]);
          } else {
            // fallback: try to parse whole content
            titlesArr = JSON.parse(data.choices[0].message.content);
          }
        } catch {
          setRecError('Could not parse recommendations.');
          setRecLoading(false);
          return;
        }
        // For each title, fetch Google Books info
        const recBooks = await Promise.all(
          titlesArr.map(async (title) => await fetchBookInfoByTitle(title))
        );
        setRecommendations(recBooks);
      } catch (err) {
        setRecError('Failed to get recommendations.');
      } finally {
        setRecLoading(false);
      }
    }
    getRecommendations();
    // eslint-disable-next-line
  }, [JSON.stringify(bookmarks), JSON.stringify(bookInfoMap)]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('selectedTheme', newTheme);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      setUser(null);
      localStorage.removeItem('user');
      navigate('/'); // Redirect to landing page
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar theme={theme} onThemeChange={handleThemeChange} user={user} onLogout={handleLogout} showUserNavToDashboard={false} />
      {/* Main dashboard area */}
      <div
        id="main-content"
        className="dashboard-main"
        role="main"
        tabIndex={-1}
        style={{
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          paddingTop: NAVBAR_HEIGHT + 56,
          paddingBottom: 56,
          paddingLeft: 0,
          paddingRight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          background: 'var(--bg-main)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          margin: 0,
        }}
      >
        {/* Dashboard area: profile + activity cards in a single rectangle */}
        <div
          className="dashboard-card-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'var(--bg-panel)',
            borderRadius: 24,
            boxShadow: '0 4px 32px rgba(0,0,0,0.13)',
            padding: '40px 48px 32px 48px',
            gap: 32,
            maxWidth: 1000,
            width: '100%',
            minWidth: 340,
          }}
        >
            <button
                onClick={() => navigate('/')}
                aria-label="Back to home"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text-dark)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '1.1rem',
                  padding: '0.4em 1.2em',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                  outline: 'none',
                  transition: 'background 0.2s',
                  marginBottom: 18,
                  marginLeft: 0,
                  alignSelf: 'flex-start',
                }}
              >
                ← Back
              </button>
          {/* Top row: profile + activity cards */}
          <div className="dashboard-top-row" style={{ display: 'flex', flexDirection: 'row', gap: 80, width: '100%', justifyContent: 'flex-start' }}>
            <div className="dashboard-profile-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 220, width: 260, flex: '0 0 260px', margin: 0, zIndex: 1, paddingTop: 0 }}>
              <ProfileCard user={user} theme={theme} />
            </div>
            <ActivityCard loading={loading} error={error} comments={comments} bookmarks={bookmarks} bookInfoMap={bookInfoMap} />
          </div>
          {/* Third card: full width below */}
          <Recommendations recLoading={recLoading} recError={recError} recommendations={recommendations} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
