import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || ''
};

export const userPool = new CognitoUserPool(poolData);

export const cognitoConfig = {
  domain: process.env.REACT_APP_COGNITO_DOMAIN || '',
  region: process.env.REACT_APP_AWS_REGION || 'eu-west-3',
  clientId: poolData.ClientId,
  redirectUri: globalThis.location.origin + '/'
};

export const clearLocalAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('active_tab');
  userPool.getCurrentUser()?.signOut();
};

export const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    console.error("Session expired or unauthorized. Logging out...");
    clearLocalAuth();
    // Redirect to root, App.js will handle the state change and redirect to Cognito logout
    globalThis.location.href = '/'; 
    return true;
  }
  return false;
};
