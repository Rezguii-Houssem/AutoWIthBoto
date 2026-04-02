import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { GridBackground } from './components/ui/GridBackground';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  
  // Script to hide Spline watermark
  useEffect(() => {
    if (isLoggedIn) return;
    
    const hideSplineLogo = () => {
      const viewer = document.querySelector('spline-viewer');
      const logo = viewer?.shadowRoot?.querySelector('#logo');
      if (logo) {
        logo.style.display = 'none';
      }
    };

    // Check periodically as it might take a moment to load in the shadow DOM
    const interval = setInterval(hideSplineLogo, 500);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  
  const handleLoginSuccess = (userToken) => {
    setToken(userToken);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'scans', label: 'Scans' },
    { id: 'automation', label: 'Automation' },
    { id: 'cost', label: 'Cost' },
    { id: 'security', label: 'Security' },
    { id: 'settings', label: 'Settings' }
  ];

  if (!isLoggedIn) {
    return (
      <GridBackground>
        <div className="App landing-page">
          <div className="landing-layout">
            <div className="spline-hero-container">
              <spline-viewer url="https://prod.spline.design/QGzCEgdDi9o4hl9U/scene.splinecode"></spline-viewer>
            </div>
            <div className="login-section-wrapper">
              <div className="login-section">
                <header className="landing-header">
                  <div className="logo-box-main">
                    <span className="logo-icon">🤖</span>
                    <h1>AutoWithBoto</h1>
                  </div>
                  <p className="tagline">Cloud Operations, Simplified & Automated</p>
                </header>
                <Login onLoginSuccess={handleLoginSuccess} />
              </div>
            </div>
          </div>
        </div>
      </GridBackground>
    );
  }

  return (
    <div className="App">
      <nav className="top-nav">
        <div className="logo-box">
          <span className="logo-icon" style={{ fontSize: '1.5rem' }}>🤖</span>
          <span>AutoWithBoto</span>
        </div>
        <div className="nav-links">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      
      <div className="main-layout-dashboard">
        <div className="main-content">
          <Dashboard activeTab={activeTab} token={token} />
        </div>
      </div>
    </div>
  );
}

export default App;
