import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType, type AuthenticationResult, type EventMessage } from '@azure/msal-browser';
import { msalConfig } from './authConfig';

/**
 * MSAL should be instantiated outside of the component tree to prevent it from being re-instantiated on re-renders.
 * For more, visit: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/docs/getting-started.md
 */
const msalInstance = new PublicClientApplication(msalConfig);

async function bootstrap() {
  await msalInstance.initialize();

  // Default to using the first account if no account is active on page load.
  const activeAccount = msalInstance.getActiveAccount();
  const allAccounts = msalInstance.getAllAccounts();
  if (!activeAccount && allAccounts.length > 0) {
    msalInstance.setActiveAccount(allAccounts[0]);
  }

  // Listen for sign-in event and set active account.
  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      if (payload.account) {
        msalInstance.setActiveAccount(payload.account);
      }
    }
  });

  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </BrowserRouter>,
  );
}

void bootstrap();
