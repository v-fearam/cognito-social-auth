import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from 'react-oidc-context';

const cognitoAuthConfig = {
  authority: import.meta.env.VITE_COGNITO_AUTHORITY as string,
  client_id: import.meta.env.VITE_COGNITO_APP_CLIENT_ID as string,
  redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI as string,
  post_logout_redirect_uri: import.meta.env.VITE_COGNITO_SIGNOUT_URI as string,
  response_type: 'code',
  scope: 'openid email phone',
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, '/');
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
