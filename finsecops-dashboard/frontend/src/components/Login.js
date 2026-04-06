import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { userPool, cognitoConfig } from '../lib/auth';

const redirectUri = globalThis.location.origin + '/';

const Login = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  let title = "Welcome Back";
  if (isConfirming) {
    title = "Confirm Account";
  } else if (isSignUp) {
    title = "Create an Account";
  }

  let submitText = isSignUp ? "Sign Up" : "Sign In";
  if (loading) {
    submitText = "Processing...";
  } else if (isConfirming) {
    submitText = "Verify Code";
  }

  const handleGoogleLogin = () => {
    const url = `https://${cognitoConfig.domain}.auth.${cognitoConfig.region}.amazoncognito.com/oauth2/authorize?identity_provider=Google&redirect_uri=${encodeURIComponent(cognitoConfig.redirectUri)}&response_type=token&client_id=${cognitoConfig.clientId}&scope=email+openid+profile&prompt=select_account`;
    globalThis.location.href = url;
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isConfirming) {
      const userData = { Username: username, Pool: userPool };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        setLoading(false);
        if (err) {
          setError(err.message || JSON.stringify(err));
          return;
        }
        // Confirmation successful, now sign in
        setIsConfirming(false);
        setIsSignUp(false);
        setError('Confirmation successful! You can now sign in.');
      });
      return;
    }

    if (isSignUp) {
      const attributeList = [
        { Name: 'email', Value: email }
      ];

      userPool.signUp(username, password, attributeList, null, (err, result) => {
        setLoading(false);
        if (err) {
          setError(err.message || JSON.stringify(err));
          return;
        }
        setIsConfirming(true);
      });
      return;
    }

    // Sign In logic
    const authenticationDetails = new AuthenticationDetails({ Username: username, Password: password });
    const cognitoUser = new CognitoUser({ Username: username, Pool: userPool });

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
      <h2>{title}</h2>
      <p>{isConfirming ? "Check your email for the verification code" : "Securely manage your AWS environment"}</p>
      
      <form onSubmit={handleAuthSubmit}>
        {!isConfirming && (
          <>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input 
                id="username"
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter your username"
                required 
              />
            </div>

            {isSignUp && (
              <div className="field">
                <label htmlFor="email">Email</label>
                <input 
                  id="email"
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Enter your email"
                  required 
                />
              </div>
            )}

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
          </>
        )}

        {isConfirming && (
          <div className="field">
            <label htmlFor="code">Verification Code</label>
            <input 
              id="code"
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              placeholder="123456"
              required 
            />
          </div>
        )}
        
        {error && <div className="error-message" style={{color: error.includes('successful') ? '#4caf50' : ''}}>{error}</div>}
        
        <button type="submit" className="scan-btn" disabled={loading}>
          {submitText}
        </button>

        {!isConfirming && !isSignUp && (
          <button type="button" className="scan-btn" onClick={handleGoogleLogin} style={{marginTop: '10px', background: '#db4437'}}>
            Log in with Google
          </button>
        )}
      </form>
      
      <div className="auth-footer">
        {!isConfirming && (
          <button 
            type="button"
            className="forgot-link" 
            style={{cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0}} 
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        )}
      </div>
    </div>
  );
};

Login.propTypes = {
  onLoginSuccess: PropTypes.func.isRequired,
};

export default Login;
