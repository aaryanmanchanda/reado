import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import './components/PageTransition.css';
import LandingPage from './components/LandingPage';
import ProgressBar from './ProgressBar';
import Dashboard from './Dashboard';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

function AppContent() {
  const location = useLocation();
  const nodeRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  return (
    <>
      {/* Fade overlay */}
      <div 
        className={`page-fade-overlay ${isTransitioning ? 'active' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'var(--bg-main)',
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: isTransitioning ? 1 : 0,
          transition: 'opacity 300ms ease-in-out',
        }}
      />
      <TransitionGroup component={null}>
        <CSSTransition
          key={location.pathname}
          nodeRef={nodeRef}
          timeout={400}
          classNames="page"
        >
          <div ref={nodeRef} className="page-transition-wrapper">
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/reading" element={<ProgressBar />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </div>
        </CSSTransition>
      </TransitionGroup>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <Router>
        <AppContent />
      </Router>
    </div>
  );
}

export default App;
