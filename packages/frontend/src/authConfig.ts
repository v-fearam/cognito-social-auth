import type { Configuration } from '@azure/msal-browser';
import { LogLevel } from '@azure/msal-browser';

const authority = import.meta.env.VITE_MSAL_AUTHORITY as string;
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID as string;
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI as string;
const apiScope = import.meta.env.VITE_API_SCOPE as string;
const authorityHost = new URL(authority).host;

export const msalConfig: Configuration = {
  auth: {
    authority,
    clientId,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    knownAuthorities: [authorityHost],
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }

        if (level === LogLevel.Error) {
          console.error('🔴 MSAL Error:', message);
        } else if (level === LogLevel.Warning) {
          console.warn('🟡 MSAL Warning:', message);
        } else {
          console.log('🔵 MSAL:', message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    },
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', apiScope],
};
