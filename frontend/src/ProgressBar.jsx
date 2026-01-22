import React, { useState, useRef, useEffect, useCallback } from "react";
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import './components/ProgressBar.css';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { COLORWAYS, NAVBAR_HEIGHT, shadeColor, applyThemeVariables } from './theme';
import { debounce } from './utils/debounce';
import { getRecentBooks, addRecentBook } from './utils/recentBooks';
import apiFetch from './utils/apiFetch';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function parseJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    return null;
  }
}

const ProgressBar = () => {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(false);
  const [hoverX, setHoverX] = useState(0);
  const [hoverValue, setHoverValue] = useState(0);
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [recentBooks, setRecentBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState({
    bookId: null,
    thumbnail: null,
    pageCount: 100,
  });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const sliderRef = useRef(null);
  const min = 0;
  const max = selectedBook.pageCount || 100;
  // For CSSTransition nodeRefs
  const commentRefs = useRef({});
  const [sortType, setSortType] = useState('Best');
  const [displayedComments, setDisplayedComments] = useState([]);
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage, default to 'natureFresh' if not found
    const savedTheme = localStorage.getItem('selectedTheme');
    return savedTheme || 'natureFresh';
  });
  const [user, setUser] = useState(null);
  const [isBookPanelCollapsed, setIsBookPanelCollapsed] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showNSFW, setShowNSFW] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [userMarkedSpoiler, setUserMarkedSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());
  const [isBookmarkMenuOpen, setIsBookmarkMenuOpen] = useState(false);
  const [selectedBookmarkColor, setSelectedBookmarkColor] = useState(null);
  const bookmarkBtnRef = useRef(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [hoveredBookmark, setHoveredBookmark] = useState(null);
  // Add state for animating slider
  const animationRef = useRef(null);
  const navigate = useNavigate();
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [dictQuery, setDictQuery] = useState("");
  const [dictResult, setDictResult] = useState(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState(null);
  const [deleteConfirmComment, setDeleteConfirmComment] = useState(null);
  const bookPanelRef = useRef(null);

  const handleDictionarySearch = async (word) => {
    setDictLoading(true);
    setDictError(null);
    setDictResult(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error("Word not found");
      const data = await res.json();
      setDictResult(data[0]);
    } catch (err) {
      setDictError("No definition found.");
    } finally {
      setDictLoading(false);
    }
  };

  // On mount: handle ?token= from OAuth callback, or restore user from localStorage, or redirect to /
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');

    if (tokenFromUrl) {
      const payload = parseJwtPayload(tokenFromUrl);
      if (payload && payload._id) {
        localStorage.setItem('token', tokenFromUrl);
        const userData = { _id: payload._id, name: payload.name, email: payload.email, picture: payload.picture };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        navigate('/');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        navigate('/');
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/');
    }
  };

  // Function to get encouraging message based on reading progress
  const getEncouragingMessage = (percentage) => {
    if (percentage === 0) return "New Beginnings!";
    if (percentage < 10) return "Great start!";
    if (percentage < 25) return "Keep going!";
    if (percentage < 50) return "Great progress!";
    if (percentage < 75) return "Halfway there!";
    if (percentage < 90) return "Almost done!";
    if (percentage < 100) return "Final stretch!";
    return "You did it!";
  };

  // Function to get font size based on message length
  const getMessageFontSize = (message) => {
    if (message.length <= 10) return "2.2rem";
    if (message.length <= 12) return "2rem";
    if (message.length <= 14) return "1.8rem";
    return "1.6rem";
  };

  // Apply theme CSS variables to document root
  useEffect(() => {
    applyThemeVariables(theme);
  }, [theme]);

  // Load recently read books on mount
  useEffect(() => {
    const recent = getRecentBooks();
    setRecentBooks(recent);
  }, []);

  // Detect touch device to disable hover behavior
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  // Fetch comments from backend for current book and filter by percent
  useEffect(() => {
    const fetchComments = async () => {
      if (!selectedBook.bookId) return;
      try {
        const res = await apiFetch(`${API_URL}/comments?bookId=${selectedBook.bookId}`);
        if (res.ok) {
          const data = await res.json();
          // Only show comments within ±2 percent of current page
          const currentPercent = max ? Math.round((value / max) * 100) : 0;
          const filtered = data.filter(
            c => typeof c.percent === 'number' && Math.abs(c.percent - currentPercent) <= 2
          );
          setComments(filtered);
          // Sort and set displayedComments as well
          let arr = [...filtered];
          if (sortType === 'Best') {
            arr.sort((a, b) => {
              const scoreA = (a.likes || 0) - (a.dislikes || 0);
              const scoreB = (b.likes || 0) - (b.dislikes || 0);
              if (scoreB !== scoreA) return scoreB - scoreA;
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
          } else if (sortType === 'Top') {
            arr.sort((a, b) => {
              const scoreA = (a.likes || 0) - (a.dislikes || 0);
              const scoreB = (b.likes || 0) - (b.dislikes || 0);
              if (scoreB !== scoreA) return scoreB - scoreA;
              return new Date(a.createdAt) - new Date(b.createdAt);
            });
          } else if (sortType === 'New') {
            arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (sortType === 'Old') {
            arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          setDisplayedComments(arr);
        } else {
          setComments([]);
          setDisplayedComments([]);
        }
      } catch (err) {
        setComments([]);
        setDisplayedComments([]);
      }
    };
    fetchComments();
  }, [selectedBook.bookId, value, max, sortType]);

  // Handler to update hover position and value
  const handleMouseMove = (e) => {
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverX(x);
    // Calculate value at cursor
    let percent = x / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    const val = Math.round(percent * (max - min) + min);
    setHoverValue(val);
  };

  // Handlers for arrow buttons
  const handleDecrement = () => {
    setValue((v) => Math.max(min, v - 1));
  };
  const handleIncrement = () => {
    setValue((v) => Math.min(max, v + 1));
  };

  // Keyboard controls for page navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if no input or textarea is focused
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDecrement();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleIncrement();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleIncrement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [min, max]);

  // Google Books search logic
  const searchBooks = useCallback(async (searchQuery) => {
    if (!searchQuery) {
      setBooks([]);
      setBooksLoading(false);
      return;
    }
    setBooksLoading(true);
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
      if (!apiKey) {
        console.error('Google Books API key not configured');
        setBooks([]);
        setBooksLoading(false);
        return;
      }
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${apiKey}`
      );
      const data = await response.json();
      setBooks(data.items || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    } finally {
      setBooksLoading(false);
    }
  }, []);

  // Create debounced search function (500ms delay) - memoized with useRef
  const debouncedSearchRef = useRef(
    debounce((searchQuery) => {
      searchBooks(searchQuery);
      
    }, 500)
  );

  // Handle input change and search
  const handleSearchInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val) {
      setBooks([]);
      setBooksLoading(false);
    } else {
      setBooksLoading(true); // Show loading immediately when user types
      debouncedSearchRef.current(val);
    }
  };

  // Handle book selection
  const handleBookSelect = (book) => {
    const pageCount = book.volumeInfo?.pageCount || book.pageCount || 100;
    const thumbnail = book.volumeInfo?.imageLinks?.thumbnail || book.thumbnail || null;
    const title = book.volumeInfo?.title || book.title || "Book Title";
    const bookId = book.id || book.bookId;
    
    // If clicking the same book, don't reset progress
    if (selectedBook.bookId === bookId) {
      return;
    }
    
    const selectedBookData = {
      bookId,
      title,
      thumbnail,
      pageCount,
    };
    
    setSelectedBook(selectedBookData);
    setValue(0); // Reset slider to start only when switching books
    
    // Add to recently read
    addRecentBook(selectedBookData);
    // Update recent books list
    setRecentBooks(getRecentBooks());
    
    // On mobile, keep panel expanded and scroll to show percentage
    if (isTouchDevice) {
      // Keep panel expanded to show percentage
      setIsBookPanelCollapsed(false);
      // Scroll to top to show percentage (search bar will be above viewport)
      setTimeout(() => {
        if (bookPanelRef.current) {
          bookPanelRef.current.scrollTop = 0;
        }
      }, 100);
    }
    
    // Clear search query
    setQuery('');
    setBooks([]);
  };

  // Sorting logic for comments
  useEffect(() => {
    const arr = [...comments];
    let sorted = arr;
    if (sortType === 'Best') {
      sorted = arr.sort((a, b) => {
        const scoreA = (a.likes || 0) - (a.dislikes || 0);
        const scoreB = (b.likes || 0) - (b.dislikes || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    } else if (sortType === 'Top') {
      sorted = arr.sort((a, b) => {
        const scoreA = (a.likes || 0) - (a.dislikes || 0);
        const scoreB = (b.likes || 0) - (b.dislikes || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    } else if (sortType === 'New') {
      sorted = arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortType === 'Old') {
      sorted = arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    setDisplayedComments(sorted);
  }, [comments, sortType]);

  // Function to handle theme changes and save to localStorage
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('selectedTheme', newTheme);
  };

  // Fetch bookmarks for current user/book
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user || !selectedBook.bookId) return;
      try {
        const res = await apiFetch(`${API_URL}/users/${user._id}/bookmarks`);
        if (res.ok) {
          const allBookmarks = await res.json();
          // Only show bookmarks for the current book
          setBookmarks(allBookmarks.filter(b => b.bookId === selectedBook.bookId));
        } else {
          setBookmarks([]);
        }
      } catch (err) {
        setBookmarks([]);
      }
    };
    fetchBookmarks();
  }, [user, selectedBook.bookId]);

  // Add bookmark handler
  const handleAddBookmark = async (color) => {
    if (!user || !selectedBook.bookId) return;
    try {
      const res = await apiFetch(`${API_URL}/users/${user._id}/bookmarks`, {
        method: 'POST',
        body: JSON.stringify({
          bookId: selectedBook.bookId,
          page: value,
          color,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookmarks(updated.filter(b => b.bookId === selectedBook.bookId));
      }
    } catch (err) {}
    setIsBookmarkMenuOpen(false);
    setSelectedBookmarkColor(null);
  };

  // Function to smoothly animate slider to a target page
  const animateSliderTo = (targetPage) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const start = value;
    const end = targetPage;
    const duration = 400; // ms
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease in-out cubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const newValue = Math.round(start + (end - start) * ease);
      setValue(newValue);
      if (t < 1 && newValue !== end) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setValue(end);
        animationRef.current = null;
      }
    };
    animationRef.current = requestAnimationFrame(step);
  };

  // Stop animation if user interacts with slider
  const handleSliderChange = (e) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setValue(Number(e.target.value));
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    if (!user) return;
    try {
      const res = await apiFetch(`${API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: user._id }),
      });
      if (res.ok) {
        setComments(comments.filter(c => c._id !== commentId));
        setDisplayedComments(displayedComments.filter(c => c._id !== commentId));
        setDeleteConfirmComment(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete comment');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Error deleting comment');
    }
  };

  return (
    <div className="progress-bar-container" style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Navbar theme={theme} onThemeChange={handleThemeChange} user={user} onLogout={handleLogout} showUserNavToDashboard={true} />
      {/* Main content below navbar */}
      <div
        className="progress-bar-main-layout"
        style={{
          display: "flex",
          flexDirection: "row",
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          paddingTop: NAVBAR_HEIGHT,
        }}
      >
        {/* Main slider area */}
        <div
          id="main-content"
          className={`main-slider-area ${isDictionaryOpen ? 'shrink-for-dictionary' : ''}`}
          role="main"
          tabIndex={-1}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          }}
        >
          {/* Comments grid fills all available space above slider */}
          {/* Comment input area */}
          <div
            className="comment-input-container"
            style={{
              width: "90%",
              maxWidth: "min(1100px, 95vw)",
              display: "flex",
              alignItems: "center",
              background: "var(--bg-panel)",
              borderRadius: "1.2rem",
              padding: "clamp(0.6rem, 1.5vw, 1.2rem)",
              marginBottom: "clamp(0.8rem, 2vh, 1.2rem)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
              gap: "clamp(0.6rem, 1.5vw, 1rem)",
              marginTop: "clamp(1rem, 3vh, 2.5rem)",
              boxSizing: "border-box",
            }}
          >
            <textarea
              className="comment-inputbox-scroll"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={user ? "Add a comment..." : "Log In to comment!"}
              readOnly={!user}
              aria-label="Add a comment"
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                borderRadius: "0.7rem",
                padding: "clamp(0.6rem, 1.5vw, 1rem)",
                fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                minHeight: "clamp(36px, 5vh, 40px)",
                maxHeight: "clamp(60px, 8vh, 80px)",
                outline: "none",
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                cursor: user ? 'text' : 'not-allowed',
                opacity: user ? 1 : 0.6,
              }}
              rows={2}
              maxLength={200}
            />
            {/* Spoiler toggle button */}
            {user && (
              <button
                onClick={() => setUserMarkedSpoiler(!userMarkedSpoiler)}
                title="Mark as Spoiler"
                aria-label="Mark as spoiler"
                aria-pressed={userMarkedSpoiler}
                className="spoiler-toggle-btn"
                style={{
                  background: userMarkedSpoiler ? "var(--accent)" : "transparent",
                  color: userMarkedSpoiler ? "var(--text-dark)" : "var(--accent)",
                  border: `2px solid var(--accent)`,
                  borderRadius: "0.7rem",
                  padding: "clamp(0.4rem, 1vw, 0.8rem)",
                  fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: userMarkedSpoiler ? "0 2px 8px rgba(0,0,0,0.13)" : "none",
                  transition: "background 0.2s, color 0.2s",
                  outline: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "clamp(36px, 5vw, 44px)",
                  height: "clamp(36px, 5vw, 44px)",
                }}
              >
                ⚠️
              </button>
            )}
            <button
              onClick={async () => {
                if (newComment.trim() && user) {
                  // Prepare comment data
                  const commentData = {
                    bookId: selectedBook.bookId || "unknown-book-id",
                    userId: user._id, // Use actual user ID from MongoDB
                    page: value,
                    percent: max ? Math.round((value / max) * 100) : 0,
                    text: newComment.trim(),
                    userMarkedSpoiler: userMarkedSpoiler,
                    bookTitle: selectedBook.title || null,
                  };
                  try {
                    const res = await apiFetch(`${API_URL}/comments`, {
                      method: "POST",
                      body: JSON.stringify(commentData),
                    });
                    if (res.ok) {
                      const savedComment = await res.json();
                      setComments([savedComment, ...comments]);
                      setNewComment("");
                      setUserMarkedSpoiler(false); // Reset toggle after posting
                    } else {
                      console.error('Failed to save comment');
                    }
                  } catch (err) {
                    console.error('Error saving comment:', err);
                  }
                } else if (!user) {
                  alert('Please log in to post comments');
                }
              }}
              className="post-comment-btn"
              style={{
                background: "var(--accent)",
                color: "var(--text-dark)",
                border: "none",
                borderRadius: "0.7rem",
                padding: "clamp(0.5rem, 1.5vw, 1.5rem) clamp(1rem, 2vw, 1.5rem)",
                fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                fontWeight: 600,
                cursor: newComment.trim() && user ? "pointer" : "not-allowed",
                boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
                transition: "background 0.2s",
                outline: "none",
                opacity: newComment.trim() && user ? 1 : 0.6,
                whiteSpace: "nowrap",
              }}
              disabled={!newComment.trim() || !user}
            >
              Post
            </button>
          </div>
          <div
            className="comment-section-scroll"
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: "2vh 0 0 0",
              boxSizing: "border-box",
            }}
          >
            <div
              className="comments-container"
              role="region"
              aria-label="Comments"
              style={{
                width: "90%",
                maxWidth: "min(1100px, 95vw)",
                display: "flex",
                flexWrap: "wrap",
                gap: "clamp(0.8rem, 2vw, 1.2rem)",
                overflowY: "auto",
                overflowX: "hidden",
                height: "clamp(200px, 40vh, 350px)",
                background: "var(--comment-bg)",
                borderRadius: "1.2rem",
                minHeight: "clamp(100px, 20vh, 110px)",
                alignItems: "flex-start",
                padding: "clamp(0.8rem, 2vw, 1.2rem)",
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              {/* Comments header: sort + NSFW/Spoiler toggles – stacked on mobile to avoid overlap */}
              <div className="comments-header" style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px 12px',
                width: '100%',
                marginBottom: "clamp(8px, 1.5vh, 12px)",
              }}>
                <div className="sort-menu" style={{ display: 'flex', gap: "clamp(6px, 1.5vw, 12px)", flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  {['Best', 'Top', 'New', 'Old'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSortType(type)}
                      className="sort-btn"
                      aria-pressed={sortType === type}
                      aria-label={`Sort comments by ${type}`}
                      style={{
                        background: sortType === type ? 'var(--accent)' : 'transparent',
                        color: sortType === type ? 'var(--text-dark)' : 'var(--accent)',
                        border: 'none',
                        borderRadius: 8,
                        padding: 'clamp(0.3em, 1vw, 1.1em) clamp(0.8em, 2vw, 1.1em)',
                        fontWeight: 600,
                        fontSize: 'clamp(0.8rem, 1.8vw, 1rem)',
                        cursor: 'pointer',
                        boxShadow: sortType === type ? '0 2px 8px rgba(0,0,0,0.13)' : 'none',
                        transition: 'background 0.2s, color 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="nsfw-spoiler-toggles" style={{
                  display: 'flex',
                  gap: "clamp(6px, 1vw, 10px)",
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                }}>
                {displayedComments.some(c => c.nsfw) && (
                  <button
                    onClick={() => setShowNSFW(v => !v)}
                    className="toggle-btn"
                    aria-pressed={showNSFW}
                    aria-label={showNSFW ? 'Hide NSFW content' : 'Show NSFW content'}
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--text-dark)',
                      border: 'none',
                      borderRadius: 8,
                      padding: 'clamp(0.3em, 1vw, 1.2em) clamp(0.8em, 2vw, 1.2em)',
                      fontWeight: 600,
                      fontSize: 'clamp(0.75rem, 1.8vw, 1rem)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                      outline: 'none',
                      transition: 'background 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {showNSFW ? 'Hide NSFW' : 'Show NSFW'}
                  </button>
                )}
                {displayedComments.some(c => c.spoiler?.isSpoiler) && (
                  <button
                    onClick={() => setShowSpoilers(v => !v)}
                    className="toggle-btn spoiler-toggle-right"
                    aria-pressed={!showSpoilers}
                    aria-label={showSpoilers ? 'Spoiler mode off' : 'Spoiler mode on'}
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--text-dark)',
                      border: 'none',
                      borderRadius: 8,
                      padding: 'clamp(0.3em, 1vw, 1.2em) clamp(0.8em, 2vw, 1.2em)',
                      fontWeight: 600,
                      fontSize: 'clamp(0.75rem, 1.8vw, 1rem)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                      outline: 'none',
                      transition: 'background 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {showSpoilers ? 'No-Spoiler Mode: OFF' : 'No-Spoiler Mode: ON'}
                  </button>
                )}
                </div>
              </div>
              <TransitionGroup component={null}>
                {displayedComments.map((comment, idx) => {
                  const key = comment._id || comment.text + idx;
                  if (!commentRefs.current[key]) {
                    commentRefs.current[key] = React.createRef();
                  }
                  return (
                    <CSSTransition
                      key={key}
                      timeout={400}
                      classNames="comment-slide"
                      nodeRef={commentRefs.current[key]}
                    >
                      <div
                        ref={commentRefs.current[key]}
                        className="comment-card"
                        style={{
                          background: theme === 'yellowDark' || theme === 'redBlack' 
                            ? "var(--bg-panel)" 
                            : theme === 'blueLight' 
                              ? '#e3f0ff'  // Faint blue
                              : theme === 'blueSerene' 
                                ? '#e8f0f8'  // Faint teal
                              : theme === 'pinkBlossom'
                                ? '#FFF0F5'  // Faint pink
                                : '#f0f8e8', // Faint green for nature theme
                          color: theme === 'yellowDark' || theme === 'redBlack' ? '#ffffff' : '#000000',
                          borderRadius: "1rem",
                          padding: "clamp(0.8rem, 2vw, 1.1rem) clamp(0.8rem, 1.5vw, 1rem)",
                          minWidth: "clamp(150px, 25vw, 180px)",
                          maxWidth: "clamp(200px, 35vw, 240px)",
                          fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                          fontWeight: 500,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
                          wordBreak: "break-word",
                          flex: "0 0 auto",
                          marginBottom: '0.2rem',
                          textAlign: 'left',
                          position: 'relative',
                        }}
                      >
                        <div 
                          style={{
                            filter: (comment.nsfw && !showNSFW) || (comment.spoiler?.isSpoiler && !showSpoilers && !revealedSpoilers.has(comment._id)) ? 'blur(6px)' : 'none',
                            transition: 'filter 0.2s',
                            cursor: comment.spoiler?.isSpoiler && !showSpoilers && !revealedSpoilers.has(comment._id) ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (comment.spoiler?.isSpoiler && !showSpoilers && !revealedSpoilers.has(comment._id)) {
                              setRevealedSpoilers(prev => new Set([...prev, comment._id]));
                            }
                          }}
                        >
                          {/* User info */}
                          {comment.userId && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              marginBottom: 8, 
                              gap: 8 
                            }}>
                              <img
                                src={comment.userId.picture}
                                alt={comment.userId.name}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  border: '1px solid var(--accent)'
                                }}
                              />
                              <span style={{ 
                                fontSize: '0.9rem', 
                                fontWeight: 600,
                                color: 'var(--accent)',
                                maxWidth: 120,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {comment.userId.name}
                              </span>
                            </div>
                          )}
                          {/* Comment text */}
                          <div style={{ marginBottom: 10 }}>
                        {comment.text}
                          </div>
                          {/* Like/Dislike buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                          <button
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: comment.likedBy && comment.likedBy.includes(user?._id) ? 'var(--accent)' : 'var(--text-main)', 
                                cursor: 'pointer', 
                                fontSize: '1.2rem', 
                                padding: 0,
                                opacity: comment.likedBy && comment.likedBy.includes(user?._id) ? 1 : 0.7,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                              }}
                            onClick={async () => {
                                if (!user) {
                                  alert('Please log in to vote');
                                  return;
                                }
                                const res = await apiFetch(`${API_URL}/comments/${comment._id}/like`, { 
                                  method: 'PATCH',
                                  body: JSON.stringify({ userId: user._id })
                                });
                              if (res.ok) {
                                const updated = await res.json();
                                setDisplayedComments(displayedComments => displayedComments.map(c => c._id === updated._id ? updated : c));
                                } else {
                                  alert('Error voting on comment');
                              }
                            }}
                            aria-label="Like"
                          >
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill={comment.likedBy && comment.likedBy.includes(user?._id) ? 'var(--accent)' : 'var(--text-main)'}
                                style={{ 
                                  opacity: comment.likedBy && comment.likedBy.includes(user?._id) ? 1 : 0.7,
                                  verticalAlign: 'middle',
                                  transform: 'translateY(1px)'
                                }}
                              >
                                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                              </svg>
                          </button>
                            <span style={{ color: 'var(--text-main)' }}>{comment.likes || 0}</span>
                          <button
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: comment.dislikedBy && comment.dislikedBy.includes(user?._id) ? 'var(--accent)' : 'var(--text-main)', 
                                cursor: 'pointer', 
                                fontSize: '1.2rem', 
                                padding: 0,
                                opacity: comment.dislikedBy && comment.dislikedBy.includes(user?._id) ? 1 : 0.7,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                              }}
                            onClick={async () => {
                                if (!user) {
                                  alert('Please log in to vote');
                                  return;
                                }
                                const res = await apiFetch(`${API_URL}/comments/${comment._id}/dislike`, { 
                                  method: 'PATCH',
                                  body: JSON.stringify({ userId: user._id })
                                });
                              if (res.ok) {
                                const updated = await res.json();
                                setDisplayedComments(displayedComments => displayedComments.map(c => c._id === updated._id ? updated : c));
                                } else {
                                  alert('Error voting on comment');
                              }
                            }}
                            aria-label="Dislike"
                          >
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill={comment.dislikedBy && comment.dislikedBy.includes(user?._id) ? 'var(--accent)' : 'var(--text-main)'}
                                style={{ 
                                  opacity: comment.dislikedBy && comment.dislikedBy.includes(user?._id) ? 1 : 0.7,
                                  verticalAlign: 'middle',
                                  transform: 'translateY(1px)'
                                }}
                              >
                                <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                              </svg>
                          </button>
                            <span style={{ color: 'var(--text-main)' }}>{comment.dislikes || 0}</span>
                          {/* Delete button - only show if user owns the comment */}
                          {user && comment.userId && (
                            (typeof comment.userId === 'object' && comment.userId._id && String(comment.userId._id) === String(user._id)) ||
                            (typeof comment.userId === 'string' && String(comment.userId) === String(user._id))
                          ) ? (
                            <button
                              onClick={() => setDeleteConfirmComment(comment)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--text-main)', 
                                cursor: 'pointer', 
                                fontSize: '1.2rem', 
                                padding: 0,
                                opacity: 0.7,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                marginLeft: 'auto',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                              aria-label="Delete comment"
                              title="Delete comment"
                            >
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ 
                                  verticalAlign: 'middle',
                                  transform: 'translateY(1px)'
                                }}
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                        </div>
                        {/* NSFW warning overlay */}
                        {comment.nsfw && !showNSFW && (
                          <div
                            className="nsfw-overlay"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'rgba(0,0,0,0.35)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 'clamp(0.75rem, 1.8vw, 1.1rem)',
                              borderRadius: '1rem',
                              zIndex: 1,
                              pointerEvents: 'none',
                              textAlign: 'center',
                              padding: '0.5rem',
                              boxSizing: 'border-box',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                          >
                            <span style={{ 
                              maxWidth: '100%',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              display: 'inline-block',
                            }}>NSFW - Hidden</span>
                          </div>
                        )}
                        {/* Spoiler warning overlay */}
                        {comment.spoiler?.isSpoiler && !showSpoilers && !revealedSpoilers.has(comment._id) && (
                          <div
                            className="spoiler-overlay"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'rgba(0,0,0,0.35)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 'clamp(0.75rem, 1.8vw, 1.1rem)',
                              borderRadius: '1rem',
                              zIndex: 1,
                              cursor: 'pointer',
                              textAlign: 'center',
                              padding: '0.5rem',
                              boxSizing: 'border-box',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                            onClick={() => {
                              setRevealedSpoilers(prev => new Set([...prev, comment._id]));
                            }}
                          >
                            <span style={{ 
                              maxWidth: '100%',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              display: 'inline-block',
                            }}>⚠️ Spoiler - Click to reveal</span>
                          </div>
                        )}
                      </div>
                    </CSSTransition>
                  );
                })}
              </TransitionGroup>
            </div>
          </div>
          {/* Navigation and action buttons */}
          <div
            className="navigation-buttons"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "clamp(1vh, 2vh, 2vh)",
              gap: "clamp(0.8rem, 2vw, 1.5rem)",
              position: "relative",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleDecrement}
              className="nav-button"
              style={{
                background: "var(--accent)",
                color: "var(--text-dark)",
                border: "none",
                borderRadius: "50%",
                width: "clamp(44px, 6vw, 56px)",
                height: "clamp(44px, 6vw, 56px)",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, transform 0.1s",
                outline: "none",
              }}
              aria-label="Decrement"
            >
              &lt;
            </button>
            <button
              onClick={handleIncrement}
              className="nav-button"
              style={{
                background: "var(--accent)",
                color: "var(--text-dark)",
                border: "none",
                borderRadius: "50%",
                width: "clamp(44px, 6vw, 56px)",
                height: "clamp(44px, 6vw, 56px)",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, transform 0.1s",
                outline: "none",
              }}
              aria-label="Increment"
            >
              &gt;
            </button>
            {/* Bookmark button */}
            <button
              ref={bookmarkBtnRef}
              onClick={() => setIsBookmarkMenuOpen((v) => !v)}
              className="action-button"
              style={{
                background: "var(--accent)",
                color: "var(--text-dark)",
                border: "none",
                borderRadius: "50%",
                width: "clamp(44px, 6vw, 56px)",
                height: "clamp(44px, 6vw, 56px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "background 0.2s, transform 0.1s",
                outline: "none",
                position: 'relative',
                zIndex: 20,
              }}
              aria-label="Add Bookmark"
            >
              {/* Bookmark SVG icon */}
              <svg width="clamp(22px, 4vw, 28px)" height="clamp(22px, 4vw, 28px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            {/* Dictionary button */}
            <button
              onClick={() => setIsDictionaryOpen(v => !v)}
              className="action-button"
              style={{
                background: "var(--accent)",
                color: "var(--text-dark)",
                border: "none",
                borderRadius: "50%",
                width: "clamp(44px, 6vw, 56px)",
                height: "clamp(44px, 6vw, 56px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "background 0.2s, transform 0.1s",
                outline: "none",
                position: 'relative',
                zIndex: 20,
              }}
              aria-label="Toggle Dictionary"
            >
              {/* Dictionary SVG icon (book with 'A') */}
              <svg width="clamp(22px, 4vw, 28px)" height="clamp(22px, 4vw, 28px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <text x="8.5" y="16" fontSize="8" fill="currentColor" fontFamily="Arial" fontWeight="bold">A</text>
              </svg>
            </button>
            {/* Sliding Dictionary Panel */}
            <div className={`dictionary-panel${isDictionaryOpen ? ' open' : ''}`}
              style={{
                pointerEvents: isDictionaryOpen ? 'auto' : 'none',
                background: 'linear-gradient(135deg, var(--bg-input) 80%, var(--bg-panel) 100%)',
                color: 'var(--text-main)',
                borderRight: '2.5px solid var(--accent)',
                boxShadow: '4px 0 24px -4px rgba(0,0,0,0.13)',
                borderTop: 'none',
              }}
              tabIndex={-1}
              aria-modal="true"
              role="dialog"
            >
              <div style={{ fontWeight: 700, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', color: 'var(--accent)', marginBottom: "clamp(12px, 2vh, 18px)", width: '100%', textAlign: 'center', letterSpacing: 1 }}>Dictionary</div>
              <input
                type="text"
                value={dictQuery}
                onChange={e => setDictQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleDictionarySearch(dictQuery); }}
                placeholder="Enter a word..."
                className="dictionary-input"
                style={{
                  width: '100%',
                  padding: 'clamp(0.6rem, 1.5vw, 1.2rem)',
                  borderRadius: '1.2rem',
                  border: '2px solid var(--accent)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                  marginBottom: "clamp(0.8rem, 1.5vh, 1.2rem)",
                  outline: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                  fontWeight: 500,
                }}
                autoFocus={isDictionaryOpen}
              />
              <button
                onClick={() => handleDictionarySearch(dictQuery)}
                className="dictionary-search-btn"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text-dark)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                  padding: 'clamp(0.3em, 1vw, 1.2em)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                  outline: 'none',
                  transition: 'background 0.2s',
                  marginBottom: "clamp(12px, 2vh, 18px)",
                  width: '100%',
                  letterSpacing: 0.5,
                }}
                disabled={!dictQuery.trim()}
              >
                Search
              </button>
              {dictLoading && <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Loading...</div>}
              {dictError && <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{dictError}</div>}
              {dictResult && (
                <div className="dictionary-result" style={{ width: '100%', marginTop: "clamp(8px, 1.5vh, 10px)" }}>
                  <div style={{ fontWeight: 700, fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'var(--accent)', marginBottom: 6 }}>{dictResult.word}</div>
                  {dictResult.phonetics && dictResult.phonetics[0]?.text && (
                    <div style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', color: 'var(--text-main)', marginBottom: 8 }}>
                      <em>{dictResult.phonetics[0].text}</em>
                    </div>
                  )}
                  {dictResult.meanings && dictResult.meanings.map((meaning, idx) => (
                    <div key={idx} style={{ marginBottom: "clamp(8px, 1.5vh, 10px)" }}>
                      <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)' }}>{meaning.partOfSpeech}</div>
                      <ul style={{ margin: 0, paddingLeft: "clamp(14px, 2vw, 18px)" }}>
                        {meaning.definitions.map((def, i) => (
                          <li key={i} style={{ color: 'var(--text-main)', fontSize: 'clamp(0.85rem, 2vw, 1rem)', marginBottom: 4 }}>{def.definition}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setIsDictionaryOpen(false)}
                className="dictionary-close-btn"
                style={{
                  marginTop: "clamp(12px, 2vh, 18px)",
                  background: 'var(--accent)',
                  color: 'var(--text-dark)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                  padding: 'clamp(0.3em, 1vw, 1.2em)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                  outline: 'none',
                  transition: 'background 0.2s',
                  width: '100%',
                  letterSpacing: 0.5,
                }}
              >
                Close
              </button>
            </div>
            {/* Gap between dictionary panel and main content */}
            {isDictionaryOpen && <div className="dictionary-panel-gap" style={{ position: 'fixed', top: NAVBAR_HEIGHT, left: 'clamp(250px, 20vw, 270px)', zIndex: 1100, height: '100vh', width: 'clamp(20px, 2vw, 24px)' }} />}
            {/* Bookmark color picker menu */}
            {isBookmarkMenuOpen && (
              <div
                className="bookmark-menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + clamp(8px, 1.5vh, 12px))',
                  left: 0,
                  background: `var(--bg-panel)`,
                  borderRadius: 16,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                  padding: 'clamp(10px, 1.5vw, 16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: "clamp(8px, 1.5vw, 12px)",
                  zIndex: 30,
                  minWidth: "clamp(180px, 30vw, 220px)",
                  border: '2px solid var(--accent)',
                  maxHeight: "clamp(250px, 40vh, 340px)",
                  overflowY: 'auto',
                }}
              >
                {Object.entries(COLORWAYS).map(([themeKey, themeObj]) => {
                  const accent = themeObj['--accent'];
                  const tints = [
                    shadeColor(accent, 40),
                    shadeColor(accent, 20),
                    accent,
                    shadeColor(accent, -20),
                    shadeColor(accent, -40),
                  ];
                  return (
                    <div key={themeKey} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                      {/* Theme swatch/label */}
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        background: accent,
                        border: '1.5px solid #fff',
                        marginRight: 6,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                      }} title={themeObj.name} />
                      {/* Tints for this theme */}
                      {tints.map((color, idx) => (
                        <div
                          key={color}
                          onClick={() => handleAddBookmark(color)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: color,
                            border: selectedBookmarkColor === color ? '3px solid var(--accent)' : '2px solid #fff',
                            boxShadow: selectedBookmarkColor === color ? '0 0 0 3px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.10)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            transition: 'border 0.2s, box-shadow 0.2s',
                          }}
                        >
                          {selectedBookmarkColor === color && (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                position: 'absolute',
                                top: 2,
                                left: 2,
                                background: 'rgba(0,0,0,0.18)',
                                borderRadius: '50%',
                                opacity: 0.85,
                              }}
                            >
                              <polyline points="20 6 10 18 4 12" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="slider-container" style={{ position: "relative", width: "min(90vw, 60vw)", maxWidth: "800px" }}>
            <input
              ref={sliderRef}
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={handleSliderChange}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onMouseMove={handleMouseMove}
              aria-label="Current page"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={`Page ${value} of ${max}`}
              style={{
                width: "100%",
                height: "clamp(2.5rem, 5vh, 3.5rem)",
                accentColor: "var(--accent)",
                background: "var(--accent)",
                borderRadius: "2rem",
                boxShadow: "0 4px 32px rgba(0,0,0,0.2)",
                outline: "none",
                marginBottom: "clamp(1.5vh, 2.5vh, 2.5vh)",
                position: 'relative',
                zIndex: 1,
              }}
            />
            {/* Bookmark markers */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2,
            }}>
              {bookmarks.map((b, i) => {
                const percent = max ? b.page / max : 0;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHoveredBookmark(i)}
                    onMouseLeave={() => setHoveredBookmark(null)}
                    onClick={() => animateSliderTo(b.page)}
                    style={{
                      position: 'absolute',
                      left: `calc(${percent * 100}%)`,
                      top: 'calc(50% - 7px)',
                      width: 9,
                      height: 22,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      pointerEvents: 'auto',
                      zIndex: hoveredBookmark === i ? 10 : 2,
                      background: 'transparent',
                      cursor: 'pointer',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {/* Triangle pointer */}
                    <div style={{
                      width: 0,
                      height: 0,
                      borderLeft: '4.5px solid transparent',
                      borderRight: '4.5px solid transparent',
                      borderBottom: `7px solid ${b.color}`,
                      marginBottom: -2,
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))',
                      opacity: 0.7,
                    }} />
                    {/* Rectangle body */}
                    <div style={{
                      width: 9,
                      height: 18,
                      borderRadius: '5px',
                      background: b.color,
                      border: '1.5px solid rgba(255,255,255,0.55)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                      opacity: 0.65,
                      transition: 'box-shadow 0.18s, opacity 0.18s',
                    }} />
                    {hoveredBookmark === i && (
                      <div
                        className="bookmark-tooltip"
                        style={{
                          position: 'absolute',
                          top: "clamp(24px, 4vh, 28px)",
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--bg-panel)',
                          color: 'var(--text-main)',
                          border: '1.5px solid var(--accent)',
                          borderRadius: 8,
                          padding: 'clamp(3px, 0.5vw, 12px)',
                          fontSize: 'clamp(0.8rem, 1.8vw, 0.98rem)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                          zIndex: 20,
                          marginTop: 2,
                          opacity: 1,
                        }}
                      >
                        {`Bookmark: page ${b.page}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hover && (
              <div
                className="slider-hover-tooltip"
                style={{
                  position: "absolute",
                  left: `calc(${hoverX}px - clamp(20px, 3vw, 24px))`,
                  top: "clamp(-2rem, -2.5rem, -2.5rem)",
                  background: "var(--bg-panel)",
                  color: "var(--accent)",
                  padding: "clamp(0.2rem, 0.5vw, 0.8rem)",
                  borderRadius: "0.7rem",
                  fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
                  fontWeight: 600,
                  pointerEvents: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  border: "1.5px solid var(--accent)",
                  transition: "opacity 0.2s",
                  zIndex: 1000,
                  whiteSpace: "nowrap",
                }}
              >
                {hoverValue}
              </div>
            )}
          </div>
          <div
            className="page-counter"
            style={{
              color: "var(--accent)",
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              marginTop: "clamp(-0.3rem, -0.5rem, -0.5rem)",
              fontWeight: 'bold',
              letterSpacing: "0.5px",
              fontFamily: '"Futura"',
            }}
          >
            {value}/{max}
          </div>
        </div>
        {/* Right panel */}
        <div
          ref={bookPanelRef}
          className={`book-panel ${isBookPanelCollapsed ? 'collapsed' : ''}`}
          style={{
            width: isBookPanelCollapsed ? "clamp(140px, 20vw, 180px)" : "clamp(280px, 28vw, 400px)",
            minWidth: isBookPanelCollapsed ? "clamp(140px, 20vw, 180px)" : "clamp(280px, 28vw, 320px)",
            background: "var(--bg-panel)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: isBookPanelCollapsed ? "center" : "flex-start",
            padding: "clamp(1.5vh, 3vh, 3vh) clamp(1vw, 2vw, 2vw)",
            boxSizing: "border-box",
            transition: "width 0.15s ease, min-width 0.15s ease",
            position: "relative",
            minHeight: isBookPanelCollapsed ? "100vh" : "auto",
            overflowY: "auto",
            overflowX: "hidden",
          }}
          onMouseEnter={!isTouchDevice ? () => setIsBookPanelCollapsed(false) : undefined}
          onMouseLeave={!isTouchDevice ? () => setIsBookPanelCollapsed(true) : undefined}
          onTouchStart={() => {
            // On mobile, keep panel expanded when touched
            if (isTouchDevice && isBookPanelCollapsed) {
              setIsBookPanelCollapsed(false);
            }
          }}
        >
          {/* Search bar - at the very top, but initially scrolled out of view when book is selected */}
          {!isBookPanelCollapsed && (
            <>
              <div style={{ 
                width: "100%", 
                marginBottom: selectedBook.bookId && isTouchDevice ? "0" : "clamp(1vh, 1.5vh, 1.5vh)",
                paddingTop: selectedBook.bookId && isTouchDevice ? "200px" : "0",
                transition: "padding-top 0.3s ease",
              }}>
                <input
                  type="text"
                  value={query}
                  onChange={handleSearchInput}
                  placeholder="Search books to switch..."
                  aria-label="Search books"
                  className="book-search-input"
                  style={{
                    width: "100%",
                    padding: "clamp(0.6rem, 1.5vw, 1.2rem)",
                    borderRadius: "1.2rem",
                    border: "none",
                    background: "var(--bg-input)",
                    color: "var(--text-main)",
                    fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                    outline: "none",
                  }}
                />
              </div>
              
              {/* Recently Read Section */}
              {recentBooks.length > 0 && !query && (
                <div style={{ width: "100%", marginBottom: "2vh" }}>
                  <div style={{
                    color: "var(--accent)",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    paddingLeft: "0.5rem",
                  }}>
                    Recently Read
                  </div>
                  <div
                    className="comment-section-scroll recent-books-scroll"
                    style={{
                      width: "100%",
                      color: "var(--text-main)",
                      maxHeight: "clamp(150px, 25vh, 200px)",
                      overflowY: "auto",
                      overflowX: "hidden",
                      marginBottom: "1vh",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      {recentBooks.map((book) => (
                        <div
                          key={book.bookId}
                          onClick={() => handleBookSelect(book)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.8rem",
                            padding: "0.6rem",
                            borderRadius: 8,
                            background: selectedBook.bookId === book.bookId ? "var(--accent)" : "var(--bg-input)",
                            cursor: "pointer",
                            transition: "background 0.15s",
                            border: selectedBook.bookId === book.bookId ? "2px solid var(--accent)" : "2px solid transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedBook.bookId !== book.bookId) {
                              e.currentTarget.style.background = "var(--bg-panel)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedBook.bookId !== book.bookId) {
                              e.currentTarget.style.background = "var(--bg-input)";
                            }
                          }}
                        >
                          {book.thumbnail ? (
                            <img
                              src={book.thumbnail}
                              alt={book.title}
                              style={{
                                width: 40,
                                height: 56,
                                borderRadius: 4,
                                objectFit: "cover",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 56,
                                borderRadius: 4,
                                background: "var(--bg-panel)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-main)",
                                fontSize: "0.7rem",
                                flexShrink: 0,
                                opacity: 0.6,
                              }}
                            >
                              📖
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: selectedBook.bookId === book.bookId ? "var(--text-dark)" : "var(--text-main)",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                marginBottom: "0.2rem",
                              }}
                            >
                              {book.title}
                            </div>
                            {selectedBook.bookId === book.bookId && (
                              <div
                                style={{
                                  color: "var(--text-dark)",
                                  fontSize: "0.85rem",
                                  opacity: 0.8,
                                }}
                              >
                                Currently reading
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

              {/* Reading progress indicator - show when book is selected (collapsed on desktop, always on mobile when expanded) */}
          {selectedBook.bookId && (
            <>
              {/* On mobile when expanded, show progress at top */}
              {!isBookPanelCollapsed && isTouchDevice && (
                <>
                  <div
                    className="progress-message"
                    style={{
                      color: "var(--accent)",
                      fontSize: "clamp(1.1rem, 3vw, 1.8rem)",
                      fontWeight: "bold",
                      textAlign: "center",
                      marginBottom: "clamp(1vh, 2vh, 2vh)",
                      marginTop: "clamp(1vh, 2vh, 2vh)",
                      wordBreak: "normal",
                      overflowWrap: "break-word",
                      whiteSpace: "normal",
                      width: "100%",
                      lineHeight: "1.3",
                      padding: "0 clamp(0.5rem, 2vw, 1rem)",
                    }}
                  >
                    {getEncouragingMessage(max ? Math.round((value / max) * 100) : 0)}
                  </div>
                  <div
                    className="progress-percentage"
                    style={{
                      color: "var(--accent)",
                      fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
                      fontWeight: "bold",
                      textAlign: "center",
                      marginBottom: "clamp(1.5vh, 3vh, 3vh)",
                      wordBreak: "break-word",
                      width: "100%",
                      lineHeight: "1.3",
                      padding: "0 clamp(0.5rem, 2vw, 1rem)",
                    }}
                  >
                    You've read <span style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700 }}>{max ? Math.round((value / max) * 100) : 0}%</span>
                  </div>
                </>
              )}
              
              {/* On desktop when collapsed, show progress */}
              {isBookPanelCollapsed && !isTouchDevice && (
                <>
                  <div
                    className="progress-message"
                    style={{
                      color: "var(--accent)",
                      fontSize: "clamp(0.95rem, 2.2vw, 1.6rem)",
                      fontWeight: "bold",
                      textAlign: "center",
                      marginBottom: "clamp(3vh, 6vh, 6vh)",
                      wordBreak: "normal",
                      overflowWrap: "break-word",
                      whiteSpace: "normal",
                      maxWidth: "clamp(140px, 20vw, 160px)",
                      lineHeight: "1.2",
                      padding: "0 clamp(0.2rem, 1vw, 0.3rem)",
                      marginTop: "clamp(-10vh, -15vh, -15vh)",
                    }}
                  >
                    {getEncouragingMessage(max ? Math.round((value / max) * 100) : 0)}
                  </div>
                  <div
                    className="progress-percentage"
                    style={{
                      color: "var(--accent)",
                      fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
                      fontWeight: "bold",
                      textAlign: "center",
                      marginBottom: "clamp(1vh, 1.5vh, 1.5vh)",
                      wordBreak: "break-word",
                      maxWidth: "clamp(120px, 18vw, 140px)",
                      lineHeight: "1.2",
                      padding: "0 clamp(0.3rem, 1vw, 0.5rem)",
                    }}
                  >
                    You've now read <span style={{ fontSize: "clamp(1.4rem, 3.5vw, 1.8rem)" }}>{max ? Math.round((value / max) * 100) : 0}%</span> of
                  </div>
                </>
              )}
            </>
          )}

          {/* Book selection prompt - only show when collapsed and no book selected */}
          {isBookPanelCollapsed && !selectedBook.bookId && (
            <div
              className="select-book-prompt"
              style={{
                color: "var(--accent)",
                fontSize: "clamp(1.1rem, 2.8vw, 1.4rem)",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: "clamp(3vh, 6vh, 6vh)",
                wordBreak: "normal",
                overflowWrap: "break-word",
                whiteSpace: "normal",
                maxWidth: "clamp(140px, 20vw, 160px)",
                lineHeight: "1.2",
                padding: "0 clamp(0.2rem, 1vw, 0.3rem)",
                marginTop: "clamp(-10vh, -15vh, -15vh)",
              }}
            >
              Select a book!
            </div>
          )}

          {/* Book cover placeholder or image */}
          <div
            className="book-cover"
            style={{
              width: isBookPanelCollapsed ? "clamp(80px, 12vw, 100px)" : "clamp(120px, 20vw, 160px)",
              height: isBookPanelCollapsed ? "clamp(110px, 18vw, 140px)" : "clamp(170px, 28vw, 220px)",
              background: "var(--bg-input)",
              borderRadius: "1rem",
              marginBottom: isBookPanelCollapsed ? "clamp(0.5vh, 1vh, 1vh)" : "clamp(1vh, 2vh, 2vh)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-main)",
              fontSize: isBookPanelCollapsed ? "clamp(0.7rem, 1.5vw, 0.8rem)" : "clamp(1rem, 2vw, 1.2rem)",
              fontStyle: "italic",
              boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
              overflow: "hidden",
              transition: "width 0.3s ease, height 0.3s ease, font-size 0.3s ease, margin-bottom 0.3s ease",
            }}
          >
            {selectedBook.thumbnail ? (
              <img
                src={selectedBook.thumbnail}
                alt={selectedBook.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              isBookPanelCollapsed ? "Cover" : "Book Cover"
            )}
          </div>

          {/* Book title - only show when expanded or if collapsed with a book selected */}
          {(!isBookPanelCollapsed || selectedBook.title !== "Book Title") && (
          <div
            className="book-title"
            style={{
              color: "var(--accent)",
                fontSize: isBookPanelCollapsed ? "clamp(0.85rem, 1.8vw, 1rem)" : "clamp(1.1rem, 2.5vw, 1.4rem)",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "clamp(0.5vh, 1vh, 1vh)",
              wordBreak: "break-word",
                maxWidth: isBookPanelCollapsed ? "clamp(120px, 18vw, 140px)" : "100%",
                lineHeight: isBookPanelCollapsed ? "1.3" : "1.4",
                padding: isBookPanelCollapsed ? "0 clamp(0.3rem, 1vw, 0.5rem)" : "0",
            }}
          >
            {selectedBook.title}
          </div>
          )}

          {/* Book results - only show when expanded */}
          {!isBookPanelCollapsed && (
          <div
            className="comment-section-scroll book-results-scroll"
            style={{
              width: "100%",
              marginTop: query ? "2vh" : "0",
              color: "var(--text-main)",
              maxHeight: query ? "clamp(200px, 30vh, 260px)" : 0,
              overflowY: "auto",
              overflowX: "hidden",
              flex: query ? "1 1 auto" : "0 0 auto",
            }}
          >
            {booksLoading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '2rem',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  border: `4px solid var(--bg-panel)`,
                  borderTop: `4px solid var(--accent)`,
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <div style={{ 
                  color: 'var(--accent)', 
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}>
                  Searching books...
                </div>
              </div>
            ) : books.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {books.map((book) => (
                  <li
                    key={book.id}
                    style={{
                      marginBottom: 12,
                      cursor: "pointer",
                      padding: "0.5em 0.7em",
                      borderRadius: 8,
                        background: "var(--bg-input)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "var(--bg-panel)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "var(--bg-input)";
                    }}
                    onClick={() => handleBookSelect(book)}
                    onKeyDown={e => { if (e.key === 'Enter') handleBookSelect(book); }}
                    tabIndex={0}
                  >
                      <strong style={{ color: "var(--text-main)" }}>{book.volumeInfo.title}</strong>
                    {book.volumeInfo.authors && (
                        <span style={{ color: "var(--text-main)", opacity: 0.7, fontWeight: 400 }}>
                        {" by " + book.volumeInfo.authors.join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : query ? (
              <div style={{ 
                color: 'var(--text-main)', 
                opacity: 0.7, 
                textAlign: 'center',
                padding: '1rem',
                fontSize: '0.95rem'
              }}>
                No books found
              </div>
            ) : null}
          </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmComment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setDeleteConfirmComment(null)}
        >
          <div
            style={{
              background: 'var(--bg-panel)',
              borderRadius: '1.2rem',
              padding: 'clamp(1.5rem, 3vw, 2rem)',
              maxWidth: 'clamp(300px, 90vw, 400px)',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              border: '2px solid var(--accent)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                color: 'var(--accent)',
                fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                fontWeight: 700,
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              Delete Comment?
            </h3>
            <p
              style={{
                color: 'var(--text-main)',
                fontSize: 'clamp(1rem, 2vw, 1.1rem)',
                marginBottom: '1.5rem',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={() => setDeleteConfirmComment(null)}
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  border: '2px solid var(--accent)',
                  borderRadius: '0.7rem',
                  padding: 'clamp(0.6rem, 1.5vw, 0.8rem) clamp(1.2rem, 3vw, 1.8rem)',
                  fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-panel)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-input)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteComment(deleteConfirmComment._id)}
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text-dark)',
                  border: 'none',
                  borderRadius: '0.7rem',
                  padding: 'clamp(0.6rem, 1.5vw, 0.8rem) clamp(1.2rem, 3vw, 1.8rem)',
                  fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                  transition: 'background 0.2s, transform 0.1s',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;