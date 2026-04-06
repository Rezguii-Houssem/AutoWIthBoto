import React, { useState, useEffect } from 'react';
import './App.css';
import CostModule from './components/CostModule';
import SecurityModule from './components/SecurityModule';
import SettingsModule from './components/SettingsModule';
import Login from './components/Login';
import { GridBackground } from './components/ui/GridBackground';
import { cognitoConfig, clearLocalAuth } from './lib/auth';

function App() {
  const [activeTab, setActiveTab] = useState(localStorage.getItem('active_tab') || 'cost');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('auth_token'));
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  useEffect(() => {
    const hash = globalThis.location.hash;
    if (hash?.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        setToken(accessToken);
        setIsLoggedIn(true);
        localStorage.setItem('auth_token', accessToken);
        globalThis.history.replaceState(null, null, '/');
      }
    }
  }, []);
  
  const handleLoginSuccess = (userToken) => {
    setToken(userToken);
    setIsLoggedIn(true);
    localStorage.setItem('auth_token', userToken);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('active_tab', tabId);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    clearLocalAuth();
    const logoutUri = globalThis.location.origin + '/';
    const logoutUrl = `https://${cognitoConfig.domain}.auth.${cognitoConfig.region}.amazoncognito.com/logout?client_id=${cognitoConfig.clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    globalThis.location.href = logoutUrl;
  };

  const tabs = [
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
    <div className="App dark-theme">
      <nav className="top-nav">
        <div className="logo-box">
          <span className="logo-icon">🤖</span>
          <span>AutoWithBoto</span>
        </div>
        <div className="nav-links">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <div className="main-layout-dashboard">
        <div className="main-content">
          {activeTab === 'cost' && <CostModule token={token} />}
          {activeTab === 'security' && <SecurityModule token={token} />}
          {activeTab === 'settings' && <SettingsModule token={token} />}
        </div>
      </div>
    </div>
  );
}

export default App;
