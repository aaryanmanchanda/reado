import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyThemeVariables, COLORWAYS, NAVBAR_HEIGHT } from '../theme';
import './LandingPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const LandingPage = () => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    return savedTheme || 'yellowDark';
  });
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const navigate = useNavigate();
  const sectionRefs = useRef([]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyThemeVariables(theme);
  }, [theme]);

  // Handle scroll for parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Check which sections are visible
      const newVisibleSections = new Set();
      sectionRefs.current.forEach((ref, index) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
          if (isVisible) {
            newVisibleSections.add(index);
          }
        }
      });
      setVisibleSections(newVisibleSections);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for existing user and handle OAuth callback
  useEffect(() => {
    const handleOAuthResponse = async () => {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          try {
            // Fetch user profile from Google
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            const userData = await response.json();
            
            // Send user data to backend
            const backendResponse = await fetch(`${API_URL}/users/auth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                googleId: userData.id,
                name: userData.name,
                email: userData.email,
                picture: userData.picture,
                accessToken: accessToken
              })
            });
            
            if (backendResponse.ok) {
              const backendUser = await backendResponse.json();
              const fullUserData = {
                ...userData,
                accessToken,
                _id: backendUser.user._id
              };
              
              setUser(fullUserData);
              localStorage.setItem('user', JSON.stringify(fullUserData));
              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname);
              // Navigate to reading page
              navigate('/reading');
            } else {
              console.error('Failed to save user to backend');
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
      }
    };

    // Check if user is already logged in from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    handleOAuthResponse();
  }, [navigate]);

  const handleStartReading = () => {
    if (user) {
      // User is authenticated, navigate to reading page
      navigate('/reading');
    } else {
      // User not authenticated, redirect to Google OAuth
      const clientId = process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID || '796244288003-icno500m7k5r09bev7s288ar5trtui07.apps.googleusercontent.com';
      const redirectUri = process.env.REACT_APP_OAUTH_REDIRECT_URI || window.location.origin;
      window.location.href =
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=profile%20email`;
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('selectedTheme', newTheme);
  };

  return (
    <div className="landing-page" style={{ background: 'var(--bg-main)', position: 'relative' }}>
      {/* Floating decorative shapes */}
      
      
      {/* Navbar */}
      <nav
        style={{
          width: '100%',
          height: NAVBAR_HEIGHT,
          background: 'var(--bg-main)',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontFamily: '"Futura"',
            fontSize: '2.3rem',
            color: 'var(--accent)',
            marginLeft: '2vw',
            letterSpacing: '2px',
            userSelect: 'none',
            textShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          reado
        </div>
        <div style={{ marginLeft: 'auto', marginRight: '2vw', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.1rem', marginRight: 8 }}>Theme:</span>
          <select
            value={theme}
            onChange={e => handleThemeChange(e.target.value)}
            style={{
              background: 'var(--bg-panel)',
              color: 'var(--accent)',
              border: '1.5px solid var(--accent)',
              borderRadius: 8,
              fontSize: '1.1rem',
              padding: '0.3em 1em',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {Object.entries(COLORWAYS).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>
        </div>
      </nav>
{/* Navbar spacer */}


      {/* Main Content - Static Landing Page */}
      <div
  className="static-landing-content"
  style={{
    marginTop: NAVBAR_HEIGHT,
    minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
    padding: '0 2rem',  
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  }}
>




        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 800,
            textAlign: 'center',
            gap: '2rem',
          }}
        >
          {/* Hero Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h1
              style={{
                fontFamily: '"Futura"',
                fontSize: 'clamp(3rem, 8vw, 4.5rem)',
                fontWeight: 700,
                color: 'var(--accent)',
                margin: 0,
                letterSpacing: 'clamp(2px, 0.5vw, 3px)',
                textShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            >
              reado
            </h1>
            <p
              style={{
                fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                color: 'var(--text-main)',
                margin: 0,
                opacity: 0.9,
                lineHeight: 1.6,
              }}
            >
              Track your reading progress, bookmark your favorite pages, and connect with fellow readers
            </p>
          </div>

          {/* Features */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'clamp(1.5rem, 3vw, 2rem)',
              width: '100%',
              maxWidth: '800px',
              marginTop: '0rem',
            }}
          >
            <div
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 18,
                padding: 'clamp(1.5rem, 3vw, 2rem)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ color: 'var(--accent)', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', margin: '0 0 0.5rem 0' }}>
                Track Progress
              </h3>
              <p style={{ color: 'var(--text-main)', fontSize: 'clamp(0.9rem, 2vw, 1rem)', margin: 0, opacity: 0.8 }}>
                Monitor your reading journey with an intuitive progress tracker
              </p>
            </div>
            <div
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 18,
                padding: 'clamp(1.5rem, 3vw, 2rem)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ color: 'var(--accent)', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', margin: '0 0 0.5rem 0' }}>
                Smart Bookmarks
              </h3>
              <p style={{ color: 'var(--text-main)', fontSize: 'clamp(0.9rem, 2vw, 1rem)', margin: 0, opacity: 0.8 }}>
                Color-coded bookmarks to mark important pages
              </p>
            </div>
            <div
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 18,
                padding: 'clamp(1.5rem, 3vw, 2rem)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ color: 'var(--accent)', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', margin: '0 0 0.5rem 0' }}>
                Community
              </h3>
              <p style={{ color: 'var(--text-main)', fontSize: 'clamp(0.9rem, 2vw, 1rem)', margin: 0, opacity: 0.8 }}>
                Share thoughts and engage with other readers
              </p>
            </div>
            <div
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 18,
                padding: 'clamp(1.5rem, 3vw, 2rem)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ color: 'var(--accent)', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', margin: '0 0 0.5rem 0' }}>
                Dictionary
              </h3>
              <p style={{ color: 'var(--text-main)', fontSize: 'clamp(0.9rem, 2vw, 1rem)', margin: 0, opacity: 0.8 }}>
                Look up words instantly without leaving your reading experience
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStartReading}
            style={{
              background: 'var(--accent)',
              color: 'var(--text-dark)',
              border: 'none',
              borderRadius: 16,
              fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
              fontWeight: 700,
              padding: 'clamp(0.8rem, 2vw, 1rem) clamp(2rem, 5vw, 3rem)',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              marginTop: '1rem',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
            }}
          >
            {user ? 'Continue Reading' : 'Start Reading'}
          </button>

          {/* User Info (if logged in) */}
          {user && (
            <div
              style={{
                display: 'flex',
                paddingTop:'0rem',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '0rem',
                color: 'var(--text-main)',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              }}
            >
              <img
                src={user.picture}
                alt={user.name}
                style={{
                  width: 'clamp(36px, 5vw, 40px)',
                  height: 'clamp(36px, 5vw, 40px)',
                  borderRadius: '50%',
                  border: '2px solid var(--accent)',
                }}
              />
              <span style={{ fontWeight: 600 }}>Welcome back, {user.name}!</span>
            </div>
          )}
        </div>
      </div>

      {/* New Parallax Sections - Scroll in after static content */}
      {/* What is reado Section */}
      <section 
        ref={el => sectionRefs.current[1] = el}
        className="info-section"
        style={{
          minHeight: '100vh',
          padding: 'clamp(4rem, 10vw, 8rem) clamp(2rem, 5vw, 4rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <h2
            className={`section-title fade-in-left ${visibleSections.has(1) ? 'visible' : ''}`}
            style={{
              fontFamily: '"Futura"',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            What is reado?
          </h2>
          <p
            className={`fade-in-up ${visibleSections.has(1) ? 'visible' : ''}`}
            style={{
              fontSize: 'clamp(1rem, 2.2vw, 1.3rem)',
              color: 'var(--text-main)',
              lineHeight: 1.8,
              textAlign: 'center',
              maxWidth: '900px',
              margin: '0 auto 3rem',
              opacity: 0.9,
            }}
          >
            reado is a modern reading platform that transforms how you interact with books. 
            Track your reading progress page by page, engage with a community of readers through 
            contextual comments, and enhance your reading experience with smart bookmarks and an 
            integrated dictionary.
          </p>
        </div>
      </section>

      {/* Features Section with Parallax */}
      <section 
        ref={el => sectionRefs.current[2] = el}
        className="features-section parallax-section"
        style={{
          minHeight: '100vh',
          padding: 'clamp(4rem, 10vw, 8rem) clamp(2rem, 5vw, 4rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div 
          className="parallax-bg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '120%',
            background: 'var(--bg-panel)',
            transform: `translateY(${(scrollY - window.innerHeight) * 0.3}px)`,
            opacity: 0.5,
            zIndex: 0,
          }}
        />
        <div style={{ maxWidth: '1400px', width: '100%', position: 'relative', zIndex: 1 }}>
          <h2
            className={`section-title fade-in-up ${visibleSections.has(2) ? 'visible' : ''}`}
            style={{
              fontFamily: '"Futura"',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: 'clamp(2rem, 5vw, 4rem)',
              textAlign: 'center',
            }}
          >
            Powerful Features
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(280px, 30vw, 350px), 1fr))',
              gap: 'clamp(1.5rem, 4vw, 2.5rem)',
              width: '100%',
            }}
          >
            {[
              {
                icon: '📖',
                title: 'Progress Tracking',
                description: 'Monitor your reading journey with an intuitive page-by-page progress tracker. Set your current page and watch your progress grow.',
                delay: 0,
              },
              {
                icon: '🔖',
                title: 'Smart Bookmarks',
                description: 'Create color-coded bookmarks to mark important pages, quotes, or moments. Jump back to any bookmark with a single click.',
                delay: 1,
              },
              {
                icon: '💬',
                title: 'Community Comments',
                description: 'Share your thoughts and engage with other readers through contextual comments. See what others are saying at the same page.',
                delay: 2,
              },
              {
                icon: '📚',
                title: 'Built-in Dictionary',
                description: 'Look up words instantly without leaving your reading experience. Expand your vocabulary as you read.',
                delay: 3,
              },
              {
                icon: '🎨',
                title: 'Custom Themes',
                description: 'Personalize your reading environment with beautiful color themes. Choose what works best for your eyes.',
                delay: 4,
              },
              {
                icon: '🔍',
                title: 'Book Search',
                description: 'Search and discover books from Google Books API. Find your next great read and start tracking immediately.',
                delay: 5,
              },
            ].map((feature, index) => (
              <div
                key={index}
                ref={el => sectionRefs.current[2 + index + 1] = el}
                className={`feature-card fade-in-up delay-${feature.delay} ${visibleSections.has(2) || visibleSections.has(2 + index + 1) ? 'visible' : ''}`}
                style={{
                  background: 'var(--bg-panel)',
                  borderRadius: 24,
                  padding: 'clamp(1.5rem, 3vw, 2.5rem)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  border: '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div 
                  style={{ 
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                    marginBottom: '1.5rem',
                    display: 'inline-block',
                    transform: 'scale(1)',
                    transition: 'transform 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {feature.icon}
                </div>
                <h3 style={{ 
                  color: 'var(--accent)', 
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', 
                  margin: '0 0 1rem 0',
                  fontWeight: 700,
                }}>
                  {feature.title}
                </h3>
                <p style={{ 
                  color: 'var(--text-main)', 
                  fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', 
                  margin: 0, 
                  opacity: 0.85,
                  lineHeight: 1.6,
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section 
        ref={el => sectionRefs.current[8] = el}
        className="how-it-works-section"
        style={{
          minHeight: '100vh',
          padding: 'clamp(4rem, 10vw, 8rem) clamp(2rem, 5vw, 4rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
        }}
      >
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <h2
            className={`section-title fade-in-up ${visibleSections.has(8) ? 'visible' : ''}`}
            style={{
              fontFamily: '"Futura"',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: 'clamp(3rem, 6vw, 5rem)',
              textAlign: 'center',
            }}
          >
            How It Works
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2rem, 5vw, 4rem)' }}>
            {[
              {
                step: '1',
                title: 'Search & Select',
                description: 'Search for any book using our integrated Google Books search. Find your book and start tracking immediately.',
              },
              {
                step: '2',
                title: 'Track Your Progress',
                description: 'Use the intuitive slider to update your current page. Watch your progress percentage grow as you read.',
              },
              {
                step: '3',
                title: 'Engage & Connect',
                description: 'Add comments at specific pages, bookmark important moments, and interact with the reading community.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`fade-in-right delay-${index} ${visibleSections.has(8) ? 'visible' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(2rem, 4vw, 3rem)',
                  flexDirection: index % 2 === 1 ? 'row-reverse' : 'row',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    flex: '1',
                    minWidth: 'clamp(250px, 40vw, 400px)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(4rem, 8vw, 6rem)',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      opacity: 0.2,
                      marginBottom: '1rem',
                    }}
                  >
                    {item.step}
                  </div>
                  <h3
                    style={{
                      fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      marginBottom: '1rem',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                      color: 'var(--text-main)',
                      lineHeight: 1.8,
                      opacity: 0.9,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
                <div
                  style={{
                    flex: '1',
                    minWidth: 'clamp(250px, 40vw, 400px)',
                    height: 'clamp(200px, 30vw, 300px)',
                    background: 'var(--bg-panel)',
                    borderRadius: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', opacity: 0.3 }}>
                    {index === 0 ? '🔍' : index === 1 ? '📊' : '💬'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section 
        ref={el => sectionRefs.current[9] = el}
        className="cta-section parallax-section"
        style={{
          minHeight: '100vh',
          padding: 'clamp(4rem, 10vw, 8rem) clamp(2rem, 5vw, 4rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div 
          className="parallax-bg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '120%',
            background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-main) 100%)',
            transform: `translateY(${(scrollY - window.innerHeight * 3) * 0.2}px)`,
            opacity: 0.4,
            zIndex: 0,
          }}
        />
        <div 
          className={`cta-content fade-in-up ${visibleSections.has(9) ? 'visible' : ''}`}
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          <h2
            style={{
              fontFamily: '"Futura"',
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: '2rem',
            }}
          >
            Ready to Start Reading?
          </h2>
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
              color: 'var(--text-main)',
              marginBottom: '3rem',
              lineHeight: 1.8,
              opacity: 0.9,
            }}
          >
            Join the community of readers and transform your reading experience today.
          </p>
          <button
            onClick={handleStartReading}
            style={{
              background: 'var(--accent)',
              color: 'var(--text-dark)',
              border: 'none',
              borderRadius: 16,
              fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
              fontWeight: 700,
              padding: 'clamp(1rem, 2.5vw, 1.5rem) clamp(2.5rem, 6vw, 4rem)',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
            }}
          >
            {user ? 'Continue Reading' : 'Get Started Free'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

