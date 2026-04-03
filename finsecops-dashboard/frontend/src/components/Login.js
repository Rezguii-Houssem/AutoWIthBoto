import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AuthenticationDetails, CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'YOUR_USER_POOL_ID',
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || 'YOUR_CLIENT_ID'
};

const userPool = new CognitoUserPool(poolData);

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const authenticationData = {
      Username: username,
      Password: password,
    };
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    
    const userData = {
      Username: username,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const accessToken = result.getAccessToken().getJwtToken();
        onLoginSuccess(accessToken);
      },
      onFailure: (err) => {
        setError(err.message || JSON.stringify(err));
        setLoading(false);
      },
    });
  };

  return (
    <div className="login-card">
      <h2>Welcome Back</h2>
      <p>Securely manage your AWS environment</p>
      
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="username">Username / Email</label>
          <input 
            id="username"
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Enter your username"
            required 
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input 
            id="password"
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            required 
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button type="submit" className="scan-btn" disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
      
      <div className="auth-footer">
        <a href="#forgot" className="forgot-link">Forgot Password?</a>
      </div>
    </div>
  );
};

Login.propTypes = {
  onLoginSuccess: PropTypes.func.isRequired,
};

export default Login;
